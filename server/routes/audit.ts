// server/routes/audit.ts
// مدیریت لاگ‌های حسابرسی

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { auditLogs, users } from '../../src/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac.js';

export const auditRoutes = Router();

auditRoutes.use(requireRole(['admin', 'superadmin']));

auditRoutes.get('/', async (req, res) => {
  try {
    const logs = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityName: auditLogs.entityName,
      entityId: auditLogs.entityId,
      changes: auditLogs.changes,
      timestamp: auditLogs.timestamp,
      username: users.username,
      fullName: users.fullName
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.id))
    .limit(100);

    res.json(logs);
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

auditRoutes.get('/filter', async (req, res) => {
  try {
    const { action, entity, from, to, search } = req.query;
    
    let query: any = db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityName: auditLogs.entityName,
      entityId: auditLogs.entityId,
      changes: auditLogs.changes,
      timestamp: auditLogs.timestamp,
      username: users.username,
      fullName: users.fullName
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));

    const conditions: any[] = [];
    if (action) conditions.push(eq(auditLogs.action, action as string));
    if (entity) conditions.push(eq(auditLogs.entityName, entity as string));
    if (search) {
      // جستجو در changes
    }

    if (conditions.length > 0) query = query.where(and(...conditions));
    query = query.orderBy(desc(auditLogs.id)).limit(100);

    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('Audit filter error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

auditRoutes.get('/stats', async (req, res) => {
  try {
    const total = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs);
    const creates = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs).where(eq(auditLogs.action, 'CREATE'));
    const updates = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs).where(eq(auditLogs.action, 'UPDATE'));
    const deletes = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs).where(eq(auditLogs.action, 'DELETE'));

    res.json({
      total: total[0]?.count || 0,
      creates: creates[0]?.count || 0,
      updates: updates[0]?.count || 0,
      deletes: deletes[0]?.count || 0,
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});