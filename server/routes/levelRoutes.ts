import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/levelRoutes.ts
// مدیریت سطوح دانش (Knowledge Levels)

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { knowledgeLevels, treeNodes } from '../../src/db/schema.js';
import { eq, like, sql, and } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';

export const levelRoutes = Router();

// ============================================
// ۱. دریافت لیست سطوح
// ============================================

levelRoutes.get('/', async (req, res) => {
  try {
    const { isActive, search } = req.query;

    let query = db.select().from(knowledgeLevels);
    const conditions: any[] = [];

    if (isActive !== undefined) {
      conditions.push(eq(knowledgeLevels.isActive, parseInt(isActive as string)));
    }
    if (search) {
      conditions.push(like(knowledgeLevels.name, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(knowledgeLevels.sortOrder);
    res.json(result);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. دریافت یک سطح
// ============================================

levelRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelId = parseInt(id);

    const level = await db.query.knowledgeLevels.findFirst({
      where: eq(knowledgeLevels.id, levelId),
    });

    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }

    // بررسی تعداد استفاده‌ها
    const usageCount = await db.select({ count: sql<number>`count(*)` })
      .from(treeNodes)
      .where(eq(treeNodes.levelId, levelId));

    res.json({
      ...level,
      usageCount: usageCount[0]?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۳. ایجاد سطح جدید
// ============================================

levelRoutes.post('/', async (req, res) => {
  try {
    const { name, description, parentId, sortOrder, metadata } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!name) {
      return res.status(400).json({ error: 'نام سطح الزامی است' });
    }

    // بررسی تکراری نبودن
    const existing = await db.query.knowledgeLevels.findFirst({
      where: eq(knowledgeLevels.name, name),
    });

    if (existing) {
      return res.status(409).json({ error: 'این سطح قبلاً ثبت شده است' });
    }

    const result = await db.insert(knowledgeLevels).values({
      name: name.trim(),
      description: description || null,
      parentId: parentId || null,
      sortOrder: sortOrder || 0,
      isActive: 1,
      metadata: metadata || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'سطح دانش',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۴. ویرایش سطح
// ============================================

levelRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelId = parseInt(id);
    const { name, description, parentId, sortOrder, isActive, metadata } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const oldData = await db.query.knowledgeLevels.findFirst({
      where: eq(knowledgeLevels.id, levelId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'Level not found' });
    }

    // بررسی تکراری نبودن (اگر نام تغییر کرده)
    if (name && name !== oldData.name) {
      const existing = await db.query.knowledgeLevels.findFirst({
        where: eq(knowledgeLevels.name, name),
      });
      if (existing) {
        return res.status(409).json({ error: 'این سطح قبلاً ثبت شده است' });
      }
    }

    const result = await db.update(knowledgeLevels)
      .set({
        name: name !== undefined && name !== null ? name : oldData.name,
        description: description !== undefined ? description : oldData.description,
        parentId: parentId !== undefined ? parentId : oldData.parentId,
        sortOrder: sortOrder !== undefined ? sortOrder : oldData.sortOrder,
        isActive: isActive !== undefined ? isActive : oldData.isActive,
        metadata: metadata !== undefined ? metadata : oldData.metadata,
        updatedAt: now,
      })
      .where(eq(knowledgeLevels.id, levelId))
      .returning();

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'سطح دانش',
      entityId: levelId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۵. حذف سطح
// ============================================

levelRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const levelId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    const existing = await db.query.knowledgeLevels.findFirst({
      where: eq(knowledgeLevels.id, levelId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Level not found' });
    }

    // بررسی استفاده در گره‌ها
    const usageCount = await db.select({ count: sql<number>`count(*)` })
      .from(treeNodes)
      .where(eq(treeNodes.levelId, levelId));

    if (usageCount[0]?.count > 0) {
      return res.status(400).json({
        error: 'این سطح در گره‌های درختواره استفاده شده است',
        count: usageCount[0].count,
      });
    }

    await db.delete(knowledgeLevels).where(eq(knowledgeLevels.id, levelId));

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'سطح دانش',
      entityId: levelId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting level:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۶. دریافت آمار سطوح
// ============================================

levelRoutes.get('/stats', async (req, res) => {
  try {
    const levels = await db.select().from(knowledgeLevels);

    const stats = await Promise.all(
      levels.map(async (level) => {
        const count = await db.select({ count: sql<number>`count(*)` })
          .from(treeNodes)
          .where(eq(treeNodes.levelId, level.id));

        return {
          id: level.id,
          name: level.name,
          usageCount: count[0]?.count || 0,
          isActive: level.isActive,
        };
      })
    );

    const total = levels.length;
    const active = levels.filter((l) => l.isActive === 1).length;
    const totalUsage = stats.reduce((sum, s) => sum + s.usageCount, 0);

    res.json({
      total,
      active,
      inactive: total - active,
      totalUsage,
      details: stats,
    });
  } catch (error) {
    console.error('Error fetching level stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default levelRoutes;