import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/periods.ts
// مدیریت دوره‌های زمانی

import { Router } from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { periods, knowledgeTrees } from '../../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';

export const periodRoutes = Router();

// ============================================
// ۱. دریافت لیست دوره‌ها
// ============================================

periodRoutes.get('/', async (req, res) => {
  try {
    const { isActive, isComplete } = req.query;
    
    let query = db.select().from(periods);
    const conditions: any[] = [];

    if (isActive !== undefined) {
      conditions.push(eq(periods.isActive, parseInt(isActive as string)));
    }
    if (isComplete !== undefined) {
      conditions.push(eq(periods.isComplete, parseInt(isComplete as string)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(periods.startDate);
    res.json(result);
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. دریافت یک دوره
// ============================================

periodRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query.periods.findFirst({
      where: eq(periods.id, parseInt(id)),
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Period not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching period:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۳. ایجاد دوره جدید
// ============================================

periodRoutes.post('/', async (req, res) => {
  try {
    const { name, startDate, endDate, description } = req.body;
    const now = new Date().toISOString();

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'عنوان، تاریخ شروع و تاریخ پایان الزامی است' });
    }

    const result = await db.insert(periods).values({
      name,
      startDate,
      endDate,
      description: description || null,
      isActive: 0,
      isComplete: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'دوره زمانی',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating period:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۴. ویرایش دوره
// ============================================

periodRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const periodId = parseInt(id);
    const { name, startDate, endDate, description, isActive, isComplete } = req.body;
    const now = new Date().toISOString();

    const oldData = await db.query.periods.findFirst({
      where: eq(periods.id, periodId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'Period not found' });
    }

    const result = await db.update(periods)
      .set({
        name: name !== undefined && name !== null ? name : oldData.name,
        startDate: startDate !== undefined && startDate !== null ? startDate : oldData.startDate,
        endDate: endDate !== undefined && endDate !== null ? endDate : oldData.endDate,
        description: description !== undefined ? description : oldData.description,
        isActive: isActive !== undefined ? isActive : oldData.isActive,
        isComplete: isComplete !== undefined ? isComplete : oldData.isComplete,
        updatedAt: now,
      })
      .where(eq(periods.id, periodId))
      .returning();

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'دوره زمانی',
      entityId: periodId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating period:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۵. حذف دوره
// ============================================

periodRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const periodId = parseInt(id);

    const existing = await db.query.periods.findFirst({
      where: eq(periods.id, periodId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Period not found' });
    }

    // بررسی استفاده در درختواره‌ها
    const trees = await db.select().from(knowledgeTrees)
      .where(eq(knowledgeTrees.periodId, periodId));

    if (trees.length > 0) {
      return res.status(400).json({
        error: 'این دوره در درختواره‌ها استفاده شده است',
        count: trees.length,
      });
    }

    await db.delete(periods).where(eq(periods.id, periodId));

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'دوره زمانی',
      entityId: periodId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting period:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default periodRoutes;