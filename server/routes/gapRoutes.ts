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
  bases,
  units,
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
import { getUserOrgScope } from '../utils/orgAccess.js';
import { sqlite } from '../../src/db/index.js';

export const gapRoutes = Router();

// ============================================
// توابع کمکی بررسی کنترل دسترسی سازمانی (آجا / نیرو / رده)
// ============================================

export async function canUserAccessTree(user: any, tree: any): Promise<boolean> {
  if (!user) return false;
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') return true;
  if (!tree) return false;

  if (orgScope.level === 'RADE') {
    if (tree.unitId) {
      return orgScope.canAccessUnit(tree.unitId);
    }
    if (tree.baseId) {
      return orgScope.canAccessBase(tree.baseId);
    }
    return false;
  }

  if (orgScope.level === 'NIROO') {
    if (tree.unitId) {
      return orgScope.canAccessUnit(tree.unitId);
    }
    if (tree.baseId) {
      return orgScope.canAccessBase(tree.baseId);
    }
    return false;
  }

  return false;
}

export async function canUserAccessNode(user: any, nodeId: number): Promise<{ allowed: boolean; tree: any; node: any }> {
  if (!user || !nodeId) return { allowed: false, tree: null, node: null };
  const node = await db.query.treeNodes.findFirst({
    where: eq(treeNodes.id, nodeId),
  });
  if (!node) return { allowed: false, tree: null, node: null };
  const tree = await db.query.knowledgeTrees.findFirst({
    where: eq(knowledgeTrees.id, node.treeId),
  });
  if (!tree) return { allowed: false, tree: null, node };
  const allowed = await canUserAccessTree(user, tree);
  return { allowed, tree, node };
}

export async function canUserAccessGap(user: any, gapId: number): Promise<{ allowed: boolean; gap: any; tree: any; requiredNode: any }> {
  if (!user || !gapId) return { allowed: false, gap: null, tree: null, requiredNode: null };
  const gap = await db.query.gaps.findFirst({
    where: eq(gaps.id, gapId),
  });
  if (!gap) return { allowed: false, gap: null, tree: null, requiredNode: null };
  const nodeAccess = await canUserAccessNode(user, gap.requiredNodeId);
  return {
    allowed: nodeAccess.allowed,
    gap,
    tree: nodeAccess.tree,
    requiredNode: nodeAccess.node,
  };
}

// ============================================
// ۱. دریافت گپ‌ها با فیلترهای پیشرفته
// ============================================

gapRoutes.get('/', async (req, res) => {
  try {
    const {
      treeId,
      periodId,
      status,
      gapType,
      priority,
      search,
      advancedFilter,
      baseId,
      unitId,
      mode,
      page = 1,
      limit = 20
    } = req.query;

    let query = db.select().from(gaps);
    const conditions: any[] = [];

    // کنترل دسترسی سازمانی
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);
    const isAggregate = mode === 'aggregate';
    const effective = orgScope.getEffectiveFilter(
      baseId ? parseInt(baseId as string) : null,
      unitId ? parseInt(unitId as string) : null,
      isAggregate
    );

    if (effective.unitIds && effective.unitIds.length > 0) {
      // فقط گپ‌های مربوط به درخت‌های این یگان‌ها
      const userTrees = await db.select({ id: knowledgeTrees.id })
        .from(knowledgeTrees)
        .where(inArray(knowledgeTrees.unitId, effective.unitIds));
      const treeIds = userTrees.map(t => t.id);
      if (treeIds.length > 0) {
        const uNodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
        const uNodeIds = uNodes.map(n => n.id);
        if (uNodeIds.length > 0) {
          conditions.push(or(
            inArray(gaps.requiredNodeId, uNodeIds),
            inArray(gaps.producedNodeId, uNodeIds)
          ));
        } else {
          conditions.push(eq(gaps.id, -1));
        }
      } else {
        conditions.push(eq(gaps.id, -1));
      }
    }

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
    } else if (periodId && periodId !== 'all' && periodId !== 'undefined' && periodId !== 'null') {
      const pId = parseInt(periodId as string);
      if (!isNaN(pId)) {
        const treesInPeriod = await db.select({ id: knowledgeTrees.id })
           .from(knowledgeTrees)
           .where(eq(knowledgeTrees.periodId, pId));

        const treeIds = treesInPeriod.map(t => t.id);

        if (treeIds.length > 0) {
           const nodesInPeriod = await db.select({ id: treeNodes.id })
              .from(treeNodes)
              .where(inArray(treeNodes.treeId, treeIds));

           const nodeIds = nodesInPeriod.map(n => n.id);

           if (nodeIds.length > 0) {
              conditions.push(or(
                eq(gaps.periodId, pId),
                inArray(gaps.requiredNodeId, nodeIds)
              ));
           } else {
              conditions.push(eq(gaps.periodId, pId));
           }
        } else {
           conditions.push(eq(gaps.periodId, pId));
        }
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
      const rawSearch = (search as string).trim();
      const normSearch = normalizePersianText(rawSearch);
      if (normSearch && normSearch !== rawSearch) {
        conditions.push(or(
          like(gaps.description, `%${rawSearch}%`),
          like(gaps.description, `%${normSearch}%`)
        ));
      } else {
        conditions.push(like(gaps.description, `%${rawSearch}%`));
      }
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

    // دریافت اطلاعات تکمیلی گره‌ها و ساختار سازمانی مالک
    const reqNodeIds = result.map(g => g.requiredNodeId).filter(Boolean);
    const prodNodeIds = result.map(g => g.producedNodeId).filter(Boolean) as number[];
    const allNodeIds = Array.from(new Set([...reqNodeIds, ...prodNodeIds]));
    
    let allNodes: any[] = [];
    if (allNodeIds.length > 0) {
      allNodes = await db.select().from(treeNodes).where(inArray(treeNodes.id, allNodeIds));
    }
    const treeIds = Array.from(new Set(allNodes.map(n => n.treeId).filter(Boolean)));
    
    let treesWithOrg: any[] = [];
    if (treeIds.length > 0) {
      treesWithOrg = await db.select({
        id: knowledgeTrees.id,
        name: knowledgeTrees.name,
        type: knowledgeTrees.type,
        baseName: bases.name,
        unitName: units.name,
      })
      .from(knowledgeTrees)
      .leftJoin(bases, eq(knowledgeTrees.baseId, bases.id))
      .leftJoin(units, eq(knowledgeTrees.unitId, units.id))
      .where(inArray(knowledgeTrees.id, treeIds));
    }
    const treeOrgMap = new Map(treesWithOrg.map(t => {
      const org = [t.baseName, t.unitName].filter(Boolean).join(' • ') || 'ستاد کل آجا';
      return [t.id, { ...t, orgStructure: org }];
    }));

    const enrichedGaps = await Promise.all(result.map(async (gap) => {
      const requiredNode = allNodes.find(n => n.id === gap.requiredNodeId) || await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, gap.requiredNodeId),
      });

      const producedNode = gap.producedNodeId
        ? (allNodes.find(n => n.id === gap.producedNodeId) || await db.query.treeNodes.findFirst({
            where: eq(treeNodes.id, gap.producedNodeId),
          }))
        : null;

      const reqTree = requiredNode ? treeOrgMap.get(requiredNode.treeId) : null;
      const prodTree = producedNode ? treeOrgMap.get(producedNode.treeId) : null;

      const orgStructure = reqTree?.orgStructure || (gap.metadata as any)?.ownerPath || 'ستاد کل آجا';

      const researchItem = await db.query.researchItems.findFirst({
        where: eq(researchItems.gapId, gap.id),
      });

      const issue = researchItem ? await db.query.issues.findFirst({
        where: eq(issues.researchItemId, researchItem.id),
      }) : null;

      const metadata = {
        ...(typeof gap.metadata === 'object' && gap.metadata !== null ? gap.metadata : {}),
        ownerPath: (gap.metadata as any)?.ownerPath || orgStructure,
        requiredTreeName: reqTree?.name || null,
        producedTreeName: prodTree?.name || null,
      };

      return {
        ...gap,
        requiredNode,
        producedNode,
        orgStructure,
        requiredOrgStructure: reqTree?.orgStructure || null,
        producedOrgStructure: prodTree?.orgStructure || null,
        metadata,
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
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (requiredTreeId) {
      const tree = await db.query.knowledgeTrees.findFirst({
        where: eq(knowledgeTrees.id, parseInt(requiredTreeId as string)),
      });
      if (!tree) {
        return res.status(404).json({ error: 'درختواره مورد نیاز یافت نشد' });
      }
      const canAccess = await canUserAccessTree(user, tree);
      if (!canAccess) {
        return res.status(403).json({ error: 'عدم دسترسی سازمانی به سوابق این درختواره' });
      }
    }

    let query = db.select({
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
      .from(gapAnalysisRuns);

    const conditions: any[] = [];
    if (requiredTreeId) {
      conditions.push(eq(gapAnalysisRuns.requiredTreeId, parseInt(requiredTreeId as string)));
    } else if (!orgScope.isSuperAdmin && orgScope.level !== 'AJA') {
      const effective = orgScope.getEffectiveFilter();
      if (effective.unitIds && effective.unitIds.length > 0) {
        const userTrees = await db.select({ id: knowledgeTrees.id })
          .from(knowledgeTrees)
          .where(inArray(knowledgeTrees.unitId, effective.unitIds));
        const treeIds = userTrees.map(t => t.id);
        if (treeIds.length > 0) {
          conditions.push(inArray(gapAnalysisRuns.requiredTreeId, treeIds));
        } else {
          conditions.push(eq(gapAnalysisRuns.id, -1));
        }
      } else if (effective.baseIds && effective.baseIds.length > 0) {
        const userTrees = await db.select({ id: knowledgeTrees.id })
          .from(knowledgeTrees)
          .where(inArray(knowledgeTrees.baseId, effective.baseIds));
        const treeIds = userTrees.map(t => t.id);
        if (treeIds.length > 0) {
          conditions.push(inArray(gapAnalysisRuns.requiredTreeId, treeIds));
        } else {
          conditions.push(eq(gapAnalysisRuns.id, -1));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const history = await query.orderBy(desc(gapAnalysisRuns.createdAt)).limit(25);
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
    const conditions: any[] = [];

    // کنترل دسترسی سازمانی
    const user = (req as AuthRequest).user;
    if (user) {
      const orgScope = getUserOrgScope(user);
      const isAggregate = req.query.mode === 'aggregate';
      const effective = orgScope.getEffectiveFilter(
        req.query.baseId ? parseInt(req.query.baseId as string) : null,
        req.query.unitId ? parseInt(req.query.unitId as string) : null,
        isAggregate
      );

      if (effective.unitIds && effective.unitIds.length > 0) {
        const userTrees = await db.select({ id: knowledgeTrees.id })
          .from(knowledgeTrees)
          .where(inArray(knowledgeTrees.unitId, effective.unitIds));
        const treeIds = userTrees.map(t => t.id);
        if (treeIds.length > 0) {
          const uNodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
          const uNodeIds = uNodes.map(n => n.id);
          if (uNodeIds.length > 0) {
            conditions.push(or(
              inArray(gaps.requiredNodeId, uNodeIds),
              inArray(gaps.producedNodeId, uNodeIds)
            ));
          } else {
            conditions.push(eq(gaps.id, -1));
          }
        } else {
          conditions.push(eq(gaps.id, -1));
        }
      }
    }

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
              conditions.push(or(...chunks));
            } else {
              conditions.push(inArray(gaps.id, gapIds));
            }
          } else {
            conditions.push(eq(gaps.id, -1));
          }
        } else {
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
        conditions.push(eq(gaps.id, -1));
      }
    } else if (req.query.periodId && req.query.periodId !== 'all' && req.query.periodId !== 'undefined' && req.query.periodId !== 'null') {
      const pId = parseInt(req.query.periodId as string);
      if (!isNaN(pId)) {
        const treesInPeriod = await db.select({ id: knowledgeTrees.id })
           .from(knowledgeTrees)
           .where(eq(knowledgeTrees.periodId, pId));
        const treeIds = treesInPeriod.map(t => t.id);
        if (treeIds.length > 0) {
           const nodesInPeriod = await db.select({ id: treeNodes.id })
              .from(treeNodes)
              .where(inArray(treeNodes.treeId, treeIds));
           const nodeIds = nodesInPeriod.map(n => n.id);
           if (nodeIds.length > 0) {
              conditions.push(or(
                eq(gaps.periodId, pId),
                inArray(gaps.requiredNodeId, nodeIds)
              ));
           } else {
              conditions.push(eq(gaps.periodId, pId));
           }
        } else {
           conditions.push(eq(gaps.periodId, pId));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
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
    if (isNaN(gapId)) {
      return res.status(400).json({ error: 'شناسه گپ نامعتبر است' });
    }

    const user = (req as AuthRequest).user;
    const { allowed, gap, requiredNode } = await canUserAccessGap(user, gapId);

    if (!gap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    if (!allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به این گپ' });
    }

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
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;

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

    // 🟢 کنترل دسترسی سازمانی به درخت‌های تحلیل (رفع ایراد ۱)
    const canAccessReq = await canUserAccessTree(user, requiredTree);
    if (!canAccessReq) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به درختواره مورد نیاز' });
    }

    if (producedTree) {
      const canAccessProd = await canUserAccessTree(user, producedTree);
      if (!canAccessProd) {
        return res.status(403).json({ error: 'عدم دسترسی سازمانی به درختواره تولیدشده' });
      }
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

    // ۳. جمع‌آوری گپ‌های قبلی این درختواره موردنیاز جهت به‌روزرسانی هوشمند به جای حذف کورکورانه (رفع ایراد ۲ و ۴)
    const requiredNodeIds = requiredAllNodes.map(n => n.id);
    let oldGaps: any[] = [];
    if (requiredNodeIds.length > 0) {
      if (requiredNodeIds.length > 500) {
        for (let i = 0; i < requiredNodeIds.length; i += 500) {
          const chunk = await db.select().from(gaps).where(inArray(gaps.requiredNodeId, requiredNodeIds.slice(i, i + 500)));
          oldGaps.push(...chunk);
        }
      } else {
        oldGaps = await db.select().from(gaps).where(inArray(gaps.requiredNodeId, requiredNodeIds));
      }
    }

    const existingGapsByReqNode = new Map<number, any>();
    oldGaps.forEach(g => existingGapsByReqNode.set(g.requiredNodeId, g));
    const oldGapIds = oldGaps.map(g => g.id);

    // شناسایی گپ‌هایی که دارای آیتم پژوهشی هستند (این گپ‌ها و اتصالات پژوهشی نباید حذف شوند)
    const gapIdsWithResearch = new Set<number>();
    if (oldGapIds.length > 0) {
      if (oldGapIds.length > 500) {
        for (let i = 0; i < oldGapIds.length; i += 500) {
          const chunk = await db.select({ gapId: researchItems.gapId })
            .from(researchItems)
            .where(inArray(researchItems.gapId, oldGapIds.slice(i, i + 500)));
          chunk.forEach(r => { if (r.gapId) gapIdsWithResearch.add(r.gapId); });
        }
      } else {
        const chunk = await db.select({ gapId: researchItems.gapId })
          .from(researchItems)
          .where(inArray(researchItems.gapId, oldGapIds));
        chunk.forEach(r => { if (r.gapId) gapIdsWithResearch.add(r.gapId); });
      }
    }

    // 🟢 جمع‌آوری بازنگری‌های دستی کاربر از گپ‌های قدیمی (رفع ایراد ۴)
    // انتقال فقط بازنگری‌هایی که واقعاً وضعیت را تغییر می‌دهند (not_gap و adjusted معتبر)
    // برای confirmed_gap وضعیت موتور بازنویسی نمی‌شود تا نتیجه تحلیل جدید حفظ شود
    const manualReviews: Array<{ requiredNodeId: number; verdict: string; newStatus: string | null; note: string | null }> = [];
    const manualStatusMap = new Map<number, { status: string | null; note: string | null; verdict: string | null }>();
    const notGapNodeIds = new Set<number>();

    for (const og of oldGaps) {
      const meta = (og.metadata as any) || {};
      const review = meta.manualReview as { verdict?: string; note?: string | null; newStatus?: string | null } | undefined;
      if (review && review.verdict) {
        let carriedStatus: string | null = null;
        if (review.verdict === 'not_gap') {
          carriedStatus = 'filled';
        } else if (review.verdict === 'adjusted') {
          const cand = review.newStatus ?? meta.manualNewStatus;
          if (cand && ['open', 'filled', 'partially_filled'].includes(cand)) {
            carriedStatus = cand;
          }
        }
        // در confirmed_gap وضعیت موتور باید حفظ شود پس carriedStatus مقدار null می‌گیرد

        manualReviews.push({
          requiredNodeId: og.requiredNodeId,
          verdict: review.verdict,
          newStatus: carriedStatus,
          note: review.note ?? null,
        });

        if (carriedStatus || review.note) {
          manualStatusMap.set(og.requiredNodeId, {
            status: carriedStatus,
            note: review.note ?? null,
            verdict: review.verdict,
          });
        }
        if (review.verdict === 'not_gap') {
          notGapNodeIds.add(og.requiredNodeId);
        }
      }
    }

    // گپ‌های منسوخ: گپ‌هایی که گره موردنیازشان دیگر در بین برگ‌های درخت نیست
    const currentLeafIdSet = new Set(requiredLeaves.map(l => l.id));
    const obsoleteGaps = oldGaps.filter(g => !currentLeafIdSet.has(g.requiredNodeId));
    // فقط گپ‌های منسوخی که فاقد هرگونه آیتم پژوهشی هستند حذف می‌شوند تا اتصال پژوهش‌ها و مسائل محفوظ بماند
    const obsoleteGapsToDelete = obsoleteGaps.filter(g => !gapIdsWithResearch.has(g.id));

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

    const carriedReviewCount = manualReviews.length;

    // مسیر مالکیت سازمانی
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

    let filledCount = 0;
    let openCount = 0;
    let partialCount = 0;
    let carriedReviews = 0;

    // محاسبات درون حافظه قبل از ورود به تراکنش
    const preparedOperations: Array<{
      requiredLeaf: any;
      existingGap: any | null;
      gapData: any;
      match: any;
      requiredAncestors: any[];
      gapStatus: string;
    }> = [];

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
      let description = match.reasonFa;

      // اعمال نظر دستی کاربر در صورت وجود وضعیت تحمیلی معتبر (not_gap یا adjusted)
      const manual = manualStatusMap.get(requiredLeaf.id);
      if (manual && manual.status) {
        gapStatus = manual.status as any;
        description = `${manual.note ? `🎧 نظر کاربر: ${manual.note} — ` : ''}${description}`;
        carriedReviews++;
      } else if (manual && manual.note) {
        description = `🎧 نظر کاربر: ${manual.note} — ${description}`;
        carriedReviews++;
      }

      if (gapStatus === 'filled') filledCount++;
      else if (gapStatus === 'partially_filled') partialCount++;
      else openCount++;

      let validProducedNodeId: number | null = null;
      if (match.matchedNodeId) {
        const existsInMap = nodeMapProduced.has(match.matchedNodeId);
        if (existsInMap) {
          validProducedNodeId = match.matchedNodeId;
        }
      }

      const existingGap = existingGapsByReqNode.get(requiredLeaf.id) || null;
      const existingMeta = (existingGap?.metadata as any) || {};

      const gapData = {
        periodId: requiredTree.periodId || null,
        requiredNodeId: requiredLeaf.id,
        producedNodeId: validProducedNodeId,
        status: gapStatus,
        gapType: match.gapType,
        priority: options?.defaultPriority || existingGap?.priority || 'medium',
        matchScore: match.matchScore,
        description,
        metadata: {
          ...existingMeta,
          engine: 'v2',
          analyzedAt: now,
          templateDetails: match.templateDetails || null,
          scoreBreakdown: match.scoreBreakdown || null,
          matchedNodeTitle: match.matchedNodeTitle || null,
          ownerPath: requiredOwnerPath,
          ownerPathLabel: `مالک: ${requiredOwnerPath}`,
          structuralPath: requiredAncestors.map((a: any) => a.title).join(' › ') + (requiredAncestors.length ? ' › ' : '') + requiredLeaf.title,
          manualReview: manual ? { verdict: manual.verdict, note: manual.note, newStatus: manual.status } : (existingMeta.manualReview || null),
          manualNewStatus: manual && manual.verdict === 'adjusted' ? manual.status : null,
        },
        updatedAt: now,
      };

      preparedOperations.push({
        requiredLeaf,
        existingGap,
        gapData,
        match,
        requiredAncestors,
        gapStatus,
      });
    }

    // تولید گزارش تحلیلی با شرح فارسی روش تحلیل
    const createdGaps: any[] = [];
    const analysisReport = buildAnalysisReport({
      requiredTreeName: requiredTree.name,
      producedTreeName: producedTree ? producedTree.name : null,
      results: preparedOperations.map((op: any) => ({
        requiredNodeId: op.requiredLeaf.id,
        requiredNodeTitle: op.requiredLeaf.title || '',
        level: op.requiredLeaf.level || 'L',
        status: op.gapStatus,
        gapType: op.match.gapType,
        matchScore: op.match.matchScore || 0,
        matchedNodeTitle: op.match.matchedNodeTitle || null,
        reasonFa: op.match.reasonFa,
      })),
      createdAt: format(new Date(), 'yyyy/MM/dd HH:mm'),
    });

    const coveragePercentRun = preparedOperations.length > 0
      ? Math.round((filledCount / preparedOperations.length) * 100)
      : 0;

    // ۶. اجرای اتمیک کلیه تغییرات درون تراکنش پایگاه داده (رفع ایراد ۳)
    sqlite.exec('BEGIN IMMEDIATE;');
    try {
      // الف. حذف گپ‌های منسوخ فاقد آیتم پژوهشی
      if (obsoleteGapsToDelete.length > 0) {
        const delIds = obsoleteGapsToDelete.map(g => g.id);
        if (delIds.length > 500) {
          for (let i = 0; i < delIds.length; i += 500) {
            await db.delete(gaps).where(inArray(gaps.id, delIds.slice(i, i + 500)));
          }
        } else {
          await db.delete(gaps).where(inArray(gaps.id, delIds));
        }
      }

      // ب. درج یا به‌روزرسانی درجا بر اساس کلید پایدار requiredNodeId (رفع ایراد ۲)
      for (const op of preparedOperations) {
        let savedGap: any;
        if (op.existingGap) {
          // به‌روزرسانی گپ موجود با حفظ شناسه و اتصالات پژوهشی/مسائل
          const updateRes = await db.update(gaps)
            .set(op.gapData)
            .where(eq(gaps.id, op.existingGap.id))
            .returning();
          savedGap = updateRes[0];
        } else {
          // درج گپ جدید
          const insertRes = await db.insert(gaps)
            .values({
              ...op.gapData,
              createdAt: now,
            })
            .returning();
          savedGap = insertRes[0];
        }

        // به‌روزرسانی وضعیت گره برگ
        await db.update(treeNodes)
          .set({
            isGap: op.gapStatus === 'open' ? 1 : 0,
            gapStatus: op.gapStatus,
            updatedAt: now,
          })
          .where(eq(treeNodes.id, op.requiredLeaf.id));

        createdGaps.push({
          ...savedGap,
          requiredNode: op.requiredLeaf,
          producedNode: op.match.matchedNodeId ? nodeMapProduced.get(op.match.matchedNodeId) || null : null,
          reasonFa: op.match.reasonFa,
          ownerPath: requiredOwnerPath,
          structuralPath: op.requiredAncestors.map((a: any) => a.title).concat([op.requiredLeaf.title]).join(' › '),
        });
      }

      // ج. ثبت سابقه تحلیل در gapAnalysisRuns
      await db.insert(gapAnalysisRuns).values({
        requiredTreeId: parseInt(requiredTreeId),
        producedTreeId: producedTreeId ? parseInt(producedTreeId) : 0,
        totalLeaves: createdGaps.length,
        filled: filledCount,
        partial: partialCount,
        openCount: openCount,
        coveragePercent: coveragePercentRun,
        carriedReviews,
        report: analysisReport as any,
        createdBy: userId,
        createdAt: now,
      });

      // تأیید نهایی تراکنش
      sqlite.exec('COMMIT;');
    } catch (txError) {
      try {
        sqlite.exec('ROLLBACK;');
      } catch (rbErr) {
        console.error('Error during rollback:', rbErr);
      }
      throw txError;
    }

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
      userAgent: req.headers?.['user-agent'],
    });

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
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;

    if (!requiredTreeId) {
      return res.status(400).json({ error: 'شناسه درختواره مورد نیاز الزامی است' });
    }

    const requiredTree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, parseInt(requiredTreeId))
    });

    if (!requiredTree) {
      return res.status(404).json({ error: 'درختواره مورد نیاز یافت نشد' });
    }

    const canAccessReq = await canUserAccessTree(user, requiredTree);
    if (!canAccessReq) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به درختواره مورد نیاز' });
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
      userAgent: req.headers?.['user-agent'],
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
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;

    const gapIdNum = parseInt(gapId);
    if (isNaN(gapIdNum)) {
      return res.status(400).json({ error: 'شناسه گپ نامعتبر است' });
    }

    const { allowed, gap: existingGap } = await canUserAccessGap(user, gapIdNum);

    if (!existingGap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    if (!allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به این گپ' });
    }

    if (existingGap.status === 'filled') {
      return res.status(400).json({ error: 'این گپ قبلاً پر شده است' });
    }

    // بررسی وجود گره تولیدشده و دسترسی سازمانی به آن
    if (!producedNodeId) {
      return res.status(400).json({ error: 'شناسه گره تولیدشده الزامی است' });
    }

    const prodAccess = await canUserAccessNode(user, parseInt(producedNodeId));
    if (!prodAccess.node) {
      return res.status(404).json({ error: 'گره تولیدشده یافت نشد' });
    }
    if (!prodAccess.allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به گره تولیدشده' });
    }
    const producedNode = prodAccess.node;

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

    // 🟢 ثبت در سوابق بازنگری (تاریخچه کامل عملیات دستی)
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
      userAgent: req.headers?.['user-agent'],
    });

    return res.json({
      success: true,
      message: effectiveStatus === 'partially_filled' ? 'گپ با تطابق جزئی ثبت شد' : 'گپ با موفقیت پر شد',
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
    if (isNaN(gapIdNum)) {
      return res.status(400).json({ error: 'شناسه گپ نامعتبر است' });
    }

    const user = (req as AuthRequest).user;
    const { allowed, gap: existing } = await canUserAccessGap(user, gapIdNum);

    if (!existing) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    if (!allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به این گپ' });
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

    // 🟢 ثبت حذف در سوابق بازنگری (تاریخچه کامل حتی پس از حذف گپ حفظ می‌شود)
    const delMeta = (existing.metadata as any) || {};
    await db.insert(gapReviews).values({
      gapId: gapIdNum,
      requiredNodeId: existing.requiredNodeId,
      verdict: 'deleted',
      previousStatus: existing.status,
      newStatus: null,
      note: delMeta.manualReview?.note || 'حذف دستی گپ توسط کاربر',
      reviewedBy: user?.id || null,
      createdAt: new Date().toISOString(),
    });

    logAudit({
      userId: user?.id || null,
      action: 'DELETE',
      entityName: 'گپ',
      entityId: gapIdNum,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
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
// بازنگری دستی کاربر روی گپ (نظر کاربر: گپ هست / گپ نیست / اصلاح وضعیت)
// نظر در gap_reviews ثبت و در تحلیل‌های بعدی به‌صورت خودکار اعمال می‌شود (منطق آخرین نسخه)
// ============================================

gapRoutes.post('/:gapId/review', async (req, res) => {
  try {
    const { gapId } = req.params;
    const gapIdNum = parseInt(gapId);
    if (isNaN(gapIdNum)) {
      return res.status(400).json({ error: 'شناسه گپ نامعتبر است' });
    }

    const { verdict, newStatus, note } = req.body;
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    const validVerdicts = ['confirmed_gap', 'not_gap', 'adjusted'];
    if (!validVerdicts.includes(verdict)) {
      return res.status(400).json({ error: 'نظر ارسالی نامعتبر است (confirmed_gap | not_gap | adjusted)' });
    }

    const ALLOWED_GAP_STATUSES = ['open', 'filled', 'partially_filled'];
    if (verdict === 'adjusted') {
      if (!newStatus || !ALLOWED_GAP_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          error: 'وضعیت جدید برای تغییر دستی نامعتبر است (باید یکی از مقادیر open، filled یا partially_filled باشد)',
        });
      }
    }

    const { allowed, gap: existingGap } = await canUserAccessGap(user, gapIdNum);
    if (!existingGap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    if (!allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به این گپ' });
    }

    // تعیین وضعیت جدید بر اساس نوع نظر
    let effectiveStatus = existingGap.status;
    let manualOverrideStatus: string | null = null;
    if (verdict === 'not_gap') {
      // کاربر می‌گوید این گپ نیست → گره دیگر گپ محسوب نمی‌شود
      effectiveStatus = 'filled';
      manualOverrideStatus = 'filled';
    } else if (verdict === 'adjusted') {
      effectiveStatus = newStatus;
      manualOverrideStatus = newStatus;
    }
    // verdict === 'confirmed_gap' → وضعیت فعلی حفظ می‌شود و manualOverrideStatus خالی می‌ماند تا در تحلیل بعدی نتیجه موتور تحمیل نشود

    // ثبت سابقه بازنگری (بدون حذف — سابقه کامل حفظ می‌شود)
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
          ? `${existingGap.description || ''} | 🎧 بازنگری دستی: ${note}`.trim()
          : existingGap.description,
        metadata: {
          ...((existingGap.metadata as any) || {}),
          manualReview: {
            verdict,
            note: note || null,
            at: now,
            newStatus: manualOverrideStatus,
          },
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
      entityName: 'بازنگری دستی گپ',
      entityId: gapIdNum,
      changes: { verdict, note, previousStatus: existingGap.status, newStatus: effectiveStatus },
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
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
    res.status(500).json({ error: 'خطا در ثبت بازنگری گپ' });
  }
});

// تاریخچه بازنگری‌های دستی یک گره مورد نیاز (نمایش سابقه کامل)
gapRoutes.get('/review-history/:requiredNodeId', async (req, res) => {
  try {
    const { requiredNodeId } = req.params;
    const reqNodeIdNum = parseInt(requiredNodeId);
    if (isNaN(reqNodeIdNum)) {
      return res.status(400).json({ error: 'شناسه گره نامعتبر است' });
    }

    const user = (req as AuthRequest).user;
    const nodeAccess = await canUserAccessNode(user, reqNodeIdNum);
    if (!nodeAccess.node) {
      return res.status(404).json({ error: 'گره مورد نیاز یافت نشد' });
    }

    if (!nodeAccess.allowed) {
      return res.status(403).json({ error: 'عدم دسترسی سازمانی به این گره' });
    }

    const history = await db.select()
      .from(gapReviews)
      .where(eq(gapReviews.requiredNodeId, reqNodeIdNum))
      .orderBy(desc(gapReviews.createdAt))
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('Error fetching gap review history:', error);
    res.status(500).json({ error: 'خطا در دریافت سابقه بازنگری' });
  }
});

export default gapRoutes;
