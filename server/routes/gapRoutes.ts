import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/gapRoutes.ts
// مدیریت شکاف‌های دانشی - تحلیل، شناسایی و پر کردن گپ‌ها - نسخه ۳.۲ (موتور تحلیل ارتقاء یافته)
// منطق کسب‌وکار و ساختار API حفظ شده است؛ فقط دقت تشخیص تطابق و شفافیت گزارش بهبود یافته است.

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  gaps,
  treeNodes,
  knowledgeTrees,
  researchItems,
  templates,
  templateInstances,
  knowledgeAssets,
  issues,
  gapAnalysisRuns,
  gapReviews,
} from '../../src/db/schema.js';
import { eq, and, isNull, not, like, desc, inArray, or, sql } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { format } from 'date-fns-jalali';
import {
  compareRequiredLeaf,
  buildAnalysisReport,
  buildAncestorPath,
  normalizePersianText,
  DEFAULT_ENGINE_OPTIONS,
  type EngineNode,
  type EngineInstance,
  type EngineAsset,
  type GapAnalysisEngineOptions,
} from '../../src/utils/gapAnalysisEngine.js';
import { bases, units } from '../../src/db/schema.js';

export const gapRoutes = Router();

// ============================================
// ۱. دریافت گپ‌ها با فیلترهای پیشرفته
// ============================================

gapRoutes.get('/', async (req, res) => {
  try {
    const {
      treeId,
      status,
      gapType,
      priority,
      search,
      advancedFilter,
      page = 1,
      limit = 20
    } = req.query;

    let query = db.select().from(gaps);
    const conditions: any[] = [];

    if (treeId) {
      const targetTree = await db.query.knowledgeTrees.findFirst({
        where: eq(knowledgeTrees.id, parseInt(treeId as string)),
      });

      const treeNodesIds = await db.select({ id: treeNodes.id })
        .from(treeNodes)
        .where(eq(treeNodes.treeId, parseInt(treeId as string)));

      const nodeIds = treeNodesIds.map(n => n.id);

      if (nodeIds.length > 0) {
        if (targetTree?.type === 'research') {
          // If it's a research tree, filter by researchItems.nodeId
          const researchItemsList = await db.select({ gapId: researchItems.gapId })
            .from(researchItems)
            .where(inArray(researchItems.nodeId, nodeIds));

          const gapIds = researchItemsList.map(r => r.gapId).filter(id => id !== null) as number[];

          if (gapIds.length > 0) {
            if (gapIds.length > 500) {
              const chunks = [];
              for (let i = 0; i < gapIds.length; i += 500) {
                chunks.push(inArray(gaps.id, gapIds.slice(i, i + 500)));
              }
              conditions.push(or(...chunks));
            } else {
              conditions.push(inArray(gaps.id, gapIds));
            }
          } else {
            conditions.push(eq(gaps.id, -1)); // No matches
          }
        } else {
          // Normal behavior for required/produced trees
          if (nodeIds.length > 500) {
            const chunks = [];
            for (let i = 0; i < nodeIds.length; i += 500) {
              chunks.push(inArray(gaps.requiredNodeId, nodeIds.slice(i, i + 500)));
            }
            conditions.push(or(...chunks));
          } else {
            conditions.push(inArray(gaps.requiredNodeId, nodeIds));
          }
        }
      } else {
         conditions.push(eq(gaps.requiredNodeId, -1)); // No matches
      }
    } else if (req.query.periodId) {
      const periodId = parseInt(req.query.periodId as string);

      const treesInPeriod = await db.select({ id: knowledgeTrees.id })
         .from(knowledgeTrees)
         .where(eq(knowledgeTrees.periodId, periodId));

      const treeIds = treesInPeriod.map(t => t.id);

      if (treeIds.length > 0) {
         const nodesInPeriod = await db.select({ id: treeNodes.id })
            .from(treeNodes)
            .where(inArray(treeNodes.treeId, treeIds));

         const nodeIds = nodesInPeriod.map(n => n.id);

         if (nodeIds.length > 0) {
            if (nodeIds.length > 500) {
              const chunks = [];
              for (let i = 0; i < nodeIds.length; i += 500) {
                chunks.push(inArray(gaps.requiredNodeId, nodeIds.slice(i, i + 500)));
              }
              conditions.push(or(...chunks));
            } else {
              conditions.push(inArray(gaps.requiredNodeId, nodeIds));
            }
         } else {
            conditions.push(eq(gaps.requiredNodeId, -1)); // No matches
         }
      } else {
         conditions.push(eq(gaps.requiredNodeId, -1)); // No matches
      }
    }

    if (status) {
      conditions.push(eq(gaps.status, status as string));
    }
    if (gapType) {
      conditions.push(eq(gaps.gapType, gapType as string));
    }
    if (priority) {
      conditions.push(eq(gaps.priority, priority as string));
    }
    if (search) {
      conditions.push(like(gaps.description, `%${search}%`));
    }

    if (advancedFilter) {
      try {
        const parsed = JSON.parse(advancedFilter as string);

        const buildCondition = (group: any): any => {
          if (!group || !group.rules || !Array.isArray(group.rules) || group.rules.length === 0) return undefined;

          const conds = group.rules.map((rule: any) => {
             if (rule.condition) {
                return buildCondition(rule);
             } else {
                const { field, op, value } = rule;
                const col = (gaps as any)[field];
                if (!col) return undefined;

                if (op === 'eq') return eq(col, value);
                if (op === 'neq') return not(eq(col, value));
                if (op === 'like') return like(col, `%${value}%`);
                if (op === 'in' && Array.isArray(value)) return inArray(col, value);
                return undefined;
             }
          }).filter(Boolean);

          if (conds.length === 0) return undefined;
          if (group.condition === 'OR') return or(...conds);
          return and(...conds);
        };

        const advCond = buildCondition(parsed);
        if (advCond) {
          conditions.push(advCond);
        }
      } catch (e) {
        console.error("Advanced filter parse error", e);
      }
    }

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(gaps);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const totalResult = await countQuery;
    const total = totalResult[0].count;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const result = await query
      .limit(limitNum)
      .offset(offset)
      .orderBy(desc(gaps.createdAt));

    // دریافت اطلاعات تکمیلی گره‌ها
    const enrichedGaps = await Promise.all(result.map(async (gap) => {
      const requiredNode = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, gap.requiredNodeId),
      });

      const producedNode = gap.producedNodeId
        ? await db.query.treeNodes.findFirst({
            where: eq(treeNodes.id, gap.producedNodeId),
          })
        : null;

      const researchItem = await db.query.researchItems.findFirst({
        where: eq(researchItems.gapId, gap.id),
      });

      const issue = researchItem ? await db.query.issues.findFirst({
        where: eq(issues.researchItemId, researchItem.id),
      }) : null;

      return {
        ...gap,
        requiredNode,
        producedNode,
        hasResearch: !!researchItem,
        researchItemId: researchItem?.id || null,
        researchItem: researchItem || null,
        issue: issue || null,
        matchScore: gap.matchScore || 0,
      };
    }));

    res.json({
      data: enrichedGaps,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching gaps:', error);
    res.status(500).json({ error: 'خطا در دریافت گپ‌ها' });
  }
});

// ============================================
// ۱.ب سوابق تحلیل‌های شکاف (تاریخچه اجرای موتور) — باید قبل از /:id تعریف شود
// ============================================

gapRoutes.get('/run-history', async (req, res) => {
  try {
    const { requiredTreeId } = req.query;
    const history = await db.select({
      id: gapAnalysisRuns.id,
      requiredTreeId: gapAnalysisRuns.requiredTreeId,
      producedTreeId: gapAnalysisRuns.producedTreeId,
      totalLeaves: gapAnalysisRuns.totalLeaves,
      filled: gapAnalysisRuns.filled,
      partial: gapAnalysisRuns.partial,
      openCount: gapAnalysisRuns.openCount,
      coveragePercent: gapAnalysisRuns.coveragePercent,
      carriedReviews: gapAnalysisRuns.carriedReviews,
      createdAt: gapAnalysisRuns.createdAt,
    })
      .from(gapAnalysisRuns)
      .where(requiredTreeId ? eq(gapAnalysisRuns.requiredTreeId, parseInt(requiredTreeId as string)) : undefined)
      .orderBy(desc(gapAnalysisRuns.createdAt))
      .limit(25);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching run history:', error);
    res.status(500).json({ error: 'خطا در دریافت سوابق تحلیل' });
  }
});

// ============================================
// ۲. دریافت یک گپ با جزئیات کامل
// ⚠️ نکته: این مسیر باید بعد از مسیرهای ثابت مثل /stats تعریف شود تا با آنها تداخل نکند
// ============================================

gapRoutes.get('/stats', async (req, res) => {
  try {
    const { treeId } = req.query;

    let query = db.select().from(gaps);
    if (treeId) {
      const targetTree = await db.query.knowledgeTrees.findFirst({
        where: eq(knowledgeTrees.id, parseInt(treeId as string)),
      });
      const treeNodesIds = await db.select({ id: treeNodes.id })
        .from(treeNodes)
        .where(eq(treeNodes.treeId, parseInt(treeId as string)));

      const nodeIds = treeNodesIds.map(n => n.id);
      if (nodeIds.length > 0) {
        if (targetTree?.type === 'research') {
          const researchItemsList = await db.select({ gapId: researchItems.gapId })
            .from(researchItems)
            .where(inArray(researchItems.nodeId, nodeIds));
          const gapIds = researchItemsList.map(r => r.gapId).filter(id => id !== null) as number[];
          if (gapIds.length > 0) {
            if (gapIds.length > 500) {
              const chunks = [];
              for (let i = 0; i < gapIds.length; i += 500) {
                chunks.push(inArray(gaps.id, gapIds.slice(i, i + 500)));
              }
              query = query.where(or(...chunks)) as any;
            } else {
              query = query.where(inArray(gaps.id, gapIds)) as any;
            }
          } else {
            query = query.where(eq(gaps.id, -1)) as any;
          }
        } else {
          if (nodeIds.length > 500) {
            const chunks = [];
            for (let i = 0; i < nodeIds.length; i += 500) {
              chunks.push(inArray(gaps.requiredNodeId, nodeIds.slice(i, i + 500)));
            }
            query = query.where(or(...chunks)) as any;
          } else {
            query = query.where(inArray(gaps.requiredNodeId, nodeIds)) as any;
          }
        }
      } else {
        query = query.where(eq(gaps.id, -1)) as any;
      }
    }

    const allGaps = await query;
    const total = allGaps.length;

    const open = allGaps.filter(g => g.status === 'open').length;
    const filled = allGaps.filter(g => g.status === 'filled').length;
    const partial = allGaps.filter(g => g.status === 'partially_filled').length;

    const byPriority = allGaps.reduce((acc: any, gap) => {
      const priority = gap.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const byType = allGaps.reduce((acc: any, gap) => {
      const type = gap.gapType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const avgMatchScore = total > 0
      ? allGaps.reduce((sum, g) => sum + (g.matchScore || 0), 0) / total
      : 0;

    res.json({
      total,
      open,
      filled,
      partial,
      coveragePercent: total > 0 ? Math.round((filled / total) * 100) : 0,
      byPriority,
      byType,
      avgMatchScore: Math.round(avgMatchScore * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching gap stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار گپ‌ها' });
  }
});

gapRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gapId = parseInt(id);

    const gap = await db.query.gaps.findFirst({
      where: eq(gaps.id, gapId),
    });

    if (!gap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    const requiredNode = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, gap.requiredNodeId),
    });

    const producedNode = gap.producedNodeId
      ? await db.query.treeNodes.findFirst({
          where: eq(treeNodes.id, gap.producedNodeId),
        })
      : null;

    const researchItemsList = await db.select()
      .from(researchItems)
      .where(eq(researchItems.gapId, gapId));

    res.json({
      ...gap,
      requiredNode,
      producedNode,
      researchItems: researchItemsList,
    });
  } catch (error) {
    console.error('Error fetching gap:', error);
    res.status(500).json({ error: 'خطا در دریافت گپ' });
  }
});

// ============================================
// ۳. تحلیل شکاف (مقایسه درختواره‌ها) - با موتور تحلیل دقیق‌تر و گزارش توضیحی
// ============================================

gapRoutes.post('/analyze', async (req, res) => {
  try {
    const { requiredTreeId, producedTreeId, options } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    // 🟢 بازنگی‌های دستی کاربر از گپ‌های قبلی — قبل از حذف جمع و به تحلیل جدید اعمال می‌شود
    const manualReviews: Array<{ requiredNodeId: number; verdict: string; newStatus: string | null; note: string | null }> = [];
    const manualStatusMap = new Map<number, { status: string; note: string | null; verdict: string | null }>();
    const notGapNodeIds = new Set<number>();

    if (!requiredTreeId || producedTreeId === undefined) {
      return res.status(400).json({
        error: 'شناسه درختواره مورد نیاز و تولیدشده الزامی است'
      });
    }

    const requiredTree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, parseInt(requiredTreeId)),
    });

    let producedTree = null;
    if (parseInt(producedTreeId) !== 0) {
      producedTree = await db.query.knowledgeTrees.findFirst({
        where: eq(knowledgeTrees.id, parseInt(producedTreeId)),
      });
    }

    if (!requiredTree || (parseInt(producedTreeId) !== 0 && !producedTree)) {
      return res.status(404).json({ error: 'یکی از درختواره‌ها یافت نشد' });
    }

    // ۱. دریافت تمام گره‌های برگ (L و Q) از درختواره مورد نیاز
    const requiredLeaves = await db.select()
      .from(treeNodes)
      .where(and(
        eq(treeNodes.treeId, parseInt(requiredTreeId)),
        inArray(treeNodes.level, ['L', 'Q'])
      ));

    // ۲. دریافت تمام گره‌های درختواره تولیدشده (برگ‌ها + کل ساختار برای مسیر ساختاری)
    let producedNodes: any[] = [];
    let producedLeaves: EngineNode[] = [];
    if (producedTree) {
      producedNodes = await db.select()
        .from(treeNodes)
        .where(eq(treeNodes.treeId, parseInt(producedTreeId)));

      producedLeaves = producedNodes.filter(n => n.level === 'L' || n.level === 'Q') as EngineNode[];
    }

    // نقشه همه گره‌های هر دو درخت برای ساخت مسیر ساختاری (اجداد)
    const requiredAllNodes = await db.select().from(treeNodes).where(eq(treeNodes.treeId, parseInt(requiredTreeId)));
    const nodeMapRequired = new Map<number, EngineNode>();
    requiredAllNodes.forEach(n => nodeMapRequired.set(n.id, n as EngineNode));

    const nodeMapProduced = new Map<number, EngineNode>();
    producedNodes.forEach(n => nodeMapProduced.set(n.id, n as EngineNode));

    const producedAncestorsMap = new Map<number, EngineNode[]>();
    producedLeaves.forEach(l => {
      producedAncestorsMap.set(l.id, buildAncestorPath(l, nodeMapProduced));
    });

    // ۳. حذف گپ‌های قبلی این تحلیل (منطق قدیمی حفظ شده)
    const requiredNodeIds = requiredAllNodes.map(n => n.id);
    if (requiredNodeIds.length > 0) {
      // Find gaps to be deleted (با متادیتا برای نجات بازنگی‌های دستی کاربر)
      const oldGaps = await db.select({ id: gaps.id, requiredNodeId: gaps.requiredNodeId, status: gaps.status, metadata: gaps.metadata }).from(gaps).where(inArray(gaps.requiredNodeId, requiredNodeIds));
      if (oldGaps.length > 0) {
          const oldGapIds = oldGaps.map(g => g.id);

          // 🟢 جمع‌آوری بازنگی‌های دستی کاربر از گپ‌های قدیمی (قبل از حذف)
          for (const og of oldGaps) {
            const meta = (og.metadata as any) || {};
            const review = meta.manualReview as { verdict?: string; note?: string | null; newStatus?: string | null } | undefined;
            if (review && review.verdict) {
              // وضعیت مؤثری که کاربر تعیین کرده: not_gap → filled | adjusted → newStatus | confirmed_gap → بدون تغییر
              const carriedStatus = review.newStatus
                ?? (review.verdict === 'not_gap' ? 'filled' : null)
                ?? (review.verdict === 'adjusted' ? (meta.manualNewStatus ?? null) : null);
              manualReviews.push({
                requiredNodeId: og.requiredNodeId,
                verdict: review.verdict,
                newStatus: carriedStatus,
                note: review.note ?? null,
              });
              if (carriedStatus) {
                manualStatusMap.set(og.requiredNodeId, { status: carriedStatus, note: review.note ?? null, verdict: review.verdict });
              }
              if (review.verdict === 'not_gap') {
                notGapNodeIds.add(og.requiredNodeId);
              }
            }
          }

          // Delete related researchItems
          const oldResearchItems: Array<{ id: number; nodeId: number | null }> = [];
          if (oldGapIds.length > 500) {
              for (let i = 0; i < oldGapIds.length; i += 500) {
                  const chunk = await db.select({ id: researchItems.id, nodeId: researchItems.nodeId }).from(researchItems).where(inArray(researchItems.gapId, oldGapIds.slice(i, i + 500)));
                  oldResearchItems.push(...chunk);
              }
          } else {
              const chunk = await db.select({ id: researchItems.id, nodeId: researchItems.nodeId }).from(researchItems).where(inArray(researchItems.gapId, oldGapIds));
              oldResearchItems.push(...chunk);
          }

          if (oldResearchItems.length > 0) {
              const oldResearchItemIds = oldResearchItems.map(r => r.id);
              const oldResearchNodeIds = oldResearchItems.map(r => r.nodeId).filter(Boolean) as number[];

              // Nullify issues that point to these researchItems
              if (oldResearchItemIds.length > 500) {
                  for (let i = 0; i < oldResearchItemIds.length; i += 500) {
                      await db.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, oldResearchItemIds.slice(i, i + 500)));
                      await db.delete(researchItems).where(inArray(researchItems.id, oldResearchItemIds.slice(i, i + 500)));
                  }
              } else {
                  await db.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, oldResearchItemIds));
                  await db.delete(researchItems).where(inArray(researchItems.id, oldResearchItemIds));
              }

              // Delete orphaned treeNodes from the research tree
              if (oldResearchNodeIds.length > 500) {
                  for (let i = 0; i < oldResearchNodeIds.length; i += 500) {
                      await db.delete(treeNodes).where(inArray(treeNodes.id, oldResearchNodeIds.slice(i, i + 500)));
                  }
              } else if (oldResearchNodeIds.length > 0) {
                  await db.delete(treeNodes).where(inArray(treeNodes.id, oldResearchNodeIds));
              }
          }

          // Finally delete the gaps
          if (oldGapIds.length > 500) {
              for (let i = 0; i < oldGapIds.length; i += 500) {
                  await db.delete(gaps).where(inArray(gaps.id, oldGapIds.slice(i, i + 500)));
              }
          } else {
              await db.delete(gaps).where(inArray(gaps.id, oldGapIds));
          }
      }
    }

    // ۴. آماده‌سازی داده‌های ورودی موتور تحلیل
    const instanceRows = await db.select().from(templateInstances);
    const instancesMap = new Map<number, EngineInstance>();
    instanceRows.forEach(inst => instancesMap.set(inst.id, inst as EngineInstance));

    const assetRows = await db.select().from(knowledgeAssets);
    const assetsMap = new Map<number, EngineAsset[]>();
    for (const a of assetRows) {
      const list = assetsMap.get(a.nodeId) || [];
      list.push(a as EngineAsset);
      assetsMap.set(a.nodeId, list);
    }

    // ۵. اجرای موتور تحلیل برای هر برگ
    const engineOptions = {
      ...DEFAULT_ENGINE_OPTIONS,
      ...((options || {}) as GapAnalysisEngineOptions),
    };

    // 🟢 بازنگی‌های دستی جمع‌آوری‌شده از گپ‌های قبلی (بخش ۳)
    const carriedReviewCount = manualReviews.length;

    // 🟢 ساخت مسیر مالکیت سازمانی هر درختواره (آجا/نیرو/رده) — نمایش روی گره‌های خروجی
    const orgBases = await db.select().from(bases);
    const orgUnits = await db.select().from(units);
    const baseMap = new Map(orgBases.map(b => [b.id, b]));
    const unitMap = new Map(orgUnits.map(u => [u.id, u]));
    const describeOwnership = (tree: any): string => {
      if (!tree) return '';
      const parts: string[] = [];
      if (tree.baseId && baseMap.get(tree.baseId)) parts.push(baseMap.get(tree.baseId)!.name);
      if (tree.unitId && unitMap.get(tree.unitId)) parts.push(unitMap.get(tree.unitId)!.name);
      const org = tree.baseId ? (tree.unitId ? 'رده' : 'نیرو') : 'آجا';
      return parts.length > 0 ? `${org} › ${parts.join(' › ')}` : org;
    };
    const requiredOwnerPath = describeOwnership(requiredTree);
    const producedOwnerPath = describeOwnership(producedTree);

    const createdGaps: any[] = [];
    let filledCount = 0;
    let openCount = 0;
    let partialCount = 0;
    let carriedReviews = 0;

    for (const requiredLeaf of requiredLeaves) {
      const requiredAncestors = buildAncestorPath(requiredLeaf as EngineNode, nodeMapRequired);

      const match = compareRequiredLeaf({
        requiredNode: requiredLeaf as EngineNode,
        requiredAncestors,
        producedLeaves,
        producedAncestors: producedAncestorsMap,
        instances: instancesMap,
        assets: assetsMap,
        options: engineOptions,
      });

      let gapStatus = match.status;
      // شرح فارسی نتیجه (برای نمایش در UI)
      let description = match.reasonFa;

      // 🟢 اعمال نظر دستی کاربر از تحلیل قبلی (منطق «بر اساس آخرین نسخه»):
      // not_gap → filled | adjusted → وضعیت انتخابی کاربر | confirmed_gap → پیش‌فرض موتور حفظ می‌شود
      const manual = manualStatusMap.get(requiredLeaf.id);
      if (manual) {
        gapStatus = manual.status as any;
        description = `${manual.note ? `🎧 نظر کاربر: ${manual.note} — ` : ''}${description}`;
        carriedReviews++;
      }

      if (gapStatus === 'filled') filledCount++;
      else if (gapStatus === 'partially_filled') partialCount++;
      else openCount++;

      // اعتبارسنجی producedNodeId قبل از درج (جلوگیری از FOREIGN KEY constraint failure)
      let validProducedNodeId: number | null = null;
      if (match.matchedNodeId) {
        const existsInMap = nodeMapProduced.has(match.matchedNodeId);
        if (existsInMap) {
          validProducedNodeId = match.matchedNodeId;
        }
      }

      // ایجاد گپ
      const result = await db.insert(gaps).values({
        requiredNodeId: requiredLeaf.id,
        producedNodeId: validProducedNodeId,
        status: gapStatus,
        gapType: match.gapType,
        priority: options?.defaultPriority || 'medium',
        matchScore: match.matchScore,
        description,
        metadata: {
          engine: 'v2',
          analyzedAt: now,
          templateDetails: match.templateDetails || null,
          scoreBreakdown: match.scoreBreakdown || null,
          matchedNodeTitle: match.matchedNodeTitle || null,
          ownerPath: requiredOwnerPath,
          ownerPathLabel: `مالک: ${requiredOwnerPath}`,
          structuralPath: requiredAncestors.map(a => a.title).join(' › ')+ (requiredAncestors.length ? ' › ' : '') + requiredLeaf.title,
          manualReview: manual ? { verdict: manual.verdict, note: manual.note } : null,
          manualNewStatus: manual && manual.verdict === 'change' ? manual.status : null,
        },
        createdAt: now,
        updatedAt: now,
      }).returning();

      // به‌روزرسانی گره‌ها با وضعیت گپ
      await db.update(treeNodes)
        .set({
          isGap: gapStatus === 'open' ? 1 : 0,
          gapStatus: gapStatus,
          updatedAt: now,
        })
        .where(eq(treeNodes.id, requiredLeaf.id));

      createdGaps.push({
        ...result[0],
        requiredNode: requiredLeaf,
        producedNode: match.matchedNodeId ? nodeMapProduced.get(match.matchedNodeId) || null : null,
        reasonFa: match.reasonFa,
        ownerPath: requiredOwnerPath,
        structuralPath: requiredAncestors.map(a => a.title).concat([requiredLeaf.title]).join(' › '),
      });
    }

    // 🟢 ثبت سابقه تحلیل در جدول gap_analysis_runs (هر کلیک تحلیل = یک رکورد سوابق)
    const coveragePercentRun = createdGaps.length > 0
      ? Math.round((filledCount / createdGaps.length) * 100)
      : 0;
    await db.insert(gapAnalysisRuns).values({
      requiredTreeId: parseInt(requiredTreeId),
      producedTreeId: producedTreeId ? parseInt(producedTreeId) : 0,
      totalLeaves: createdGaps.length,
      filled: filledCount,
      partial: partialCount,
      openCount: openCount,
      coveragePercent: coveragePercentRun,
      carriedReviews,
      createdBy: userId,
      createdAt: now,
    });

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'تحلیل شکاف',
      entityId: 0,
      changes: {
        requiredTreeId,
        producedTreeId,
        totalGaps: createdGaps.length,
        filled: filledCount,
        open: openCount,
        partial: partialCount,
        carriedReviews,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // ۶. تولید گزارش تحلیلی با شرح فارسی روش تحلیل
    const analysisReport = buildAnalysisReport({
      requiredTreeName: requiredTree.name,
      producedTreeName: producedTree ? producedTree.name : null,
      results: createdGaps.map((g: any) => ({
        requiredNodeId: g.requiredNodeId,
        requiredNodeTitle: g.requiredNode?.title || '',
        level: g.requiredNode?.level || 'L',
        status: g.status,
        gapType: g.gapType,
        matchScore: g.matchScore || 0,
        matchedNodeTitle: g.producedNode?.title || null,
        reasonFa: g.reasonFa,
      })),
      createdAt: format(new Date(), 'yyyy/MM/dd HH:mm'),
    });

    // 🟢 به‌روزرسانی رکورد سابقه با گزارش کامل
    await db.update(gapAnalysisRuns)
      .set({ report: analysisReport as any })
      .where(and(
        eq(gapAnalysisRuns.requiredTreeId, parseInt(requiredTreeId)),
        eq(gapAnalysisRuns.createdAt, now)
      ));

    // 🟢 سوابق تحلیل‌های قبلی (برای نمایش تاریخچه در UI)
    const runHistory = await db.select({
      id: gapAnalysisRuns.id,
      requiredTreeId: gapAnalysisRuns.requiredTreeId,
      producedTreeId: gapAnalysisRuns.producedTreeId,
      totalLeaves: gapAnalysisRuns.totalLeaves,
      filled: gapAnalysisRuns.filled,
      partial: gapAnalysisRuns.partial,
      openCount: gapAnalysisRuns.openCount,
      coveragePercent: gapAnalysisRuns.coveragePercent,
      carriedReviews: gapAnalysisRuns.carriedReviews,
      createdAt: gapAnalysisRuns.createdAt,
    })
      .from(gapAnalysisRuns)
      .where(eq(gapAnalysisRuns.requiredTreeId, parseInt(requiredTreeId)))
      .orderBy(desc(gapAnalysisRuns.createdAt))
      .limit(10);

    res.json({
      success: true,
      message: 'تحلیل شکاف با موفقیت انجام شد',
      report: analysisReport,
      gaps: createdGaps,
      totalGaps: createdGaps.length,
      ownerPath: requiredOwnerPath,
      producedOwnerPath,
      runHistory,
      carriedReviews,
    });
  } catch (error) {
    console.error('Error analyzing gaps:', error);
    res.status(500).json({ error: 'خطا در تحلیل شکاف' });
  }
});

// ============================================
// X. تولید درختواره پژوهشی
// ============================================

gapRoutes.post('/generate-research', async (req, res) => {
  try {
    const { requiredTreeId, producedTreeId } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!requiredTreeId) {
      return res.status(400).json({ error: 'شناسه درختواره مورد نیاز الزامی است' });
    }

    const requiredTree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, parseInt(requiredTreeId))
    });

    if (!requiredTree) {
      return res.status(404).json({ error: 'درختواره مورد نیاز یافت نشد' });
    }

    // ۱. یافتن یا ایجاد درختواره پژوهشی
    const researchTreeName = `درختواره پژوهشی (بر اساس ${requiredTree.name})`;
    let researchTree = await db.query.knowledgeTrees.findFirst({
      where: and(
        eq(knowledgeTrees.name, researchTreeName),
        eq(knowledgeTrees.type, 'research')
      )
    });

    let newTreeId: number;
    if (researchTree) {
      newTreeId = researchTree.id;
    } else {
      const insertedTree = await db.insert(knowledgeTrees).values({
        name: researchTreeName,
        type: 'research',
        periodId: requiredTree.periodId,
        baseId: requiredTree.baseId,
        unitId: requiredTree.unitId,
        createdAt: now,
        updatedAt: now
      }).returning();
      newTreeId = (insertedTree as any[])[0].id;
    }

    // ۲. یافتن گپ‌های مربوطه
    const requiredNodes = await db.select({ id: treeNodes.id, title: treeNodes.title, level: treeNodes.level })
      .from(treeNodes)
      .where(eq(treeNodes.treeId, parseInt(requiredTreeId)));

    const nodeIds = requiredNodes.map(n => n.id);

    if (nodeIds.length === 0) {
       return res.json({ success: true, message: 'هیچ گرهی در درختواره مورد نیاز یافت نشد' });
    }

    // chunking in case nodeIds is too big
    const gapsList: any[] = [];
    if (nodeIds.length > 500) {
      for (let i = 0; i < nodeIds.length; i += 500) {
        const chunk = nodeIds.slice(i, i + 500);
        const gapsChunk = await db.select().from(gaps)
          .where(and(
             inArray(gaps.requiredNodeId, chunk),
             or(eq(gaps.status, 'open'), eq(gaps.status, 'partially_filled'))
          ));
        gapsList.push(...gapsChunk);
      }
    } else {
      const gapsChunk = await db.select().from(gaps)
          .where(and(
             inArray(gaps.requiredNodeId, nodeIds),
             or(eq(gaps.status, 'open'), eq(gaps.status, 'partially_filled'))
          ));
      gapsList.push(...gapsChunk);
    }

    // Filter out gaps that already have a research item
    const existingResearchItems = await db.select({ gapId: researchItems.gapId }).from(researchItems);
    const existingGapIds = new Set(existingResearchItems.map(r => r.gapId));

    const newGapsToConvert = gapsList.filter(gap => !existingGapIds.has(gap.id));

    if (newGapsToConvert.length === 0) {
       return res.json({ success: true, message: 'همه گپ‌ها قبلاً به آیتم پژوهشی تبدیل شده‌اند و گپ جدیدی یافت نشد' });
    }

    // ۳. ایجاد گره‌ها در درختواره پژوهشی و ایجاد آیتم پژوهشی
    let addedCount = 0;
    for (const gap of newGapsToConvert) {
      const relatedReqNode = requiredNodes.find(n => n.id === gap.requiredNodeId);

      const newNode = await db.insert(treeNodes).values({
         treeId: newTreeId,
         title: relatedReqNode ? relatedReqNode.title : `گپ ${gap.id}`,
         level: 'L',
         description: gap.description || '',
         createdAt: now,
         updatedAt: now
      }).returning();

      await db.insert(researchItems).values({
         gapId: gap.id,
         nodeId: (newNode as any[])[0].id,
         createdAt: now,
         updatedAt: now
      });
      addedCount++;
    }

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'درختواره پژوهشی',
      entityId: newTreeId,
      changes: { requiredTreeId, producedTreeId, newTreeId, researchItemsCount: addedCount },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `درختواره پژوهشی با موفقیت بروزرسانی شد. ${addedCount} آیتم پژوهشی اضافه شد.`,
      treeId: newTreeId
    });

  } catch (error) {
    console.error('Error generating research tree:', error);
    res.status(500).json({ error: 'خطا در تولید درختواره پژوهشی' });
  }
});

// ============================================
// ۴. پر کردن گپ (اتصال دستی توسط کاربر)
// ============================================

gapRoutes.post('/:gapId/fill', async (req, res) => {
  try {
    const { gapId } = req.params;
    const { producedNodeId, description, priority, status: requestedStatus } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const gapIdNum = parseInt(gapId);

    const existingGap = await db.query.gaps.findFirst({
      where: eq(gaps.id, gapIdNum),
    });

    if (!existingGap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    if (existingGap.status === 'filled') {
      return res.status(400).json({ error: 'این گپ قبلاً پر شده است' });
    }

    // بررسی وجود گره تولیدشده
    if (!producedNodeId) {
      return res.status(400).json({ error: 'شناسه گره تولیدشده الزامی است' });
    }

    const producedNode = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, parseInt(producedNodeId)),
    });

    if (!producedNode) {
      return res.status(404).json({ error: 'گره تولیدشده یافت نشد' });
    }

    // 🟢 وضعیت نهایی: تطابق کامل (filled) یا جزئی (partially_filled) — انتخاب کاربر
    const effectiveStatus = requestedStatus === 'partially_filled' ? 'partially_filled' : 'filled';

    const result = await db.update(gaps)
      .set({
        producedNodeId: parseInt(producedNodeId),
        status: effectiveStatus,
        priority: priority || existingGap.priority || 'medium',
        description: description || `اتصال دستی به گره "${producedNode.title}"`,
        updatedAt: now,
      })
      .where(eq(gaps.id, gapIdNum))
      .returning();

    // 🟢 ثبت در سوابق بازنگی (تاریخچه کامل عملیات دستی)
    await db.insert(gapReviews).values({
      gapId: gapIdNum,
      requiredNodeId: existingGap.requiredNodeId,
      verdict: 'manual_fill',
      previousStatus: existingGap.status,
      newStatus: effectiveStatus,
      note: description || `اتصال دستی به گره "${producedNode.title}"`,
      reviewedBy: userId,
      createdAt: now,
    });

    // به‌روزرسانی گره مورد نیاز
    await db.update(treeNodes)
      .set({
        isGap: 0,
        gapStatus: effectiveStatus,
        updatedAt: now,
      })
      .where(eq(treeNodes.id, existingGap.requiredNodeId));

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: effectiveStatus === 'partially_filled' ? 'پر کردن گپ (تطابق جزئی)' : 'پر کردن گپ (دستی)',
      entityId: gapIdNum,
      changes: {
        gapId: gapIdNum,
        producedNodeId,
        status: effectiveStatus,
        priority: priority || existingGap.priority,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: effectiveStatus === 'partially_filled' ? 'گپ با تطابق جزئی ثبت شد' : 'گپ با موفقیت پر شد',
      gap: result[0],
    });

    res.json({
      success: true,
      message: 'گپ با موفقیت پر شد',
      gap: result[0],
    });
  } catch (error) {
    console.error('Error filling gap:', error);
    res.status(500).json({ error: 'خطا در پر کردن گپ' });
  }
});

// ============================================
// ۵. حذف گپ
// ============================================

gapRoutes.delete('/:gapId', async (req, res) => {
  try {
    const { gapId } = req.params;
    const gapIdNum = parseInt(gapId);
    const userId = (req as AuthRequest).user?.id || null;

    const existing = await db.query.gaps.findFirst({
      where: eq(gaps.id, gapIdNum),
    });

    if (!existing) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    const researchItemsList = await db.select()
      .from(researchItems)
      .where(eq(researchItems.gapId, gapIdNum));

    if (researchItemsList.length > 0) {
      return res.status(400).json({
        error: 'این گپ دارای آیتم‌های پژوهشی است، ابتدا آنها را حذف کنید',
        count: researchItemsList.length,
      });
    }

    await db.delete(gaps).where(eq(gaps.id, gapIdNum));

    // 🟢 ثبت حذف در سوابق بازنگی (تاریخچه کامل حتی پس از حذف گپ حفظ می‌شود)
    const delMeta = (existing.metadata as any) || {};
    await db.insert(gapReviews).values({
      gapId: gapIdNum,
      requiredNodeId: existing.requiredNodeId,
      verdict: 'deleted',
      previousStatus: existing.status,
      newStatus: null,
      note: delMeta.manualReview?.note || 'حذف دستی گپ توسط کاربر',
      reviewedBy: userId,
      createdAt: new Date().toISOString(),
    });

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'گپ',
      entityId: gapIdNum,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting gap:', error);
    res.status(500).json({ error: 'خطا در حذف گپ' });
  }
});

// ============================================
// آمار گپ‌ها — مسیر /stats پیش از /:id تعریف شده است
// ============================================

// ============================================
// بازنگی دستی کاربر روی گپ (نظر کاربر: گپ هست / گپ نیست / اصلاح وضعیت)
// نظر در gap_reviews ثبت و در تحلیل‌های بعدی به‌صورت خودکار اعمال می‌شود (منطق آخرین نسخه)
// ============================================

gapRoutes.post('/:gapId/review', async (req, res) => {
  try {
    const { gapId } = req.params;
    const gapIdNum = parseInt(gapId);
    const { verdict, newStatus, note } = req.body;
    const userId = (req as AuthRequest).user?.id || null;
    const now = new Date().toISOString();

    const validVerdicts = ['confirmed_gap', 'not_gap', 'adjusted'];
    if (!validVerdicts.includes(verdict)) {
      return res.status(400).json({ error: 'نظر ارسالی نامعتبر است (confirmed_gap | not_gap | adjusted)' });
    }

    const existingGap = await db.query.gaps.findFirst({
      where: eq(gaps.id, gapIdNum),
    });
    if (!existingGap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    // تعیین وضعیت جدید بر اساس نوع نظر
    let effectiveStatus = existingGap.status;
    if (verdict === 'not_gap') {
      // کاربر می‌گوید این گپ نیست → گره دیگر گپ محسوب نمی‌شود
      effectiveStatus = 'filled';
    } else if (verdict === 'adjusted' && newStatus) {
      effectiveStatus = newStatus;
    }
    // verdict === 'confirmed_gap' → وضعیت فعلی حفظ می‌شود

    // ثبت سابقه بازنگی (بدون حذف — سابقه کامل حفظ می‌شود)
    await db.insert(gapReviews).values({
      gapId: gapIdNum,
      requiredNodeId: existingGap.requiredNodeId,
      verdict,
      previousStatus: existingGap.status,
      newStatus: effectiveStatus,
      note: note || null,
      reviewedBy: userId,
      createdAt: now,
    });

    // اعمال فوری روی گپ فعلی
    const result = await db.update(gaps)
      .set({
        status: effectiveStatus,
        description: note
          ? `${existingGap.description || ''} | 🎧 بازنگی دستی: ${note}`.trim()
          : existingGap.description,
        metadata: {
          ...((existingGap.metadata as any) || {}),
          manualReview: { verdict, note: note || null, at: now, newStatus: effectiveStatus },
        },
        updatedAt: now,
      })
      .where(eq(gaps.id, gapIdNum))
      .returning();

    // به‌روزرسانی وضعیت گره مورد نیاز
    await db.update(treeNodes)
      .set({
        isGap: effectiveStatus === 'open' ? 1 : 0,
        gapStatus: effectiveStatus,
        updatedAt: now,
      })
      .where(eq(treeNodes.id, existingGap.requiredNodeId));

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'بازنگی دستی گپ',
      entityId: gapIdNum,
      changes: { verdict, note, previousStatus: existingGap.status, newStatus: effectiveStatus },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: verdict === 'not_gap'
        ? 'نظر شما ثبت شد: این مورد گپ نیست و در تحلیل‌های بعدی حفظ خواهد شد'
        : 'نظر شما با موفقیت ثبت شد',
      gap: result[0],
    });
  } catch (error) {
    console.error('Error reviewing gap:', error);
    res.status(500).json({ error: 'خطا در ثبت بازنگی گپ' });
  }
});

// تاریخچه بازنگی‌های دستی یک گره مورد نیاز (نمایش سابقه کامل)
gapRoutes.get('/review-history/:requiredNodeId', async (req, res) => {
  try {
    const { requiredNodeId } = req.params;
    const history = await db.select()
      .from(gapReviews)
      .where(eq(gapReviews.requiredNodeId, parseInt(requiredNodeId)))
      .orderBy(desc(gapReviews.createdAt))
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('Error fetching gap review history:', error);
    res.status(500).json({ error: 'خطا در دریافت سابقه بازنگی' });
  }
});

export default gapRoutes;
