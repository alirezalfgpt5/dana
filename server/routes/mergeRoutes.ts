// server/routes/mergeRoutes.ts
// تلفیق لایه‌ای درختواره‌های هم‌سطح — دو لایه (هم‌سطح) درختواره/اکسل خود را می‌دهند و
// سیستم یک درختواره تلفیق‌شده برای لایه بالاتر تولید می‌کند. سوابق کامل در tree_merges ثبت می‌شود.
// کاملاً آفلاین — بدون هیچ وابستگی خارجی.

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  knowledgeTrees,
  treeNodes,
  treeMerges,
} from '../../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { AuthRequest } from '../types/AuthRequest.js';

export const mergeRoutes = Router();

function extractIds(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

// ============================================
// ۱. اجرای تلفیق: منبع A + منبع B → درختواره مقصد (لایه بالاتر)
// body: { targetTreeId, sourceTreeIdA, sourceTreeIdB, strategy: 'union' | 'prefer_target' }
// ============================================

mergeRoutes.post('/trees', async (req, res) => {
  try {
    const { targetTreeId, sourceTreeIdA, sourceTreeIdB, strategy = 'union', sourceLabels } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!targetTreeId || !sourceTreeIdA || !sourceTreeIdB) {
      return res.status(400).json({ error: 'درختواره مقصد و هر دو درختواره منبع الزامی هستند' });
    }
    if (String(sourceTreeIdA) === String(sourceTreeIdB)) {
      return res.status(400).json({ error: 'دو درختواره منبع نمی‌توانند یکسان باشند' });
    }

    const [targetTree, treeA, treeB] = await Promise.all([
      db.query.knowledgeTrees.findFirst({ where: eq(knowledgeTrees.id, parseInt(targetTreeId)) }),
      db.query.knowledgeTrees.findFirst({ where: eq(knowledgeTrees.id, parseInt(sourceTreeIdA)) }),
      db.query.knowledgeTrees.findFirst({ where: eq(knowledgeTrees.id, parseInt(sourceTreeIdB)) }),
    ]);

    if (!targetTree || !treeA || !treeB) {
      return res.status(404).json({ error: 'یکی از درختواره‌ها یافت نشد' });
    }

    const nodesA = await db.select().from(treeNodes).where(eq(treeNodes.treeId, parseInt(sourceTreeIdA)));
    const nodesB = await db.select().from(treeNodes).where(eq(treeNodes.treeId, parseInt(sourceTreeIdB)));
    const targetNodes = await db.select().from(treeNodes).where(eq(treeNodes.treeId, parseInt(targetTreeId)));

    // مسیر ساختاری (عنوان‌ها از ریشه) برای تشخیص گره‌های هم‌ارز
    const buildPath = (n: any, all: Map<number, any>): string => {
      const parts: string[] = [n.title];
      let cur = n.parentId ? all.get(n.parentId) : undefined;
      let guard = 0;
      while (cur && guard++ < 50) {
        parts.unshift(cur.title);
        cur = cur.parentId ? all.get(cur.parentId) : undefined;
      }
      return parts.join(' › ');
    };

    const targetAllMap = new Map<number, any>(targetNodes.map(n => [n.id, n]));
    const targetByPath = new Map<string, any>();
    targetNodes.forEach(n => targetByPath.set(buildPath(n, targetAllMap), n));

    const results = { added: 0, updated: 0, conflicts: 0, skipped: 0 };
    const details: any[] = [];

    /** درج همگام یک گره (better-sqlite3 sync driver) */
    const insertNodeSync = (parentId: number | null, node: any): number => {
      const inserted = db.insert(treeNodes).values({
        treeId: parseInt(targetTreeId),
        parentId,
        level: node.level,
        title: node.title,
        description: node.description || null,
        templateIds: extractIds(node.templateIds).join(',') || null,
        instanceIds: extractIds(node.instanceIds).join(',') || null,
        levelId: node.levelId || null,
        sortOrder: node.sortOrder || 0,
        createdAt: now,
        updatedAt: now,
      }).returning().all();
      const newId = (inserted as any[])[0].id;
      return newId;
    };

    /** به‌روزرسانی همگام */
    const updateNodeSync = (nodeId: number, values: Record<string, any>) => {
      db.update(treeNodes)
        .set({ ...values, updatedAt: now })
        .where(eq(treeNodes.id, nodeId))
        .run();
    };

    /** تلفیق یک لیست گره‌های منبع در مقصد */
    const mergeNodeList = (sourceNodes: any[], sourceLabel: string) => {
      const sourceAllMap = new Map<number, any>(sourceNodes.map(n => [n.id, n]));

      for (const src of sourceNodes) {
        const srcPath = buildPath(src, sourceAllMap);
        const existing: any = targetByPath.get(srcPath);

        if (existing) {
          // گره هم‌ارز: تلفیق templateIds / instanceIds
          const mergedTemplates = Array.from(new Set([...extractIds(existing.templateIds), ...extractIds(src.templateIds)]));
          const mergedInstances = Array.from(new Set([...extractIds(existing.instanceIds), ...extractIds(src.instanceIds)]));
          const tplChanged = mergedTemplates.join(',') !== extractIds(existing.templateIds).join(',');
          const instChanged = mergedInstances.join(',') !== extractIds(existing.instanceIds).join(',');

          if (strategy === 'prefer_target') {
            results.skipped++;
            details.push({ action: 'skipped', path: srcPath, source: sourceLabel });
          } else if (tplChanged || instChanged) {
            updateNodeSync(existing.id, {
              templateIds: mergedTemplates.join(',') || null,
              instanceIds: mergedInstances.join(',') || null,
            });
            results.updated++;
            details.push({ action: 'updated', path: srcPath, source: sourceLabel });
          } else {
            results.skipped++;
            details.push({ action: 'identical', path: srcPath, source: sourceLabel });
          }
        } else {
          // گره جدید: ابتدا اجداد تا ریشه، سپس خود گره
          const ancestors: any[] = [];
          let cur = src.parentId ? sourceAllMap.get(src.parentId) : undefined;
          let guard = 0;
          while (cur && guard++ < 50) {
            ancestors.unshift(cur);
            cur = cur.parentId ? sourceAllMap.get(cur.parentId) : undefined;
          }

          let parentTargetId: number | null = null;
          let pathParts: string[] = [];
          for (const anc of ancestors) {
            pathParts.push(anc.title);
            const ancPath = pathParts.join(' › ');
            let ancTarget: any = targetByPath.get(ancPath);
            if (!ancTarget) {
              const newId = insertNodeSync(parentTargetId, anc);
              ancTarget = { id: newId };
              targetByPath.set(ancPath, ancTarget);
              results.added++;
              details.push({ action: 'added', path: ancPath, source: sourceLabel });
            }
            parentTargetId = ancTarget.id;
          }

          const leafPath = pathParts.concat([src.title]).join(' › ');
          if (!targetByPath.has(leafPath)) {
            const newId = insertNodeSync(parentTargetId, src);
            targetByPath.set(leafPath, { id: newId });
            results.added++;
            details.push({ action: 'added', path: leafPath, source: sourceLabel });
          } else {
            results.skipped++;
            details.push({ action: 'identical', path: leafPath, source: sourceLabel });
          }
        }
      }
    };

    mergeNodeList(nodesA, sourceLabels?.a || treeA.name);
    mergeNodeList(nodesB, sourceLabels?.b || treeB.name);

    // ثبت سابقه کامل تلفیق (سوابق به‌صورت همیشگی حفظ می‌شوند)
    await db.insert(treeMerges).values({
      treeId: parseInt(targetTreeId),
      sourceLabel: `${sourceLabels?.a || treeA.name} + ${sourceLabels?.b || treeB.name}`,
      sourceType: 'tree',
      sourceTreeId: parseInt(sourceTreeIdA),
      added: results.added,
      updated: results.updated,
      conflicts: results.conflicts,
      skipped: results.skipped,
      details: details as any,
      createdBy: userId,
      createdAt: now,
    });

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'تلفیق درختواره‌ها',
      entityId: parseInt(targetTreeId),
      changes: { sourceTreeIdA, sourceTreeIdB, strategy, ...results },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `تلفیق کامل شد: ${results.added} گره جدید، ${results.updated} تلفیق محتوایی، ${results.skipped} بدون تغییر`,
      ...results,
      details: details.slice(0, 100),
    });
  } catch (error) {
    console.error('Error merging trees:', error);
    res.status(500).json({ error: 'خطا در تلفیق درختواره‌ها' });
  }
});

// ============================================
// ۲. سوابق تلفیق یک درختواره مقصد
// ============================================

mergeRoutes.get('/history/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;
    const history = await db.select()
      .from(treeMerges)
      .where(eq(treeMerges.treeId, parseInt(treeId)))
      .orderBy(desc(treeMerges.createdAt))
      .limit(50);
    res.json(history);
  } catch (error) {
    console.error('Error fetching merge history:', error);
    res.status(500).json({ error: 'خطا در دریافت سوابق تلفیق' });
  }
});
