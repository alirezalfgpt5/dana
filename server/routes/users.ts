import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/users.ts
// مدیریت کامل کاربران - با سطح سازمانی و درجه

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logAudit } from '../utils/audit.js';

import { requireRole } from '../middleware/rbac.js';
import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

const userSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد').max(50),
  password: z.string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(72, 'رمز عبور نباید بیشتر از 72 کاراکتر باشد')
    .regex(passwordRegex, 'رمز عبور باید شامل حروف بزرگ، کوچک، عدد و یک کاراکتر ویژه باشد')
    .optional()
    .or(z.literal('')),
  fullName: z.string().min(2, 'نام کامل الزامی است').max(100),
  role: z.enum(['admin', 'manager', 'user']).optional().default('user'),
  baseId: z.union([z.string(), z.number()]).optional().nullable(),
  unitId: z.union([z.string(), z.number()]).optional().nullable(),
  phone: z.string().optional().nullable(),
  rank: z.string().optional().nullable(),
  organizationLevel: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

export const userRoutes = Router();

// GET all users
userRoutes.get('/', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      baseId: users.baseId,
      unitId: users.unitId,
      phone: users.phone,
      rank: users.rank,
      organizationLevel: users.organizationLevel,
      photoUrl: users.photoUrl,
    }).from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('GET users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET user by ID
userRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      baseId: users.baseId,
      unitId: users.unitId,
      phone: users.phone,
      rank: users.rank,
      organizationLevel: users.organizationLevel,
      photoUrl: users.photoUrl,
    }).from(users).where(eq(users.id, parseInt(id)));
    
    if (result.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result[0]);
  } catch (error) {
    console.error('GET user by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE user
userRoutes.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const parseResult = userSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0].message });
    }
    const { username, password, fullName, role, baseId, unitId, phone, rank, organizationLevel, photoUrl } = parseResult.data;
    if (!password) {
      return res.status(400).json({ error: 'رمز عبور الزامی است' });
    }

    const existingUser = await db.query.users.findFirst({ where: eq(users.username, username) });
    if (existingUser) return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertData = {
      username,
      password: hashedPassword,
      fullName,
      role: role || 'user',
      baseId: baseId ? typeof baseId === 'string' ? parseInt(baseId) : (baseId || null) : null,
      unitId: unitId ? typeof unitId === 'string' ? parseInt(unitId) : (unitId || null) : null,
      phone: phone || null,
      rank: rank || null,
      organizationLevel: organizationLevel || null,
      photoUrl: photoUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.insert(users).values(insertData).returning();

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'کاربر',
      entityId: result[0].id,
      changes: { username: result[0].username, role: result[0].role },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const responseData = {
      id: result[0].id,
      username: result[0].username,
      fullName: result[0].fullName,
      role: result[0].role,
      baseId: result[0].baseId,
      unitId: result[0].unitId,
      phone: result[0].phone,
      rank: result[0].rank,
      organizationLevel: result[0].organizationLevel,
      photoUrl: result[0].photoUrl,
    };
    res.status(201).json(responseData);
  } catch (error: any) {
    console.error('POST user error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
    }
    res.status(500).json({ error: 'خطای سرور در ثبت کاربر' });
  }
});

// UPDATE user
userRoutes.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = userSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0].message });
    }
    const { username, password, fullName, role, baseId, unitId, phone, rank, organizationLevel, photoUrl } = parseResult.data;

    const oldData = await db.query.users.findFirst({ where: eq(users.id, parseInt(id)) });
    if (!oldData) return res.status(404).json({ error: 'User not found' });

    if (username !== oldData.username) {
      const existingUser = await db.query.users.findFirst({ where: eq(users.username, username) });
      if (existingUser) return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
    }

    const updateData: any = {
      username,
      fullName,
      role,
      baseId: baseId ? typeof baseId === 'string' ? parseInt(baseId) : (baseId || null) : null,
      unitId: unitId ? typeof unitId === 'string' ? parseInt(unitId) : (unitId || null) : null,
      phone: phone || null,
      rank: rank || null,
      organizationLevel: organizationLevel || null,
      photoUrl: photoUrl || null,
      updatedAt: new Date().toISOString(),
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const result = await db.update(users).set(updateData).where(eq(users.id, parseInt(id))).returning();

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'کاربر',
      entityId: parseInt(id),
      changes: { old: { username: oldData?.username, fullName: oldData?.fullName, role: oldData?.role }, new: { username: result[0].username, fullName: result[0].fullName, role: result[0].role } },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const responseData = {
      id: result[0].id,
      username: result[0].username,
      fullName: result[0].fullName,
      role: result[0].role,
      baseId: result[0].baseId,
      unitId: result[0].unitId,
      phone: result[0].phone,
      rank: result[0].rank,
      organizationLevel: result[0].organizationLevel,
      photoUrl: result[0].photoUrl,
    };
    res.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('PUT user error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
    }
    res.status(500).json({ error: 'خطای سرور در ویرایش کاربر' });
  }
});

// DELETE user
userRoutes.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'کاربر',
      entityId: userId,
      changes: { username: existing?.username, fullName: existing?.fullName },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    await db.delete(users).where(eq(users.id, userId));
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});