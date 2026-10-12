import { AuthRequest } from '../types/AuthRequest.js';
import express from 'express';
import { db } from '../../src/db/index.js';
import { roles, users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { logAudit } from '../utils/audit.js';
import { APPLICATION_PERMISSIONS, normalizePermissions } from '../../src/config/permissions.js';

export const roleRoutes = express.Router();

const knownPermissionIds = new Set<string>(APPLICATION_PERMISSIONS.map(permission => permission.id));

function validateRolePermissions(value: unknown): string[] | null {
  let permissions: unknown = value;
  if (typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(permissions) || permissions.some(permission => typeof permission !== 'string')) {
    return null;
  }
  if (permissions.includes('all')) return null;

  const normalized = normalizePermissions(permissions);
  if (normalized.some(permission => !knownPermissionIds.has(permission))) return null;
  return normalized;
}

// Get all roles
roleRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const allRoles = await db.select().from(roles);
    res.json(allRoles);
  } catch (error: any) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Create role
roleRoutes.post('/', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { name, label, permissions } = req.body;
    if (name === 'superadmin') {
      return res.status(400).json({ error: 'نقش مدیر کل فقط توسط سامانه مدیریت می‌شود' });
    }
    const validatedPermissions = validateRolePermissions(permissions || []);
    if (!validatedPermissions) {
      return res.status(400).json({ error: 'فهرست دسترسی‌های نقش معتبر نیست' });
    }
    
    const newRole = await db.insert(roles).values({
      name,
      label,
      permissions: JSON.stringify(validatedPermissions),
      isSystem: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'مدیریت نقش‌ها',
      entityId: newRole[0].id,
      changes: { label, name, permissions },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(newRole[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Update role
roleRoutes.put('/:id', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, label, permissions } = req.body;
    
    const existing = await db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.id, Number(id))
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'نقش یافت نشد' });
    }
    
    const validatedPermissions = existing.name === 'superadmin'
      ? existing.permissions
      : permissions === undefined
        ? existing.permissions
        : (() => {
          const parsed = validateRolePermissions(permissions);
          return parsed ? JSON.stringify(parsed) : null;
        })();
    if (validatedPermissions === null) {
      return res.status(400).json({ error: 'فهرست دسترسی‌های نقش معتبر نیست' });
    }
    
    const updated = await db.update(roles).set({
      name: existing.isSystem ? existing.name : name, // can't change system role names
      label: label || existing.label,
      permissions: validatedPermissions,
      updatedAt: new Date().toISOString()
    }).where(eq(roles.id, Number(id))).returning();
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'مدیریت نقش‌ها',
      entityId: updated[0].id,
      changes: { old: existing, new: updated[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Delete role
roleRoutes.delete('/:id', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.id, Number(id))
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'نقش یافت نشد' });
    }
    
    if (existing.isSystem) {
      return res.status(400).json({ error: 'نقش‌های سیستمی قابل حذف نیستند' });
    }
    
    // Check if in use
    const usersWithRole = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, existing.name)
    });
    
    if (usersWithRole) {
      return res.status(400).json({ error: 'این نقش به کاربرانی اختصاص داده شده است و قابل حذف نیست' });
    }
    
    await db.delete(roles).where(eq(roles.id, Number(id)));
    
    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'مدیریت نقش‌ها',
      entityId: Number(id),
      changes: { name: existing.name, label: existing.label },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});
