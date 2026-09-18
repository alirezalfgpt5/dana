import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/org.ts
// مدیریت ساختار سازمانی - نسخه نهایی با استفاده از ID

import { Router } from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { bases, units, organizationalLevels } from '../../src/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';

import { requireRole } from '../middleware/rbac.js';
export const orgRoutes = Router();

// ============================================
// ۱. دریافت سطوح سازمانی
// ============================================

orgRoutes.get('/levels', async (req, res) => {
  try {
    const levels = await db.select().from(organizationalLevels);
    res.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. مدیریت یگان‌های اصلی (bases)
// ============================================

orgRoutes.get('/bases', async (req, res) => {
  try {
    const { level, parentId, all } = req.query;
    
    let query = 'SELECT * FROM bases';
    const conditions: string[] = [];
    const params: any[] = [];

    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }
    
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      if (parentId === 'null') {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        params.push(parseInt(parentId as string));
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    const result = sqlite.prepare(query).all(...params);
    res.json(result);
  } catch (error) {
    console.error('Error fetching bases:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

orgRoutes.get('/bases/:id/tree', async (req, res) => {
  try {
    const { id } = req.params;
    const baseId = parseInt(id);

    const base = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(baseId);

    if (!base) {
      return res.status(404).json({ error: 'پایگاه یافت نشد' });
    }

    const children = sqlite.prepare('SELECT * FROM bases WHERE parent_id = ? ORDER BY sort_order ASC').all(baseId);
    const unitsList = sqlite.prepare('SELECT * FROM units WHERE base_id = ? ORDER BY sort_order ASC').all(baseId);

    res.json({
      ...base,
      children,
      units: unitsList,
    });
  } catch (error) {
    console.error('Error fetching base tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

orgRoutes.post('/bases', requireRole(['admin']), async (req, res) => {
  try {
    const { name, location, level, parentId, description } = req.body;
    const now = new Date().toISOString();

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'نام یگان الزامی است' 
      });
    }

    if (!level) {
      return res.status(400).json({ 
        success: false, 
        error: 'سطح سازمانی الزامی است' 
      });
    }

    // بررسی وجود سطح
    const levelExists = sqlite.prepare('SELECT * FROM organizational_levels WHERE name = ?').get(level);

    if (!levelExists) {
      return res.status(400).json({ 
        success: false, 
        error: `سطح "${level}" در سیستم تعریف نشده است. ابتدا آن را در تنظیمات ایجاد کنید.` 
      });
    }

    if (parentId) {
      const parent = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(parseInt(parentId)) as any;

      if (!parent) {
        return res.status(404).json({ 
          success: false, 
          error: 'یگان والد یافت نشد' 
        });
      }

      
      // بررسی سلسله‌مراتب داینامیک بر اساس تعاریف دیتابیس
      const orgLevels = sqlite.prepare('SELECT name FROM organizational_levels ORDER BY sort_order ASC').all() as any[];
      const levelIndex = orgLevels.findIndex((l: any) => l.name === level);
      
      if (levelIndex === -1) {
        return res.status(400).json({ success: false, error: 'سطح سازمانی نامعتبر است' });
      }

      if (levelIndex > 0 && orgLevels[levelIndex - 1].name !== parent.level) {
        return res.status(400).json({ 
          success: false, 
          error: `سلسله‌مراتب نامعتبر: "${level || level}" باید زیرمجموعه "${orgLevels[levelIndex - 1].name}" باشد.` 
        });
      }
    } else {
      const orgLevels = sqlite.prepare('SELECT name FROM organizational_levels ORDER BY sort_order ASC').all() as any[];
      const levelIndex = orgLevels.findIndex((l: any) => l.name === level);
      if (levelIndex > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `فقط سطح "${orgLevels[0]?.name}" می‌تواند بدون والد باشد.` 
        });
      }
    }

    // بررسی تکراری نبودن
    let checkQuery = 'SELECT * FROM bases WHERE name = ? AND level = ?';
    const checkParams: any[] = [name.trim(), level];
    
    if (parentId) {
      checkQuery += ' AND parent_id = ?';
      checkParams.push(parseInt(parentId));
    } else {
      checkQuery += ' AND parent_id IS NULL';
    }

    const existingBase = sqlite.prepare(checkQuery).get(...checkParams);

    if (existingBase) {
      return res.status(409).json({ 
        success: false, 
        error: `این نام "${name}" قبلاً ثبت شده است.` 
      });
    }

    // ایجاد یگان
    const stmt = sqlite.prepare(`
      INSERT INTO bases (name, location, level, parent_id, description, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      name.trim(),
      location || null,
      level,
      parentId ? parseInt(parentId) : null,
      description || null,
      1,
      0,
      now,
      now
    );

    const result = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(info.lastInsertRowid);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'پایگاه',
      entityId: (result as any).id,
      changes: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    console.error('Error creating base:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        success: false, 
        error: 'این نام قبلاً ثبت شده است' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

orgRoutes.put('/bases/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, level, parentId, description, isActive } = req.body;
    const now = new Date().toISOString();
    const baseId = parseInt(id);

    const oldData = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(baseId) as any;

    if (!oldData) {
      return res.status(404).json({ error: 'یگان یافت نشد' });
    }

    if (level && level !== oldData.level) {
      const levelExists = sqlite.prepare('SELECT * FROM organizational_levels WHERE name = ?').get(level);
      if (!levelExists) {
        return res.status(400).json({ error: 'سطح سازمانی نامعتبر است' });
      }
    }

    if (parentId !== undefined && parentId !== oldData.parent_id) {
      if (parentId) {
        const parent = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(parseInt(parentId)) as any;
        if (!parent) {
          return res.status(404).json({ error: 'والد یافت نشد' });
        }
        
        const checkLevel = level !== undefined && level !== null ? level : oldData.level;
        
        const orgLevels = sqlite.prepare('SELECT name FROM organizational_levels ORDER BY sort_order ASC').all() as any[];
        const levelIndex = orgLevels.findIndex((l: any) => l.name === checkLevel);
        
        if (levelIndex === -1) {
          return res.status(400).json({ error: 'سطح سازمانی نامعتبر است' });
        }

        if (levelIndex > 0 && orgLevels[levelIndex - 1].name !== parent.level) {
          return res.status(400).json({ 
            error: `سلسله‌مراتب نامعتبر: "${checkLevel}" باید زیرمجموعه "${orgLevels[levelIndex - 1].name}" باشد.` 
          });
        }
      } else {
        const checkLevel = level !== undefined && level !== null ? level : oldData.level;
        const orgLevels = sqlite.prepare('SELECT name FROM organizational_levels ORDER BY sort_order ASC').all() as any[];
        const levelIndex = orgLevels.findIndex((l: any) => l.name === checkLevel);
        
        if (levelIndex > 0) {
          return res.status(400).json({ 
            error: `فقط سطح "${orgLevels[0]?.name}" می‌تواند بدون والد باشد.` 
          });
        }
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location || null);
    }
    if (level !== undefined) {
      updates.push('level = ?');
      params.push(level);
    }
    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(parentId ? parseInt(parentId) : null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(baseId);

    const query = `UPDATE bases SET ${updates.join(', ')} WHERE id = ?`;
    sqlite.prepare(query).run(...params);

    const result = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(baseId);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'پایگاه',
      entityId: baseId,
      changes: { old: oldData, new: result },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating base:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        success: false, 
        error: 'این نام قبلاً ثبت شده است' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

orgRoutes.delete('/bases/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const baseId = parseInt(id);

    const existing = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(baseId);

    if (!existing) {
      return res.status(404).json({ error: 'یگان یافت نشد' });
    }

    const children = sqlite.prepare('SELECT * FROM bases WHERE parent_id = ?').all(baseId);

    if (children.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان دارای ${children.length} زیرمجموعه است. ابتدا زیرمجموعه‌ها را حذف کنید.`,
        children: children.map((c: any) => ({ id: c.id, name: c.name }))
      });
    }

    const unitsCount = sqlite.prepare('SELECT COUNT(*) as count FROM units WHERE base_id = ?').get(baseId);

    if (unitsCount && (unitsCount as any).count > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان دارای ${(unitsCount as any).count} یگان جزء است. ابتدا آنها را حذف کنید.`
      });
    }

    const usersCount = sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE base_id = ?').get(baseId);
    if (usersCount && (usersCount as any).count > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان به ${(usersCount as any).count} کاربر متصل است.`
      });
    }

    const treesCount = sqlite.prepare('SELECT COUNT(*) as count FROM knowledge_trees WHERE base_id = ?').get(baseId);
    if (treesCount && (treesCount as any).count > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان به ${(treesCount as any).count} درختواره متصل است.`
      });
    }

    sqlite.prepare('DELETE FROM bases WHERE id = ?').run(baseId);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'پایگاه',
      entityId: baseId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting base:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

// ============================================
// ۳. مدیریت یگان‌های جزء (units)
// ============================================

orgRoutes.get('/units', async (req, res) => {
  try {
    const { baseId, level } = req.query;
    
    let query = 'SELECT * FROM units';
    const conditions: string[] = [];
    const params: any[] = [];

    if (baseId) {
      conditions.push('base_id = ?');
      params.push(parseInt(baseId as string));
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sort_order ASC';

    const result = sqlite.prepare(query).all(...params);
    res.json(result);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

orgRoutes.get('/units/by-base/:baseId', async (req, res) => {
  try {
    const { baseId } = req.params;
    const result = sqlite.prepare('SELECT * FROM units WHERE base_id = ? ORDER BY sort_order ASC').all(parseInt(baseId));
    res.json(result);
  } catch (error) {
    console.error('Error fetching units by base:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

orgRoutes.post('/units', requireRole(['admin']), async (req, res) => {
  try {
    const { baseId, name, level, parentId, description } = req.body;
    const now = new Date().toISOString();

    if (!baseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'شناسه یگان اصلی الزامی است' 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'نام یگان جزء الزامی است' 
      });
    }

    const base = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(parseInt(baseId));

    if (!base) {
      return res.status(404).json({ 
        success: false, 
        error: 'یگان اصلی یافت نشد' 
      });
    }

    const stmt = sqlite.prepare(`
      INSERT INTO units (base_id, name, level, parent_id, description, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      parseInt(baseId),
      name.trim(),
      level || null,
      parentId || null,
      description || null,
      1,
      0,
      now,
      now
    );

    const result = sqlite.prepare('SELECT * FROM units WHERE id = ?').get(info.lastInsertRowid);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'CREATE',
      entityName: 'یگان جزء',
      entityId: (result as any).id,
      changes: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        success: false, 
        error: 'این نام قبلاً ثبت شده است' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

orgRoutes.put('/units/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { baseId, name, level, parentId, description, isActive } = req.body;
    const now = new Date().toISOString();
    const unitId = parseInt(id);

    const oldData = sqlite.prepare('SELECT * FROM units WHERE id = ?').get(unitId) as any;

    if (!oldData) {
      return res.status(404).json({ error: 'یگان جزء یافت نشد' });
    }

    if (level) {
      const levelExists = sqlite.prepare('SELECT * FROM organizational_levels WHERE name = ?').get(level);
      if (!levelExists) {
        return res.status(400).json({ error: 'سطح سازمانی نامعتبر است' });
      }
    }

    if (baseId) {
      const base = sqlite.prepare('SELECT * FROM bases WHERE id = ?').get(parseInt(baseId));
      if (!base) {
        return res.status(404).json({ error: 'یگان اصلی یافت نشد' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (baseId !== undefined) {
      updates.push('base_id = ?');
      params.push(parseInt(baseId));
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (level !== undefined) {
      updates.push('level = ?');
      params.push(level || null);
    }
    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(parentId || null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(unitId);

    const query = `UPDATE units SET ${updates.join(', ')} WHERE id = ?`;
    sqlite.prepare(query).run(...params);

    const result = sqlite.prepare('SELECT * FROM units WHERE id = ?').get(unitId);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'UPDATE',
      entityName: 'یگان جزء',
      entityId: unitId,
      changes: { old: oldData, new: result },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating unit:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        success: false, 
        error: 'این نام قبلاً ثبت شده است' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

orgRoutes.delete('/units/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const unitId = parseInt(id);

    const existing = sqlite.prepare('SELECT * FROM units WHERE id = ?').get(unitId);

    if (!existing) {
      return res.status(404).json({ 
        success: false,
        error: 'یگان جزء یافت نشد' 
      });
    }

    const childUnits = sqlite.prepare('SELECT * FROM units WHERE parent_id = ?').all(unitId);

    if (childUnits.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان جزء دارای ${childUnits.length} زیرمجموعه است. ابتدا آنها را حذف کنید.`
      });
    }

    const usersCountU = sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE unit_id = ?').get(unitId);
    if (usersCountU && (usersCountU as any).count > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان جزء به ${(usersCountU as any).count} کاربر متصل است.`
      });
    }

    const treesCountU = sqlite.prepare('SELECT COUNT(*) as count FROM knowledge_trees WHERE unit_id = ?').get(unitId);
    if (treesCountU && (treesCountU as any).count > 0) {
      return res.status(400).json({ 
        success: false,
        error: `این یگان جزء به ${(treesCountU as any).count} درختواره متصل است.`
      });
    }

    sqlite.prepare('DELETE FROM units WHERE id = ?').run(unitId);

    logAudit({
      userId: (req as AuthRequest).user?.id || null,
      action: 'DELETE',
      entityName: 'یگان جزء',
      entityId: unitId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطای سرور' 
    });
  }
});

export default orgRoutes;