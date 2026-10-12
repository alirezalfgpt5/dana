// server/routes/audit.ts
// مدیریت لاگ‌های حسابرسی

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { auditLogs, users } from '../../src/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac.js';

export const auditRoutes = Router();

auditRoutes.use(requireRole(['admin', 'superadmin']));

auditRoutes.get('/entities', async (_req, res) => {
  try {
    const entities = await db.select({ entityName: auditLogs.entityName })
      .from(auditLogs)
      .groupBy(auditLogs.entityName)
      .orderBy(auditLogs.entityName);
    res.json(entities.map(entry => entry.entityName));
  } catch (error) {
    console.error('Audit entity list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    const entity = typeof req.query.entity === 'string' ? req.query.entity : '';
    const countLogs = async (action?: string) => {
      const conditions = [];
      if (entity && entity !== 'all') conditions.push(eq(auditLogs.entityName, entity));
      if (action) conditions.push(eq(auditLogs.action, action));
      const query = db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs);
      return conditions.length ? query.where(and(...conditions)) : query;
    };
    const total = await countLogs();
    const creates = await countLogs('CREATE');
    const updates = await countLogs('UPDATE');
    const deletes = await countLogs('DELETE');

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