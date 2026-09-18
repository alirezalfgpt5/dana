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

const STORAGE_DIR = path.join(process.cwd(), 'storage');

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

// تنظیمات multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const module = req.body.module || 'general';
    // Prevent path traversal
    const safeModule = module.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '');
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

    const relativePath = `/storage/${req.body.module || 'general'}/${req.file.filename}`;
    
    // ذخیره در دیتابیس
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
      req.body.module || 'general',
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
    if (req.file && fs.existsSync((req as AuthRequest).file.path)) fs.unlinkSync((req as AuthRequest).file.path);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// GET all files
fileRoutes.get('/', (req, res) => {
  try {
    const files = sqlite.prepare(`
      SELECT id, name, path, size, type, mime_type, module, module_id, created_at, updated_at
      FROM files ORDER BY created_at DESC
    `).all();

    const totalSize = files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);

    res.json({ files, total: files.length, totalSize });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'خطا در خواندن فایل‌ها' });
  }
});

// GET download file
fileRoutes.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const file = sqlite.prepare(`SELECT path FROM files WHERE name = ?`).get(filename);
    if (!file) return res.status(404).json({ error: 'فایل یافت نشد' });

    const filePath = path.join(process.cwd(), (file as any).path);
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
    const filename = req.params.filename;
    const file = sqlite.prepare(`SELECT path FROM files WHERE name = ?`).get(filename);
    if (!file) return res.status(404).json({ error: 'فایل یافت نشد' });

    const filePath = path.join(process.cwd(), (file as any).path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    sqlite.prepare(`DELETE FROM files WHERE name = ?`).run(filename);

    logAudit({ userId: (req as AuthRequest).user?.id || null, action: 'DELETE', entityName: 'فایل', entityId: Number((file as any).id || 0), changes: { name: filename }, ip: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ success: true, message: 'فایل با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'خطا در حذف فایل' });
  }
});