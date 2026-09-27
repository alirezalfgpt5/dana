// server/routes/issues/issueAttachments.ts
// مدیریت چرخه حیات پیوست‌ها با کنترل دسترسی سازمانی، دانلود امن و جلوگیری از MIME Spoofing

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';
import { db } from '../../../src/db/index.js';
import { issues, issueAttachments, periods } from '../../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { logAudit } from '../../utils/audit.js';
import { AuthRequest } from '../../types/AuthRequest.js';
import { hasIssueAccess } from './issueAccess.js';

export const attachmentRouter = Router();

const uploadDir = path.join(process.cwd(), 'storage', 'issues');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const issueId = req.params.id || 'general';
    const folder = path.join(process.cwd(), 'storage', 'issues', String(issueId));
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `issue-${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'
];

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع فایل ${file.mimetype} غیرمجاز است.`));
    }
  },
});

/**
 * آپلود فایل پیوست برای مسئله با کنترل دسترسی سازمانی
 */
attachmentRouter.post('/:id/attachment', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const fieldTag = req.body?.field || req.body?.tag || null;

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است' });
    }

    // بررسی دسترسی سازمانی کاربر به مسئله
    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'شما دسترسی لازم برای افزودن پیوست به این مسئله را ندارید.' });
    }

    // اعتبارسنجی نوع واقعی محتوا (MIME Spoofing prevention)
    const isTextFile = ['text/plain', 'text/csv'].includes(req.file.mimetype);
    if (!isTextFile) {
      const meta = await fileTypeFromFile(req.file.path);
      if (!meta || !allowedMimes.includes(meta.mime)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'محتوای فایل نامعتبر است (MIME Spoofing detected)' });
      }
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!issue) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    // بررسی خاتمه دوره زمانی مسئله
    if (issue.periodId) {
      const currentPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, issue.periodId),
      });
      if (currentPeriod && (currentPeriod.isComplete === 1 || (currentPeriod as any).status === 'completed' || (currentPeriod as any).status === 'archived')) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'دوره زمانی این مسئله خاتمه‌یافته یا فریز گردیده است و امکان افزودن پیوست وجود ندارد.' });
      }
    }

    const fileNameWithTag = fieldTag ? `[${fieldTag}] ${req.file.originalname}` : req.file.originalname;

    const result = await db.insert(issueAttachments).values({
      issueId,
      filePath: req.file.path,
      fileName: fileNameWithTag,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'فایل پیوست مسئله',
      entityId: result[0].id,
      changes: { fileName: fileNameWithTag, fileSize: req.file.size, issueId, fieldTag },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Error adding attachment:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

/**
 * دانلود امن فایل پیوست با اعتبارسنجی دسترسی سازمانی
 */
attachmentRouter.get('/:id/attachment/:attachmentId/download', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const issueId = parseInt(id);
    const attachmentIdNum = parseInt(attachmentId);
    const user = (req as AuthRequest).user;

    // بررسی دسترسی سازمانی به مسئله
    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای دریافت این فایل را ندارید.' });
    }

    const attachment = await db.query.issueAttachments.findFirst({
      where: eq(issueAttachments.id, attachmentIdNum),
    });

    if (!attachment || attachment.issueId !== issueId) {
      return res.status(404).json({ error: 'فایل پیوست یافت نشد.' });
    }

    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ error: 'فایل روی دیسک یافت نشد.' });
    }

    // نام فایل تمیز برای دانلود
    const cleanFileName = attachment.fileName.replace(/^\[[^\]]+\]\s*/, '');
    res.download(attachment.filePath, cleanFileName);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'خطا در دانلود فایل پیوست' });
  }
});

/**
 * حذف فایل پیوست با کنترل دسترسی سازمانی
 */
attachmentRouter.delete('/:issueId/attachment/:attachmentId', async (req, res) => {
  try {
    const { issueId, attachmentId } = req.params;
    const issueIdNum = parseInt(issueId);
    const attachmentIdNum = parseInt(attachmentId);
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;

    // بررسی دسترسی سازمانی
    const hasAccess = await hasIssueAccess(user, issueIdNum);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای حذف پیوست این مسئله را ندارید.' });
    }

    const attachment = await db.query.issueAttachments.findFirst({
      where: eq(issueAttachments.id, attachmentIdNum),
    });

    if (!attachment || attachment.issueId !== issueIdNum) {
      return res.status(404).json({ error: 'فایل پیوست یافت نشد' });
    }

    const parentIssue = await db.query.issues.findFirst({
      where: eq(issues.id, issueIdNum),
    });

    if (parentIssue?.periodId) {
      const currentPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, parentIssue.periodId),
      });
      if (currentPeriod && (currentPeriod.isComplete === 1 || (currentPeriod as any).status === 'completed' || (currentPeriod as any).status === 'archived')) {
        return res.status(400).json({ error: 'دوره زمانی این مسئله خاتمه‌یافته یا فریز گردیده است و امکان حذف پیوست وجود ندارد.' });
      }
    }

    if (fs.existsSync(attachment.filePath)) {
      try {
        fs.unlinkSync(attachment.filePath);
      } catch (err) {
        console.warn('Could not delete physical file:', err);
      }
    }

    await db.delete(issueAttachments).where(eq(issueAttachments.id, attachmentIdNum));

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'فایل پیوست مسئله',
      entityId: attachmentIdNum,
      changes: { fileName: attachment.fileName, issueId: issueIdNum },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'فایل پیوست با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'خطا در حذف فایل پیوست' });
  }
});
