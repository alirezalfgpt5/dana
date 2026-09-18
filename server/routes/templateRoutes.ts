import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/templateRoutes.ts
// مدیریت قالب‌ها (Templates) - با لاگ‌های خطا فعال و لاگ‌های موفقیت غیرفعال

import { Router } from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { templates, knowledgeAssets, issueTemplates } from '../../src/db/schema.js';
import { eq, and, like, desc, sql, isNull } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';

export const templateRoutes = Router();

// ============================================
// ۱. دریافت لیست قالب‌ها
// ============================================

templateRoutes.get('/', async (req, res) => {
  try {
    const { type, isActive, search, parentId } = req.query;

    let query = db.select().from(templates);
    const conditions: any[] = [];

    if (type) {
      conditions.push(eq(templates.type, type as string));
    }
    if (isActive !== undefined) {
      conditions.push(eq(templates.isActive, parseInt(isActive as string)));
    }
    if (search) {
      conditions.push(like(templates.title, `%${search}%`));
    }
    if (parentId !== undefined) {
      if (parentId === 'null') {
        conditions.push(isNull(templates.parentId));
      } else {
        conditions.push(eq(templates.parentId, parseInt(parentId as string)));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(templates.sortOrder);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. دریافت یک قالب
// ============================================

templateRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const children = await db.select()
      .from(templates)
      .where(eq(templates.parentId, templateId))
      .orderBy(templates.sortOrder);

    const assetCount = await db.select({ count: sql<number>`count(*)` })
      .from(knowledgeAssets)
      .where(eq(knowledgeAssets.templateId, templateId));

    const issueCount = await db.select({ count: sql<number>`count(*)` })
      .from(issueTemplates)
      .where(eq(issueTemplates.templateId, templateId));

    res.json({
      ...template,
      children,
      usageCount: {
        assets: assetCount[0]?.count || 0,
        issues: issueCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۳. دریافت انواع قالب (یکتا)
// ============================================

templateRoutes.get('/types', async (req, res) => {
  try {
    const result = await db.selectDistinct({ type: templates.type }).from(templates);
    res.json(result.map((t) => t.type));
  } catch (error) {
    console.error('❌ Error fetching template types:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۴. ایجاد قالب جدید
// ============================================

templateRoutes.post('/', async (req, res) => {
  try {
    const { type, title, parentId, description, sortOrder, metadata } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!type || !title) {
      return res.status(400).json({ error: 'نوع و عنوان قالب الزامی است' });
    }

    const existing = await db.query.templates.findFirst({
      where: and(
        eq(templates.type, type),
        eq(templates.title, title)
      ),
    });

    if (existing) {
      return res.status(409).json({ error: 'این قالب قبلاً ثبت شده است' });
    }

    if (parentId) {
      const parent = await db.query.templates.findFirst({
        where: eq(templates.id, parseInt(parentId)),
      });
      if (!parent) {
        return res.status(404).json({ error: 'والد یافت نشد' });
      }
    }

    const result = await db.insert(templates).values({
      type: type.trim(),
      title: title.trim(),
      parentId: parentId || null,
      description: description || null,
      sortOrder: sortOrder || 0,
      isActive: 1,
      metadata: metadata || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'قالب',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۵. ویرایش قالب
// ============================================

templateRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);
    const { type, title, parentId, description, sortOrder, isActive, metadata } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const oldData = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (title && title !== oldData.title) {
      const existing = await db.query.templates.findFirst({
        where: and(
          eq(templates.type, type !== undefined && type !== null ? type : oldData.type),
          eq(templates.title, title)
        ),
      });
      if (existing) {
        return res.status(409).json({ error: 'این قالب قبلاً ثبت شده است' });
      }
    }

    if (parentId !== undefined && parentId !== null) {
      const parent = await db.query.templates.findFirst({
        where: eq(templates.id, parseInt(parentId)),
      });
      if (!parent) {
        return res.status(404).json({ error: 'والد یافت نشد' });
      }
      if (parseInt(parentId) === templateId) {
        return res.status(400).json({ error: 'یک قالب نمی‌تواند والد خود باشد' });
      }
    }

    const result = await db.update(templates)
      .set({
        type: type !== undefined && type !== null ? type : oldData.type,
        title: title !== undefined && title !== null ? title : oldData.title,
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : oldData.parentId,
        description: description !== undefined ? description : oldData.description,
        sortOrder: sortOrder !== undefined ? sortOrder : oldData.sortOrder,
        isActive: isActive !== undefined ? isActive : oldData.isActive,
        metadata: metadata !== undefined ? metadata : oldData.metadata,
        updatedAt: now,
      })
      .where(eq(templates.id, templateId))
      .returning();

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'قالب',
      entityId: templateId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۶. حذف قالب - با لاگ‌های خطا فعال و لاگ‌های موفقیت غیرفعال
// ============================================

templateRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);
    
    // ============================================
    // مرحله 1: بررسی وجود قالب
    // ============================================
    let existing = null;
    try {
      const sql = `SELECT * FROM templates WHERE id = ?`;
      existing = sqlite.prepare(sql).get(templateId);
    } catch (err) {
      console.error('❌ [DELETE] Error checking template existence:', err);
      return res.status(500).json({ error: 'خطای سرور' });
    }
    
    if (!existing) {
      console.error('❌ [DELETE] Template not found:', templateId);
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // ============================================
    // مرحله 2: بررسی زیرمجموعه‌ها
    // ============================================
    let children = [];
    try {
      const sql = `SELECT * FROM templates WHERE parent_id = ?`;
      children = sqlite.prepare(sql).all(templateId);
    } catch (err) {
      console.error('❌ [DELETE] Error checking children:', err);
      return res.status(500).json({ error: 'خطای سرور' });
    }
    
    if (children.length > 0) {
      console.error(`❌ [DELETE] Template has ${children.length} children, cannot delete:`, templateId);
      return res.status(400).json({ 
        error: 'این قالب دارای زیرمجموعه است، ابتدا زیرمجموعه‌ها را حذف کنید',
        children: children.map((c: any) => ({ id: c.id, title: c.title })),
      });
    }
    
    // ============================================
    // مرحله 3: بررسی استفاده در دارایی‌ها
    // ============================================
    let assets = [];
    try {
      const sql = `SELECT * FROM knowledge_assets WHERE template_id = ?`;
      assets = sqlite.prepare(sql).all(templateId);
    } catch (err) {
      console.error('❌ [DELETE] Error checking assets:', err);
      return res.status(500).json({ error: 'خطای سرور' });
    }
    
    if (assets.length > 0) {
      console.error(`❌ [DELETE] Template used in ${assets.length} assets, cannot delete:`, templateId);
      return res.status(400).json({ 
        error: 'این قالب در دارایی‌های دانشی استفاده شده است',
        count: assets.length,
      });
    }
    
    // ============================================
    // مرحله 4: بررسی استفاده در مسائل
    // ============================================
    let issueTemplatesList = [];
    try {
      const sql = `SELECT * FROM issue_templates WHERE template_id = ?`;
      issueTemplatesList = sqlite.prepare(sql).all(templateId);
    } catch (err) {
      console.error('❌ [DELETE] Error checking issue templates:', err);
      return res.status(500).json({ error: 'خطای سرور' });
    }
    
    if (issueTemplatesList.length > 0) {
      console.error(`❌ [DELETE] Template used in ${issueTemplatesList.length} issues, cannot delete:`, templateId);
      return res.status(400).json({ 
        error: 'این قالب در نظام مسائل استفاده شده است',
        count: issueTemplatesList.length,
      });
    }
    
    // ============================================
    // مرحله 5: حذف قالب و پاکسازی داده‌های زامبی (Fix Item 43)
    // ============================================
    let deleteResult = null;
    try {
      // پاکسازی از فیلد متنی template_ids در tree_nodes
      const nodesSql = `SELECT id, template_ids FROM tree_nodes WHERE template_ids IS NOT NULL AND template_ids != ''`;
      const allNodes = sqlite.prepare(nodesSql).all();
      
      const updateNodeSql = sqlite.prepare(`UPDATE tree_nodes SET template_ids = ? WHERE id = ?`);
      const updateTx = sqlite.transaction((nodesToUpdate: any[]) => {
        for (const node of nodesToUpdate) {
          updateNodeSql.run(node.newIds, node.id);
        }
      });
      
      const nodesToUpdate = [];
      for (const node of allNodes as any[]) {
        if (!node.template_ids) continue;
        const ids = String(node.template_ids).split(',').filter(Boolean);
        if (ids.includes(String(templateId))) {
          const newIds = ids.filter(i => i !== String(templateId)).join(',');
          nodesToUpdate.push({ id: node.id, newIds });
        }
      }
      
      if (nodesToUpdate.length > 0) {
        updateTx(nodesToUpdate);
        console.log(`🧹 Cleaned up zombie template ${templateId} from ${nodesToUpdate.length} tree nodes.`);
      }

      // حذف فیزیکی رکورد
      const sql = `DELETE FROM templates WHERE id = ?`;
      deleteResult = sqlite.prepare(sql).run(templateId);
    } catch (err) {
      console.error('❌ [DELETE] Error deleting template or cleaning zombies:', err);
      return res.status(500).json({ error: 'خطای سرور' });
    }
    
    // ============================================
    // مرحله 6: ثبت لاگ - خطاها لاگ می‌شوند
    // ============================================
    try {
      logAudit({
        userId: (req as AuthRequest).user?.id || null,
        action: 'DELETE',
        entityName: 'قالب',
        entityId: templateId,
        changes: existing,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (err) {
      console.error('❌ [DELETE] Error saving audit log:', err);
      // لاگ خطا را نادیده می‌گیریم چون عملیات اصلی انجام شده
    }
    
    // پاسخ موفقیت - بدون لاگ
    return res.json({ success: true, message: 'قالب با موفقیت حذف شد' });
    
  } catch (error) {
    console.error('❌ [DELETE] Unhandled error:', error);
    return res.status(500).json({ error: 'خطای سرور' });
  }
});

// ============================================
// ۷. دریافت آمار قالب‌ها
// ============================================

templateRoutes.get('/stats', async (req, res) => {
  try {
    const allTemplates = await db.select().from(templates);

    const stats = await Promise.all(
      allTemplates.map(async (template) => {
        const assetCount = await db.select({ count: sql<number>`count(*)` })
          .from(knowledgeAssets)
          .where(eq(knowledgeAssets.templateId, template.id));

        const issueCount = await db.select({ count: sql<number>`count(*)` })
          .from(issueTemplates)
          .where(eq(issueTemplates.templateId, template.id));

        return {
          id: template.id,
          type: template.type,
          title: template.title,
          assetCount: assetCount[0]?.count || 0,
          issueCount: issueCount[0]?.count || 0,
          totalUsage: (assetCount[0]?.count || 0) + (issueCount[0]?.count || 0),
          isActive: template.isActive,
        };
      })
    );

    const total = allTemplates.length;
    const active = allTemplates.filter((t) => t.isActive === 1).length;
    const totalUsage = stats.reduce((sum, s) => sum + s.totalUsage, 0);

    const byType = stats.reduce((acc: Record<string, number>, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total,
      active,
      inactive: total - active,
      totalUsage,
      byType,
      details: stats,
    });
  } catch (error) {
    console.error('❌ Error fetching template stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default templateRoutes;