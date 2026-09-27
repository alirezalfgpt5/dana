import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/files.ts
// مدیریت فایل‌ها - با ساختار ذخیره‌سازی جدید

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileTypeFromFile } from 'file-type';
import { db, sqlite } from '../../src/db/index.js';
import { logAudit } from '../utils/audit.js';
import { requireAuth } from '../middleware/rbac.js';

export const fileRoutes = Router();

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');

// اطمینان از وجود پوشه‌ها
const ensureDirectories = () => {
  const dirs = [
    STORAGE_DIR,
    path.join(STORAGE_DIR, 'issues'),
    path.join(STORAGE_DIR, 'assets'),
    path.join(STORAGE_DIR, 'trees'),
    path.join(STORAGE_DIR, 'exports'),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
};
ensureDirectories();

// پاکسازی نام ماژول جهت جلوگیری از Directory Traversal و ناهماهنگی مسیر دیتابیس با دیسک
export const sanitizeModuleName = (moduleInput?: any): string => {
  if (!moduleInput || typeof moduleInput !== 'string') return 'general';
  const cleaned = moduleInput.replace(/\.\./g, '').replace(/[/\\?%*:|"<>]/g, '').trim();
  return cleaned || 'general';
};

// تنظیمات multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const safeModule = sanitizeModuleName(req.body.module);
    (req as any).safeModule = safeModule;
    const moduleDir = path.join(STORAGE_DIR, safeModule);
    if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });
    cb(null, moduleDir);
  },
  filename: (req, file, cb) => {
    const prefix = req.body.prefix || Date.now().toString();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${prefix}_${safeName}`);
  }
});

// Allowed file types
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`نوع فایل ${file.mimetype} مجاز نیست. لطفاً فقط تصاویر یا مستندات معتبر آپلود کنید.`));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
});

// POST upload file
fileRoutes.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است' });

    const isTextFile = ['text/plain', 'text/csv'].includes(req.file.mimetype);
    if (!isTextFile) {
      const meta = await fileTypeFromFile(req.file.path);
      if (!meta || !allowedMimeTypes.includes(meta.mime)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'محتوای فایل نامعتبر است (MIME Spoofing detected)' });
      }
    }

    const safeModule = (req as any).safeModule || sanitizeModuleName(req.body.module);
    const relativePath = `/storage/${safeModule}/${req.file.filename}`;
    
    // ذخیره در دیتابیس با مسیر و ماژول پاکسازی‌شده و منطبق بر محل ذخیره‌سازی واقعی
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO files (name, path, size, type, mime_type, module, module_id, uploaded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      req.file.filename,
      relativePath,
      req.file.size,
      req.file.mimetype.split('/')[0],
      req.file.mimetype,
      safeModule,
      req.body.moduleId || null,
      (req as AuthRequest).user?.id || null,
      now,
      now
    );

    logAudit({ userId: (req as AuthRequest).user?.id || null, action: 'CREATE', entityName: 'فایل', entityId: Number(result.lastInsertRowid), changes: { name: req.file.originalname, path: relativePath }, ip: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ 
      success: true,
      message: 'فایل با موفقیت آپلود شد',
      path: relativePath,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync((req as AuthRequest).file?.path)) fs.unlinkSync((req as AuthRequest).file.path);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// GET all files
fileRoutes.get('/', requireAuth, (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت الزامی است' });
    }

    const role = user.role || '';
    const isPrivileged = ['superadmin', 'admin', 'knowledge_manager', 'expert'].includes(role);

    let files: any[];
    if (isPrivileged) {
      files = sqlite.prepare(`
        SELECT id, name, path, size, type, mime_type, module, module_id, uploaded_by, created_at, updated_at
        FROM files ORDER BY created_at DESC
      `).all();
    } else {
      files = sqlite.prepare(`
        SELECT id, name, path, size, type, mime_type, module, module_id, uploaded_by, created_at, updated_at
        FROM files WHERE uploaded_by = ? OR uploaded_by IS NULL ORDER BY created_at DESC
      `).all(user.id);
    }

    const totalSize = files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);

    res.json({ files, total: files.length, totalSize });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'خطا در خواندن فایل‌ها' });
  }
});

// GET download file (با احراز هویت، کنترل سطح دسترسی و حفاظت در برابر Path Traversal)
fileRoutes.get('/download/:filename', requireAuth, (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت الزامی است' });
    }

    const filename = path.basename(req.params.filename);
    const file = sqlite.prepare(`SELECT * FROM files WHERE name = ?`).get(filename) as any;
    if (!file) return res.status(404).json({ error: 'فایل یافت نشد' });

    // کنترل سطح دسترسی (Access Control)
    const role = user.role || '';
    const isSuperOrAdmin = ['superadmin', 'admin'].includes(role);
    const isDomainManager = ['knowledge_manager', 'expert'].includes(role);
    const isOwner = file.uploaded_by !== null && file.uploaded_by !== undefined && Number(file.uploaded_by) === Number(user.id);
    const isPublicExport = file.uploaded_by === null && ['exports', 'general'].includes(file.module);

    if (!isSuperOrAdmin && !isDomainManager && !isOwner && !isPublicExport) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز: شما اجازه دانلود این سند را ندارید' });
    }

    const cleanPath = String(file.path).replace(/^\/+/, '');
    const filePath = path.resolve(process.cwd(), cleanPath);
    const allowedBase = path.resolve(process.cwd());

    if (!filePath.startsWith(allowedBase)) {
      return res.status(403).json({ error: 'مسیر فایل غیرمجاز است' });
    }

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'فایل یافت نشد' });

    res.download(filePath, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'خطا در دانلود فایل' });
  }
});

// DELETE file
fileRoutes.delete('/:filename', requireAuth, (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت الزامی است' });
    }

    const filename = path.basename(req.params.filename);
    const file = sqlite.prepare(`SELECT * FROM files WHERE name = ?`).get(filename) as any;
    if (!file) return res.status(404).json({ error: 'فایل یافت نشد' });

    const role = user.role || '';
    const isPrivileged = ['superadmin', 'admin'].includes(role);
    const isOwner = file.uploaded_by !== null && file.uploaded_by !== undefined && Number(file.uploaded_by) === Number(user.id);

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای حذف این فایل را ندارید' });
    }

    const cleanPath = String(file.path).replace(/^\/+/, '');
    const filePath = path.resolve(process.cwd(), cleanPath);
    if (filePath.startsWith(path.resolve(process.cwd())) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    sqlite.prepare(`DELETE FROM files WHERE name = ?`).run(filename);

    logAudit({ userId: user.id, action: 'DELETE', entityName: 'فایل', entityId: Number(file.id || 0), changes: { name: filename }, ip: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ success: true, message: 'فایل با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'خطا در حذف فایل' });
  }
});