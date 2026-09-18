import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/assetRoutes.ts
// مدیریت دارایی‌های دانشی (Assets) - نسخه ۳.۱ با پشتیبانی از نمونه‌های قالب

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import { knowledgeAssets, treeNodes, templates, knowledgeLevels, templateInstances } from '../../src/db/schema.js';
import { eq, and, like, desc, inArray, sql } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';

export const assetRoutes = Router();

// ============================================
// تنظیمات آپلود فایل
// ============================================

const uploadDir = path.join(process.cwd(), 'storage', 'assets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `asset-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع فایل ${file.mimetype} غیرمجاز است.`));
    }
  }
});

// ============================================
// ۱. دریافت لیست دارایی‌ها
// ============================================

assetRoutes.get('/', async (req, res) => {
  try {
    const { nodeId, templateId, levelId, search, page = 1, limit = 20 } = req.query;

    let query = db.select().from(knowledgeAssets);
    const conditions: any[] = [];

    if (nodeId) {
      conditions.push(eq(knowledgeAssets.nodeId, parseInt(nodeId as string)));
    }
    if (templateId) {
      conditions.push(eq(knowledgeAssets.templateId, parseInt(templateId as string)));
    }
    if (levelId) {
      conditions.push(eq(knowledgeAssets.levelId, parseInt(levelId as string)));
    }
    if (search) {
      conditions.push(like(knowledgeAssets.title, `%${search}%`));
    }

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(knowledgeAssets);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const totalResult = await countQuery;
    const total = totalResult[0].count;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const result = await query
      .limit(limitNum)
      .offset(offset)
      .orderBy(desc(knowledgeAssets.createdAt));

    // دریافت اطلاعات تکمیلی به صورت تجمیعی (Bulk Fetch)
    const nodeIds = [...new Set(result.map(a => a.nodeId).filter(Boolean))];
    const templateIds = [...new Set(result.map(a => a.templateId).filter(Boolean))] as number[];
    const levelIds = [...new Set(result.map(a => a.levelId).filter(Boolean))] as number[];

    const nodesList = nodeIds.length > 0 ? await db.select().from(treeNodes).where(inArray(treeNodes.id, nodeIds)) : [];
    const templatesList = templateIds.length > 0 ? await db.select().from(templates).where(inArray(templates.id, templateIds)) : [];
    const levelsList = levelIds.length > 0 ? await db.select().from(knowledgeLevels).where(inArray(knowledgeLevels.id, levelIds)) : [];

    const nodesMap = Object.fromEntries(nodesList.map(n => [n.id, n]));
    const templatesMap = Object.fromEntries(templatesList.map(t => [t.id, t]));
    const levelsMap = Object.fromEntries(levelsList.map(l => [l.id, l]));

    const enrichedAssets = result.map(asset => {
      const node = nodesMap[asset.nodeId];
      const template = asset.templateId ? templatesMap[asset.templateId] : null;
      const level = asset.levelId ? levelsMap[asset.levelId] : null;

      return {
        ...asset,
        node: node ? { id: node.id, title: node.title, level: node.level } : null,
        template: template ? { id: template.id, type: template.type, title: template.title } : null,
        level: level ? { id: level.id, name: level.name } : null,
      };
    });

    res.json({
      data: enrichedAssets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. دریافت یک دارایی
// ============================================

assetRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = parseInt(id);

    const asset = await db.query.knowledgeAssets.findFirst({
      where: eq(knowledgeAssets.id, assetId),
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const node = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, asset.nodeId),
    });
    const template = asset.templateId
      ? await db.query.templates.findFirst({
          where: eq(templates.id, asset.templateId),
        })
      : null;
    const level = asset.levelId
      ? await db.query.knowledgeLevels.findFirst({
          where: eq(knowledgeLevels.id, asset.levelId),
        })
      : null;

    res.json({
      ...asset,
      node: node ? { id: node.id, title: node.title, level: node.level } : null,
      template: template ? { id: template.id, type: template.type, title: template.title } : null,
      level: level ? { id: level.id, name: level.name } : null,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۳. ایجاد دارایی جدید (با آپلود فایل)
// ============================================

assetRoutes.post('/', upload.single('file'), async (req, res) => {
  try {
    const { nodeId, title, templateId, levelId, description, metadata } = req.body;
    const now = new Date().toISOString();

    if (req.file) {
      const isTextFile = ['text/plain', 'text/csv'].includes(req.file.mimetype);
      if (!isTextFile) {
        const allowed = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        const meta = await fileTypeFromFile(req.file.path);
        if (!meta || !allowed.includes(meta.mime)) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: 'محتوای فایل نامعتبر است (MIME Spoofing detected)' });
        }
      }
    }

    const userId = (req as AuthRequest).user?.id || null;

    if (!nodeId || !title) {
      return res.status(400).json({ error: 'شناسه گره و عنوان دارایی الزامی است' });
    }

    const node = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, parseInt(nodeId)),
    });

    if (!node) {
      return res.status(404).json({ error: 'گره یافت نشد' });
    }

    const assetData: any = {
      nodeId: parseInt(nodeId),
      title: title.trim(),
      templateId: templateId ? parseInt(templateId) : null,
      levelId: levelId ? parseInt(levelId) : null,
      description: description || null,
      metadata: metadata || null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    if (req.file) {
      const relativePath = `/storage/assets/${req.file.filename}`;
      assetData.filePath = relativePath;
      assetData.fileType = req.file.mimetype;
      assetData.fileSize = req.file.size;
    }

    const result = await db.insert(knowledgeAssets).values(assetData).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'دارایی دانشی',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating asset:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۴. ویرایش دارایی
// ============================================

assetRoutes.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = parseInt(id);
    const { nodeId, title, templateId, levelId, description, status, metadata } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const oldData = await db.query.knowledgeAssets.findFirst({
      where: eq(knowledgeAssets.id, assetId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const updateData: any = {
      nodeId: nodeId ? parseInt(nodeId) : oldData.nodeId,
      title: title !== undefined && title !== null ? title : oldData.title,
      templateId: templateId !== undefined ? (templateId ? parseInt(templateId) : null) : oldData.templateId,
      levelId: levelId !== undefined ? (levelId ? parseInt(levelId) : null) : oldData.levelId,
      description: description !== undefined ? description : oldData.description,
      status: status !== undefined && status !== null ? status : oldData.status,
      metadata: metadata !== undefined ? metadata : oldData.metadata,
      updatedAt: now,
    };

    if (req.file) {
      if (oldData.filePath) {
        const oldFilePath = path.join(process.cwd(), oldData.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      const relativePath = `/storage/assets/${req.file.filename}`;
      updateData.filePath = relativePath;
      updateData.fileType = req.file.mimetype;
      updateData.fileSize = req.file.size;
    }

    const result = await db.update(knowledgeAssets)
      .set(updateData)
      .where(eq(knowledgeAssets.id, assetId))
      .returning();

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'دارایی دانشی',
      entityId: assetId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating asset:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۵. حذف دارایی
// ============================================

assetRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    const existing = await db.query.knowledgeAssets.findFirst({
      where: eq(knowledgeAssets.id, assetId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.transaction((tx) => {
      tx.delete(knowledgeAssets).where(eq(knowledgeAssets.id, assetId)).run();
    });

    if (existing.filePath) {
      const filePath = path.join(process.cwd(), existing.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'دارایی دانشی',
      entityId: assetId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۶. دانلود فایل دارایی
// ============================================

assetRoutes.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const assetId = parseInt(id);

    const asset = await db.query.knowledgeAssets.findFirst({
      where: eq(knowledgeAssets.id, assetId),
    });

    if (!asset || !asset.filePath) {
      return res.status(404).json({ error: 'فایل یافت نشد' });
    }

    const filePath = path.join(process.cwd(), asset.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'فایل یافت نشد' });
    }

    res.download(filePath, path.basename(asset.filePath));
  } catch (error) {
    console.error('Error downloading asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۷. دریافت نمونه‌های قالب برای یک گره
// ============================================

assetRoutes.get('/instances/by-node/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const nodeIdNum = parseInt(nodeId);

    const node = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, nodeIdNum),
    });

    if (!node) {
      return res.status(404).json({ error: 'گره یافت نشد' });
    }

    if (node.instanceIds) {
      const ids = node.instanceIds.split(',').filter(Boolean).map(id => parseInt(id));
      if (ids.length > 0) {
        const instances = await db.select()
          .from(templateInstances)
          .where(inArray(templateInstances.id, ids));
        
        return res.json(instances);
      }
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching instances by node:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۸. دریافت همه نمونه‌های قالب
// ============================================

assetRoutes.get('/instances', async (req, res) => {
  try {
    const { templateId, search } = req.query;
    
    let query = db.select().from(templateInstances);
    const conditions: any[] = [];

    if (templateId) {
      conditions.push(eq(templateInstances.templateId, parseInt(templateId as string)));
    }
    if (search) {
      conditions.push(like(templateInstances.title, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(templateInstances.createdAt);
    res.json(result);
  } catch (error) {
    console.error('Error fetching instances:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۹. ایجاد نمونه قالب جدید
// ============================================

assetRoutes.post('/instances', async (req, res) => {
  try {
    const { templateId, title, referenceCode, description } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!templateId || !title) {
      return res.status(400).json({ error: 'شناسه قالب و عنوان نمونه الزامی است' });
    }

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, parseInt(templateId)),
    });

    if (!template) {
      return res.status(404).json({ error: 'قالب یافت نشد' });
    }

    const result = await db.insert(templateInstances).values({
      templateId: parseInt(templateId),
      title: title.trim(),
      referenceCode: referenceCode || null,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'نمونه قالب',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default assetRoutes;