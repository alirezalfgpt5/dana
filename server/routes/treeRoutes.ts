import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/treeRoutes.ts
// مدیریت کامل درختواره‌های دانش (مورد نیاز، تولیدشده، پژوهشی) - نسخه ۳.۱ با پشتیبانی از نمونه‌های قالب

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  knowledgeTrees,
  treeNodes,
  knowledgeAssets,
  gaps,
  researchItems,
  templates,
  templateInstances,
  issues,
} from '../../src/db/schema.js';
import { eq, and, isNull, not, inArray, or, like, desc } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import fs from 'fs';
import path from 'path';

import { requireRole } from '../middleware/rbac.js';
import { getUserOrgScope } from '../utils/orgAccess.js';
export const treeRoutes = Router();

// ============================================
// ایجاد نسخه/اسنپ‌شات از درختواره (Clone/Snapshot)
// ============================================
treeRoutes.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const treeId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    if (!(await hasTreeAccess((req as AuthRequest).user, treeId))) return res.status(403).json({ error: 'عدم دسترسی' });

    const sourceTree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeId),
    });

    if (!sourceTree) return res.status(404).json({ error: 'درختواره یافت نشد' });

    const now = new Date().toISOString();
    const targetPeriodId = req.body.targetPeriodId ? parseInt(req.body.targetPeriodId) : sourceTree.periodId;
    const targetName = req.body.name || (sourceTree.name + (req.body.targetPeriodId ? '' : ' (نسخه ' + now.substring(0,10) + ')'));
    
    // Create new tree
    const newTree = await db.insert(knowledgeTrees).values({
      name: targetName,
      type: sourceTree.type,
      description: sourceTree.description,
      periodId: targetPeriodId,
      baseId: sourceTree.baseId,
      unitId: sourceTree.unitId,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const newTreeId = (newTree as any[])[0].id;

    // Get all nodes
    const sourceNodes = await db.select().from(treeNodes).where(eq(treeNodes.treeId, treeId));
    
    // Map old ids to new ids to maintain hierarchy
    const idMap = new Map<number, number>();

    // Insert nodes level by level to reduce queries from N to depth(Tree)
    let currentLevelNodes = sourceNodes.filter(n => !n.parentId);
    
    while (currentLevelNodes.length > 0) {
      const valuesToInsert = currentLevelNodes.map(node => ({
        treeId: newTreeId,
        parentId: node.parentId ? idMap.get(node.parentId) : null,
        level: node.level,
        title: node.title,
        description: node.description,
        templateIds: node.templateIds,
        instanceIds: node.instanceIds,
        levelId: node.levelId,
        sortOrder: node.sortOrder,
        createdAt: now,
        updatedAt: now,
      }));

      if (valuesToInsert.length > 0) {
        const newNodes = await db.insert(treeNodes).values(valuesToInsert).returning();
        for (let i = 0; i < currentLevelNodes.length; i++) {
          idMap.set(currentLevelNodes[i].id, (newNodes as any[])[i].id);
        }
      }

      const currentIds = currentLevelNodes.map(n => n.id);
      currentLevelNodes = sourceNodes.filter(n => n.parentId && currentIds.includes(n.parentId));
    }

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'درختواره',
      entityId: newTreeId,
      changes: { action: 'CLONE', sourceTreeId: treeId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'نسخه جدید با موفقیت ایجاد شد', tree: (newTree as any[])[0] });
  } catch (error) {
    console.error('Error cloning tree:', error);
    res.status(500).json({ error: 'خطا در ایجاد نسخه' });
  }
});


// Helper برای بررسی دسترسی
async function hasTreeAccess(user: any, treeId: number) {
  if (!user) return false;
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') return true;

  const treeArray = await db.select().from(knowledgeTrees).where(eq(knowledgeTrees.id, treeId));
  if (treeArray.length === 0) return false;
  const tree = treeArray[0];
  
  if (tree.unitId && !orgScope.canAccessUnit(tree.unitId)) return false;
  if (tree.baseId && !orgScope.canAccessBase(tree.baseId)) return false;
  
  return true;
}


// ============================================
// ۱. مدیریت درختواره‌ها (CRUD)
// ============================================

// دریافت لیست درختواره‌ها با فیلتر
treeRoutes.get('/', async (req, res) => {
  try {
    const { type, periodId, baseId, unitId, isActive, mode } = req.query;
    
    let query = db.select().from(knowledgeTrees);
    const conditions: any[] = [];

    if (type) {
      conditions.push(eq(knowledgeTrees.type, type as string));
    }
    if (periodId) {
      conditions.push(eq(knowledgeTrees.periodId, parseInt(periodId as string)));
    }
    if (isActive !== undefined) {
      conditions.push(eq(knowledgeTrees.isActive, parseInt(isActive as string)));
    }

    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);
    const isAggregate = mode === 'aggregate';
    const effective = orgScope.getEffectiveFilter(
      baseId ? parseInt(baseId as string) : null,
      unitId ? parseInt(unitId as string) : null,
      isAggregate
    );

    if (effective.unitIds && effective.unitIds.length > 0) {
      conditions.push(inArray(knowledgeTrees.unitId, effective.unitIds));
    } else if (effective.baseIds && effective.baseIds.length > 0) {
      conditions.push(inArray(knowledgeTrees.baseId, effective.baseIds));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(knowledgeTrees.createdAt);
    res.json(result);
  } catch (error) {
    console.error('Error fetching trees:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// دریافت یک درختواره با تمام گره‌ها
treeRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const treeId = parseInt(id);
    
    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeId),
    });
    
    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.write('{');
    
    for (const [key, value] of Object.entries(tree)) {
      res.write(`"${key}":${JSON.stringify(value)},`);
    }
    
    res.write('"nodes":[');
    
    let offset = 0;
    const limit = 500;
    let isFirst = true;
    
    const allResearchNodeIds = new Set();
    if (tree.type === 'research') {
      const allResearch = await db.select({ nodeId: researchItems.nodeId }).from(researchItems);
      allResearch.forEach(r => { if (r.nodeId) allResearchNodeIds.add(r.nodeId); });
    }

    let nodeIds: number[] = [];

    while (true) {
      const chunk = await db.select()
        .from(treeNodes)
        .where(eq(treeNodes.treeId, treeId))
        .orderBy(treeNodes.sortOrder)
        .limit(limit)
        .offset(offset);
        
      if (chunk.length === 0) break;
      
      for (const n of chunk) {
        if (!isFirst) res.write(',');
        isFirst = false;
        
        let enriched = { ...n } as any;
        if (tree.type === 'produced') {
          enriched.hasItems = !!(n.instanceIds && n.instanceIds.length > 2);
          enriched.instanceCount = n.instanceIds?.split(',').filter(Boolean).length || 0;
        } else if (tree.type === 'required') {
          enriched.hasItems = !!(n.templateIds && String(n.templateIds).length > 2);
          enriched.templateCount = (Array.isArray(n.templateIds) ? n.templateIds : (n.templateIds ? String(n.templateIds).split(',').filter(Boolean) : [])).length || 0;
        } else if (tree.type === 'research') {
          enriched.hasItems = allResearchNodeIds.has(n.id);
        }
        
        res.write(JSON.stringify(enriched));
        if (tree.type === 'research') {
           nodeIds.push(n.id);
        }
      }
      
      offset += limit;
      await new Promise(r => setImmediate(r));
    }
    
    res.write(']');
    
    if (tree.type === 'research') {
      let gapsData: any[] = [];
      let researchData: any[] = [];
      
      if (nodeIds.length > 0) {
        for (let i = 0; i < nodeIds.length; i += 500) {
          const chunkIds = nodeIds.slice(i, i + 500);
          const gapsChunk = await db.select().from(gaps).where(inArray(gaps.requiredNodeId, chunkIds));
          gapsData.push(...gapsChunk);
          
          const researchChunk = await db.select().from(researchItems).where(inArray(researchItems.nodeId, chunkIds));
          researchData.push(...researchChunk);
          
          await new Promise(r => setImmediate(r));
        }
      }
      res.write(`,"gaps":${JSON.stringify(gapsData)},"research":${JSON.stringify(researchData)}`);
    } else {
      res.write(`,"gaps":[],"research":[]`);
    }
    
    res.write('}');
    res.end();
  } catch (error) {
    console.error('Error fetching tree:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error' });
    } else {
      res.end();
    }
  }
});

import { z } from 'zod';

const treeSchema = z.object({
  name: z.string().min(1, 'نام درختواره الزامی است'),
  type: z.enum(['required', 'produced', 'research']),
  description: z.string().optional().nullable(),
  periodId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار periodId نامعتبر است'),
  baseId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار baseId نامعتبر است'),
  unitId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار unitId نامعتبر است'),
  metadata: z.any().optional().nullable(),
  isActive: z.union([z.string(), z.number(), z.boolean()]).transform(val => val ? 1 : 0).optional()
});

// ایجاد درختواره جدید
treeRoutes.post('/', requireRole(['admin', 'knowledge_manager']), async (req, res) => {
  try {
    const parseResult = treeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues.map(i => i.message).join(', ') });
    }
    const { name, type, description, periodId, baseId, unitId, metadata } = parseResult.data;
    const now = new Date().toISOString();
    
    const result = await db.insert(knowledgeTrees).values({
      name,
      type,
      description: description || null,
      periodId: periodId,
      baseId: baseId,
      unitId: unitId,
      metadata: metadata || null,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'درختواره',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const treeUpdateSchema = z.object({
  name: z.string().min(1, 'نام درختواره نمی‌تواند خالی باشد').optional(),
  description: z.string().optional().nullable(),
  periodId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار periodId نامعتبر است').optional(),
  baseId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار baseId نامعتبر است').optional(),
  unitId: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null).refine(val => val === null || !isNaN(val), 'مقدار unitId نامعتبر است').optional(),
  metadata: z.any().optional().nullable(),
  isActive: z.union([z.string(), z.number(), z.boolean()]).transform(val => val ? 1 : 0).optional()
});

// ویرایش درختواره
treeRoutes.put('/:id', requireRole(['admin', 'knowledge_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const treeId = parseInt(id);
    
    const parseResult = treeUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues.map(i => i.message).join(', ') });
    }
    
    const { name, description, periodId, baseId, unitId, isActive, metadata } = parseResult.data;
    const now = new Date().toISOString();
    
    if (!await hasTreeAccess((req as AuthRequest).user, treeId)) {
      return res.status(403).json({ error: 'عدم دسترسی به این درختواره' });
    }

    const oldData = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeId),
    });
    
    if (!oldData) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }
    
    const result = await db.update(knowledgeTrees)
      .set({
        name: name !== undefined && name !== null ? name : oldData.name,
        description: description !== undefined ? description : oldData.description,
        periodId: periodId !== undefined ? (periodId) : oldData.periodId,
        baseId: baseId !== undefined ? (baseId) : oldData.baseId,
        unitId: unitId !== undefined ? (unitId) : oldData.unitId,
        isActive: isActive !== undefined ? isActive : oldData.isActive,
        metadata: metadata !== undefined ? metadata : oldData.metadata,
        updatedAt: now,
      })
      .where(eq(knowledgeTrees.id, treeId))
      .returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'درختواره',
      entityId: treeId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// حذف درختواره (با حذف وابسته‌ها)
treeRoutes.delete('/:id', requireRole(['admin', 'knowledge_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const treeId = parseInt(id);
    
    const existing = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeId),
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }
    
    // دریافت تمام گره‌ها
    const allTreeNodes = await db.query.treeNodes.findMany({ where: eq(treeNodes.treeId, treeId) });
    const nodeIds = allTreeNodes.map(n => n.id);
    
    if (nodeIds.length > 0 && existing.type !== 'research') {
      const issuesWithNodes = await db.select({ id: issues.id }).from(issues).where(inArray(issues.domainNodeId, nodeIds));
      if (issuesWithNodes.length > 0) {
        return res.status(400).json({ error: 'این درختواره در نظام مسائل استفاده شده است و قابل حذف نیست.' });
      }
    }

    // گرفتن تمام دارایی‌های دانشی برای حذف فیزیکی
    let filesToDelete: string[] = [];
    if (nodeIds.length > 0) {
      const assets = await db.select().from(knowledgeAssets).where(inArray(knowledgeAssets.nodeId, nodeIds));
      filesToDelete = assets.map(a => a.filePath).filter(Boolean) as string[];
    }

    db.transaction((tx) => {
      if (nodeIds.length > 0) {
        for (const nid of nodeIds) {
          const items = tx.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.nodeId, nid)).all();
          if (items.length > 0) {
            const itemIds = items.map(i => i.id);
            tx.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, itemIds)).run();
          }
          tx.delete(researchItems).where(eq(researchItems.nodeId, nid)).run();
          
          const relatedGaps = tx.select().from(gaps).where(or(eq(gaps.requiredNodeId, nid), eq(gaps.producedNodeId, nid))).all();
          for (const g of relatedGaps) {
            const gapItems = tx.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.gapId, g.id)).all();
            if (gapItems.length > 0) {
              const gapItemIds = gapItems.map(i => i.id);
              tx.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, gapItemIds)).run();
            }
            tx.delete(researchItems).where(eq(researchItems.gapId, g.id)).run();
            tx.delete(gaps).where(eq(gaps.id, g.id)).run();
          }
          
          tx.delete(knowledgeAssets).where(eq(knowledgeAssets.nodeId, nid)).run();
        }
        
        tx.delete(treeNodes).where(eq(treeNodes.treeId, treeId)).run();
      }
      
      tx.delete(knowledgeTrees).where(eq(knowledgeTrees.id, treeId)).run();
    });
    
    // فیزیکی حذف کردن فایل‌ها
    filesToDelete.forEach(filePath => {
      try {
        const absolutePath = path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch(e) {
        console.error('Error deleting file:', e);
      }
    });
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'درختواره',
      entityId: treeId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. مدیریت گره‌های درختواره (CRUD پویا با سطوح R, T, B, SB, L, Q)
// ============================================

// دریافت گره‌های یک درختواره
treeRoutes.get('/:treeId/nodes', async (req, res) => {
  try {
    const { treeId } = req.params;
    const user = (req as AuthRequest).user;
    if (!(await hasTreeAccess(user, parseInt(treeId)))) {
      return res.status(403).json({ error: 'عدم دسترسی به این درختواره' });
    }
    const { parentId, level } = req.query;
    
    const conditions: any[] = [eq(treeNodes.treeId, parseInt(treeId))];
    
    if (parentId !== undefined) {
      if (parentId === 'null') {
        conditions.push(isNull(treeNodes.parentId));
      } else {
        conditions.push(eq(treeNodes.parentId, parseInt(parentId as string)));
      }
    }
    
    if (level) {
      conditions.push(eq(treeNodes.level, level as string));
    }
    
    const result = await db.select().from(treeNodes)
      .where(and(...conditions))
      .orderBy(treeNodes.sortOrder);
    res.json(result);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// افزودن گره جدید - با پشتیبانی از templateIds و instanceIds
treeRoutes.post('/:treeId/nodes', requireRole(['admin', 'knowledge_manager', 'expert']), async (req, res) => {
  try {
    const { treeId } = req.params;
    const { parentId, level, title, description, templateIds, instanceIds, levelId, metadata } = req.body;
    const now = new Date().toISOString();
    
    if (!title || !level) {
      return res.status(400).json({ error: 'عنوان و سطح گره الزامی است' });
    }
    
    const validLevels = ['R', 'T', 'B', 'SB', 'L', 'Q'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'سطح گره نامعتبر است' });
    }
    
    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, parseInt(treeId)),
    });
    
    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }
    
    if (parentId) {
      const parent = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, parseInt(parentId)),
      });
      if (!parent || parent.treeId !== parseInt(treeId)) {
        return res.status(400).json({ error: 'والد نامعتبر است' });
      }
    }
    
    // اعتبارسنجی: برای درختواره تولیدشده، instanceIds باید معتبر باشد
    if (tree.type === 'produced' && instanceIds) {
      const ids = instanceIds.split(',').filter(Boolean);
      for (const id of ids) {
        const instance = await db.query.templateInstances.findFirst({
          where: eq(templateInstances.id, parseInt(id)),
        });
        if (!instance) {
          return res.status(400).json({ error: `نمونه قالب با شناسه ${id} یافت نشد` });
        }
      }
    }
    
    // اعتبارسنجی: برای درختواره مورد نیاز، templateIds باید معتبر باشد
    if (tree.type === 'required' && templateIds) {
      const ids = (Array.isArray(templateIds) ? templateIds : String(templateIds).split(',').filter(Boolean));
      for (const id of ids) {
        const template = await db.query.templates.findFirst({
          where: eq(templates.id, parseInt(id)),
        });
        if (!template) {
          return res.status(400).json({ error: `قالب با شناسه ${id} یافت نشد` });
        }
      }
    }
    
    const result = await db.insert(treeNodes).values({
      treeId: parseInt(treeId),
      parentId: parentId ? parseInt(parentId) : null,
      level,
      title,
      description: description || null,
      templateIds: templateIds || null,
      instanceIds: instanceIds || null,
      levelId: levelId ? parseInt(levelId) : null,
      metadata: metadata || null,
      sortOrder: 0,
      isGap: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'گره درختواره',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ویرایش گره - با پشتیبانی از templateIds و instanceIds
treeRoutes.put('/nodes/:nodeId', requireRole(['admin', 'knowledge_manager', 'expert']), async (req, res) => {
  try {
    const { nodeId } = req.params;
    const nodeIdNum = parseInt(nodeId);
    const { parentId, level, title, description, templateIds, instanceIds, levelId, sortOrder, metadata } = req.body;
    const now = new Date().toISOString();
    
    const oldData = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, nodeIdNum),
    });
    
    if (!oldData) {
      return res.status(404).json({ error: 'گره یافت نشد' });
    }

    // ============================================
    // Fix Item 44: Optimistic Concurrency Control
    // ============================================
    if (req.body.updatedAt) {
      if (oldData.updatedAt !== req.body.updatedAt) {
        return res.status(409).json({ 
          error: 'مسابقه همزمانی (Race Condition): کاربر دیگری در همین لحظه تغییراتی در این رکورد اعمال کرده است. لطفاً صفحه را تازه‌سازی کنید.',
          conflict: true
        });
      }
    }

    if (!await hasTreeAccess((req as AuthRequest).user, oldData.treeId)) {
      return res.status(403).json({ error: 'عدم دسترسی به ویرایش گره‌های این درختواره' });
    }
    
    // دریافت درختواره برای اعتبارسنجی
    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, oldData.treeId),
    });
    
    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }
    
    if (parentId !== undefined && parentId !== null) {
      if (parseInt(parentId) === nodeIdNum) {
        return res.status(400).json({ error: 'گره نمی‌تواند والد خودش باشد' });
      }
      
      // بررسی حلقه (Cycle Detection) - Fix Item 42
      let currentParentId: number | null = parseInt(parentId);
      let depth = 0;
      while (currentParentId) {
        if (depth++ > 100) return res.status(400).json({ error: 'عمق درخت بیش از حد مجاز است یا حلقه وجود دارد' });
        if (currentParentId === nodeIdNum) {
          return res.status(400).json({ error: 'ایجاد حلقه در ساختار درختی مجاز نیست' });
        }
        const p = await db.select({ parentId: treeNodes.parentId }).from(treeNodes).where(eq(treeNodes.id, currentParentId)).limit(1);
        if (!p || p.length === 0) break;
        currentParentId = p[0].parentId;
        await new Promise(r => setImmediate(r)); // Yield event loop
      }

      const parent = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, parseInt(parentId)),
      });
      if (!parent || parent.treeId !== oldData.treeId) {
        return res.status(400).json({ error: 'والد نامعتبر است' });
      }
    }
    
    if (level) {
      const validLevels = ['R', 'T', 'B', 'SB', 'L', 'Q'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'سطح گره نامعتبر است' });
      }
    }
    
    // اعتبارسنجی برای درختواره تولیدشده
    if (tree.type === 'produced' && instanceIds !== undefined) {
      if (instanceIds) {
        const ids = instanceIds.split(',').filter(Boolean);
        for (const id of ids) {
          const instance = await db.query.templateInstances.findFirst({
            where: eq(templateInstances.id, parseInt(id)),
          });
          if (!instance) {
            return res.status(400).json({ error: `نمونه قالب با شناسه ${id} یافت نشد` });
          }
        }
      }
    }
    
    // اعتبارسنجی برای درختواره مورد نیاز
    if (tree.type === 'required' && templateIds !== undefined) {
      if (templateIds) {
        const ids = (Array.isArray(templateIds) ? templateIds : String(templateIds).split(',').filter(Boolean));
        for (const id of ids) {
          const template = await db.query.templates.findFirst({
            where: eq(templates.id, parseInt(id)),
          });
          if (!template) {
            return res.status(400).json({ error: `قالب با شناسه ${id} یافت نشد` });
          }
        }
      }
    }
    
    const result = await db.update(treeNodes)
      .set({
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : oldData.parentId,
        level: level !== undefined && level !== null ? level : oldData.level,
        title: title !== undefined && title !== null ? title : oldData.title,
        description: description !== undefined ? description : oldData.description,
        templateIds: templateIds !== undefined ? templateIds : oldData.templateIds,
        instanceIds: instanceIds !== undefined ? instanceIds : oldData.instanceIds,
        levelId: levelId !== undefined ? (levelId ? parseInt(levelId) : null) : oldData.levelId,
        sortOrder: sortOrder !== undefined ? sortOrder : oldData.sortOrder,
        metadata: metadata !== undefined ? metadata : oldData.metadata,
        updatedAt: now,
      })
      .where(eq(treeNodes.id, nodeIdNum))
      .returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'گره درختواره',
      entityId: nodeIdNum,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// حذف گره (با حذف فرزندان و بررسی وابستگی‌ها)
treeRoutes.delete('/nodes/:nodeId', requireRole(['admin', 'knowledge_manager', 'expert']), async (req, res) => {
  try {
    const { nodeId } = req.params;
    const nodeIdNum = parseInt(nodeId);
    
    const existing = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, nodeIdNum),
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'گره یافت نشد' });
    }
    
    // بررسی گره‌های فرزند
    const children = await db.query.treeNodes.findMany({
      where: eq(treeNodes.parentId, nodeIdNum),
    });
    
    if (children.length > 0) {
      return res.status(400).json({ 
        error: 'این گره دارای فرزند است، ابتدا فرزندان را حذف کنید',
        children: children.map(c => ({ id: c.id, title: c.title })),
      });
    }
    
    // گرفتن دارایی‌های مرتبط برای حذف فیزیکی
    const assets = await db.select()
      .from(knowledgeAssets)
      .where(eq(knowledgeAssets.nodeId, nodeIdNum));
    const filesToDelete = assets.map(a => a.filePath).filter(Boolean) as string[];
    
    // بررسی گپ‌های مرتبط
    const relatedGaps = await db.query.gaps.findMany({
      where: or(eq(gaps.requiredNodeId, nodeIdNum), eq(gaps.producedNodeId, nodeIdNum))
    });
    
    // بررسی استفاده در نظام مسائل
    const issuesWithNodes = await db.select({ id: issues.id }).from(issues).where(eq(issues.domainNodeId, nodeIdNum));
    if (issuesWithNodes.length > 0) {
      return res.status(400).json({ error: 'این گره در نظام مسائل به عنوان حوزه دانشی استفاده شده است و قابل حذف نیست.' });
    }

    db.transaction((tx) => {
      if (relatedGaps.length > 0) {
        for (const g of relatedGaps) {
          const gapItems = tx.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.gapId, g.id)).all();
          if (gapItems.length > 0) {
            const gapItemIds = gapItems.map(i => i.id);
            tx.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, gapItemIds)).run();
          }
          tx.delete(researchItems).where(eq(researchItems.gapId, g.id)).run();
          tx.delete(gaps).where(eq(gaps.id, g.id)).run();
        }
      }
      
      // حذف آیتم‌های پژوهشی مستقیماً مرتبط با گره
      const nodeItems = tx.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.nodeId, nodeIdNum)).all();
      if (nodeItems.length > 0) {
        const nodeItemIds = nodeItems.map(i => i.id);
        tx.update(issues).set({ researchItemId: null }).where(inArray(issues.researchItemId, nodeItemIds)).run();
      }
      tx.delete(researchItems).where(eq(researchItems.nodeId, nodeIdNum)).run();
      
      // حذف دارایی‌های دانشی
      tx.delete(knowledgeAssets).where(eq(knowledgeAssets.nodeId, nodeIdNum)).run();

      // حذف گره
      tx.delete(treeNodes).where(eq(treeNodes.id, nodeIdNum)).run();
    });

    // فیزیکی حذف کردن فایل‌ها
    filesToDelete.forEach(filePath => {
      try {
        const absolutePath = path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch(e) {
        console.error('Error deleting file:', e);
      }
    });

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'گره درختواره',
      entityId: nodeIdNum,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ============================================
// ۳. عملیات تخصصی روی گره‌ها
// ============================================

// کپی کردن کامل درختواره (با تمام گره‌ها)
treeRoutes.post('/:treeId/copy', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { newName, newType } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const sourceTree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, parseInt(treeId)),
    });

    if (!sourceTree) {
      return res.status(404).json({ error: 'درختواره مبدأ یافت نشد' });
    }

    const newTree = await db.insert(knowledgeTrees).values({
      name: newName || `${sourceTree.name} (کپی)`,
      type: newType || sourceTree.type,
      description: sourceTree.description,
      periodId: sourceTree.periodId,
      baseId: sourceTree.baseId,
      unitId: sourceTree.unitId,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const sourceNodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, parseInt(treeId)));

    const nodeIdMap = new Map();
    for (const node of sourceNodes) {
      const newNode = await db.insert(treeNodes).values({
        treeId: (newTree as any[])[0].id,
        parentId: null,
        level: node.level,
        title: node.title,
        description: node.description,
        templateIds: node.templateIds,
        instanceIds: node.instanceIds,
        levelId: node.levelId,
        sortOrder: node.sortOrder,
        isGap: node.isGap,
        gapStatus: node.gapStatus,
        metadata: node.metadata,
        createdAt: now,
        updatedAt: now,
      }).returning();

      nodeIdMap.set(node.id, (newNode as any[])[0].id);
    }

    for (const node of sourceNodes) {
      if (node.parentId && nodeIdMap.has(node.parentId)) {
        const newParentId = nodeIdMap.get(node.parentId);
        await db.update(treeNodes)
          .set({ parentId: newParentId })
          .where(eq(treeNodes.id, nodeIdMap.get(node.id)));
      }
    }

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'درختواره (کپی)',
      entityId: (newTree as any[])[0].id,
      changes: { sourceId: parseInt(treeId), newId: (newTree as any[])[0].id },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ 
      success: true, 
      tree: (newTree as any[])[0],
      nodeCount: sourceNodes.length,
    });
  } catch (error) {
    console.error('Error copying tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// دریافت مسیر یک گره تا ریشه
treeRoutes.get('/nodes/:nodeId/path', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const nodeIdNum = parseInt(nodeId);

    const path: any[] = [];
    let currentNodeId = nodeIdNum;
    let depth = 0;

    while (currentNodeId) {
      if (depth++ > 100) break; // Prevent infinite loop
      const node = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, currentNodeId),
      });

      if (!node) break;

      path.unshift(node);
      currentNodeId = node.parentId || 0;
      await new Promise(r => setImmediate(r)); // Yield event loop
    }

    res.json({ path });
  } catch (error) {
    console.error('Error getting node path:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default treeRoutes;
// دریافت گره‌های شاخه و زیرشاخه برای سیستم مسائل
treeRoutes.get('/domain-nodes/all', async (req, res) => {
  try {
    const nodes = await db.select()
      .from(treeNodes)
      .where(or(eq(treeNodes.level, 'B'), eq(treeNodes.level, 'SB')));
      
    // join tree to get tree name
    const result = await Promise.all(nodes.map(async (n) => {
      const tree = await db.query.knowledgeTrees.findFirst({ where: eq(knowledgeTrees.id, n.treeId) });
      return {
        id: n.id,
        title: n.title,
        level: n.level,
        treeName: tree?.name || 'نامشخص'
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching domain nodes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
