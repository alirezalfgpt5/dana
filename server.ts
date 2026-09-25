import helmet from 'helmet';
// server.ts
// سرور اصلی برنامه - سیستم مدیریت دانش (DANA)

import express from 'express';
import http from 'http';

import path from 'path';
import cors from 'cors';
import { initDb, db } from './src/db/index.js';
import { users, knowledgeTrees, treeNodes, gaps, issues } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import fs from 'fs';
const app = express();
// frameguard غیرفعال می‌شود تا برنامه در iframe پنل پیش‌نمایش پلتفرم قابل بارگذاری باشد
// (بدون این تنظیم، مرورگر با خطای «refused to connect» iframe را رد می‌کند)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, frameguard: false }));
app.set('trust proxy', 1); // Trust first proxy for express-rate-limit

// ============================================
// سیستم لاگینگ هوشمند، جلوگیری از تکرار لاگ‌ها و مدیریت استثناها
// ============================================
import { logger, setupProcessExceptionHandlers } from './server/utils/logger.js';
import { freePort, listenWithAutoPortRecovery, setupGracefulShutdown } from './server/utils/portManager.js';
logger.patchConsole();
setupProcessExceptionHandlers();

// پورت سرور برنامه باید 3000 باشد (پورت 8080 مربوط به پروکسی معکوس Nginx است)
let targetPort = 3000;
const portEq = process.argv.find(arg => arg.startsWith('--port='));
const portArgIndex = process.argv.indexOf('--port');
if (portEq) {
  targetPort = parseInt(portEq.split('=')[1], 10);
} else if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  targetPort = parseInt(process.argv[portArgIndex + 1], 10);
} else {
  const numericArg = process.argv.find(arg => /^\d{4,5}$/.test(arg));
  if (numericArg && numericArg !== '8080') {
    targetPort = parseInt(numericArg, 10);
  } else if (process.env.APP_PORT) {
    targetPort = parseInt(process.env.APP_PORT, 10);
  } else if (process.env.PORT && process.env.PORT !== '8080' && process.env.PORT !== '8000') {
    targetPort = parseInt(process.env.PORT, 10);
  }
}
const PORT = targetPort;

const currentDir = process.cwd();

// ============================================
// Import Routes
// ============================================

import { metadataRoutes } from './server/routes/metadataRoutes.js';
import { treeRoutes } from './server/routes/treeRoutes.js';
import { templateRoutes } from './server/routes/templateRoutes.js';
import { roleRoutes } from "./server/routes/roles.js";
import { levelRoutes } from './server/routes/levelRoutes.js';
import { assetRoutes } from './server/routes/assetRoutes.js';
import { gapRoutes } from './server/routes/gapRoutes.js';
import { mergeRoutes } from './server/routes/mergeRoutes.js';
import { researchRoutes } from './server/routes/researchRoutes.js';
import { issueRoutes } from './server/routes/issueRoutes.js';
import { outputRoutes } from './server/routes/outputRoutes.js';
import { orgRoutes } from './server/routes/org.js';
import { userRoutes } from './server/routes/users.js';
import { periodRoutes } from './server/routes/periods.js';
import { fileRoutes } from './server/routes/files.js';
import { unitDataExchangeRoutes } from './server/routes/unitDataExchangeRoutes.js';
import { auditRoutes } from './server/routes/audit.js';
import { searchRoutes } from './server/routes/searchRoutes.js';
import { reportRoutes } from './server/routes/reportRoutes.js';
import { dynamicFieldsRoutes } from './server/routes/dynamicFieldsRoutes.js';
import { logAudit } from './server/utils/audit.js';
import { requireAuth } from './server/middleware/rbac.js';

// ============================================
// Middleware
// ============================================

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// پوشه‌ها
// ============================================

const dirs = [
  'uploads', 'storage', 'storage/issues', 'storage/assets', 
  'storage/trees', 'storage/exports', 'backups'
];
dirs.forEach(dir => {
  const p = path.join(currentDir, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ============================================
// دیتابیس
// ============================================

initDb();

// ایجاد کاربر ادمین
async function setupAdmin() {
  try {
    const admin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });
    if (!admin) {
      const hashed = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        username: 'admin',
        password: hashed,
        fullName: 'مدیر کل سیستم',
        role: 'superadmin',
        organizationLevel: 'آجا',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {}
}

setupAdmin();

// ============================================
// API Routes
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});


import crypto from 'crypto';
import jwt from 'jsonwebtoken';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const secretPath = path.join(currentDir, '.jwtsecret');
  if (fs.existsSync(secretPath)) {
    JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
  } else {
    JWT_SECRET = crypto.randomUUID();
    fs.writeFileSync(secretPath, JWT_SECRET, 'utf8');
  }
}

const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || '86400';

app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Verify real JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        const user = await db.query.users.findFirst({
          where: (users, { eq, and }) => and(eq(users.id, decoded.id), eq(users.isActive, 1))
        });
        if (user) {
          // Fix Item 46: Token Replay Vulnerability & Stateless JWT Invalidation
          let isTokenValid = true;
          if (decoded.iat && user.updatedAt) {
            const tokenIssuedAt = decoded.iat * 1000;
            const userUpdatedAt = new Date(user.updatedAt).getTime();
            // If token is older than the last user update (e.g., password change), invalidate it
            if (tokenIssuedAt < userUpdatedAt - 2000) {
              isTokenValid = false;
              console.warn(`Token invalidated for user ${user.username} due to credential change`);
            }
          }
          if (isTokenValid) {
            (req as any).user = user;
          }
        }
      }
    } catch (err: any) {
      // ⚠️ بدون لاگ برای توکن‌های منقضی — جلوی اسپم صدها خط در لاگ گرفته می‌شود
      // (پیام به کلاینت فقط یک‌بار نمایش داده می‌شود؛ مدیریت dedup در apiClient.ts)
      if (!req.path.includes('/auth/')) {
        return res.status(401).json({ error: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.' });
      }
    }
  }
  next();
});

// محافظت از فایل‌های محرمانه با احراز هویت (Fix 32)
app.use('/uploads', requireAuth, express.static(path.join(currentDir, 'uploads')));
app.use('/storage', requireAuth, express.static(path.join(currentDir, 'storage')));

// ⚠️ مسیرهای بکاپ باید بعد از میدل‌ور احراز هویت تعریف شوند تا req.user ست شده باشد
import { createManualBackup } from './server/utils/backup.js';

app.get('/api/backup/download', requireAuth, (req, res) => {
  const dbPath = path.join(currentDir, 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, 'database.sqlite');
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
});

// پشتیبان‌گیری دستی (فقط با کلیک کاربر در تنظیمات)
app.post('/api/backup/create', requireAuth, async (req, res) => {
  try {
    const result = await createManualBackup();
    if (!result) {
      return res.status(500).json({ error: 'خطا در ایجاد پشتیبان' });
    }
    logAudit({
      userId: (req as any).user?.id || null,
      action: 'CREATE',
      entityName: 'پشتیبان‌گیری دستی',
      entityId: 0,
      changes: { name: result.name, size: result.size },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, message: 'پشتیبان با موفقیت ساخته شد', backup: { name: result.name, size: result.size } });
  } catch (error: any) {
    console.error('Manual backup API error:', error);
    res.status(500).json({ error: 'خطا در ایجاد پشتیبان' });
  }
});

app.use('/api/metadata', metadataRoutes);
app.use('/api/trees', requireAuth, treeRoutes);
app.use('/api/templates',requireAuth , templateRoutes);
app.use('/api/roles', requireAuth, roleRoutes);
app.use('/api/levels', requireAuth, levelRoutes);
app.use('/api/assets', requireAuth, assetRoutes);
app.use('/api/gaps', requireAuth, gapRoutes);
app.use('/api/merge', requireAuth, mergeRoutes);
app.use('/api/research', requireAuth, researchRoutes);
app.use('/api/issues', requireAuth, issueRoutes);
app.use('/api/outputs', requireAuth, outputRoutes);
app.use('/api/org', requireAuth, orgRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/periods', requireAuth, periodRoutes);
app.use('/api/files', unitDataExchangeRoutes);
app.use('/api/files', fileRoutes); 
app.use('/api/data-exchange', unitDataExchangeRoutes);
app.use('/api/audit', requireAuth, auditRoutes);
app.use('/api/search', requireAuth, searchRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/dynamic-fields', requireAuth, dynamicFieldsRoutes);

// ============================================
// Login
// ============================================

import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است').max(50),
  password: z.string().min(1, 'رمز عبور الزامی است').max(72, 'رمز عبور نباید بیشتر از 72 کاراکتر باشد')
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'تعداد درخواست‌های ناموفق بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
  validate: { trustProxy: true, xForwardedForHeader: false }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.issues[0].message });
    }
    const { username, password } = parseResult.data;

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username)


    });

    if (!user) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    const roleDef = await db.query.roles.findFirst({ where: (roles, { eq }) => eq(roles.name, user.role || "user") });
    const permissions = roleDef && roleDef.permissions ? JSON.parse(roleDef.permissions) : [];

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logAudit({ userId: user.id, action: 'LOGIN_FAILED', entityName: 'Auth', entityId: user.id, changes: 'Invalid password', ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, organizationLevel: user.organizationLevel },
      JWT_SECRET,
      { expiresIn: parseInt(SESSION_TIMEOUT) }
    );
    
    logAudit({ userId: user.id, action: 'LOGIN_SUCCESS', entityName: 'Auth', entityId: user.id, changes: 'User logged in', ip: req.ip, userAgent: req.headers['user-agent'] });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        baseId: user.baseId,
        unitId: user.unitId,
        organizationLevel: user.organizationLevel,
        phone: user.phone,
        rank: user.rank,
        photoUrl: user.photoUrl,
        permissions: permissions,
      },
      token: token,
    });
  } catch (error: any) {
    logger.error('Login processing error:', error);
    res.status(500).json({ message: 'خطا در فرآیند ورود به سیستم' });
  }
});

// ============================================
// Stats
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const [trees, nodes, gapsCountResult, issuesCountResult, usersCount] = await Promise.all([
      db.select({ count: sql`count(*)` as any }).from(knowledgeTrees),
      db.select({ count: sql`count(*)` as any }).from(treeNodes),
      db.select({ count: sql`count(*)` as any }).from(gaps),
      db.select({ count: sql`count(*)` as any }).from(issues),
      db.select({ count: sql`count(*)` as any }).from(users),
    ]);
    res.json({
      trees: (trees as any[])[0]?.count || 0,
      nodes: (nodes as any[])[0]?.count || 0,
      gaps: (gapsCountResult as any[])[0]?.count || 0,
      issues: (issuesCountResult as any[])[0]?.count || 0,
      users: (usersCount as any[])[0]?.count || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// ============================================
// Vite Middleware (توسعه)
// ============================================

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { 
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('❌ Failed to create Vite middleware:', e);
    }
  } else {
    const distPath = path.join(currentDir, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // ============================================
  // Centralized Error Handler (با مهار لوپ لاگ و محافظت از اطلاعات محرمانه)
  // ============================================

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[${req.method} ${req.originalUrl || req.url}] Server Error:`, err);
    if (res.headersSent) {
      return next(err);
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.status && typeof err.status === 'number' ? err.status : 500;
    res.status(statusCode).json({
      error: isProduction
        ? 'خطای سرور رخ داده است. لطفاً با مدیر سیستم تماس بگیرید.'
        : err?.message || 'خطای داخلی سرور',
    });
  });

  // ============================================
  // Start (راه‌اندازی با مهار هوشمند EADDRINUSE و آزادسازی خودکار پورت)
  // ============================================

  setupGracefulShutdown(httpServer);

  listenWithAutoPortRecovery(httpServer, PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`👤 Admin: admin / admin123`);
  });

}

startServer();