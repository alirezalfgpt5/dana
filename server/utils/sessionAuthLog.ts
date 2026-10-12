// server/utils/sessionAuthLog.ts
// ثبت تخصصی رویدادهای احراز هویت، انقضای نشست و دلایل رد دسترسی با راهنمای تشخیصی برای برنامه‌نویس

import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import {
  ensureApplicationLogs,
  writeApplicationDiagnostic,
  getSessionAuthLogPath,
  getSessionExpiredLogPath,
  sanitizeValue,
} from './diagnostics.js';

type AuthLogDetails = Record<string, unknown>;

function getDiagnosticHint(reason: string, details: AuthLogDetails): string {
  switch (reason) {
    case 'authentication_required_but_user_missing':
      if (details.authorizationHeaderPresent) {
        return 'هدر Authorization حاوی توکن ارسال شده است، اما کاربر در شیء req تنظیم نشده است. علل محتمل: انقضای توکن، امضای نامعتبر، یا ترتیب اشتباه میدل‌ور احراز هویت نسبت به این مسیر.';
      }
      return 'درخواست فاقد هدر Authorization یا توکن معتبر است و به مسیر محافظت‌شده ارسال شده است.';
    case 'jwt_expired':
      return 'توکن JWT منقضی شده است. فرانت‌اند باید کاربر را به صفحه لاگین هدایت کند و نشست را تمدید کند.';
    case 'jwt_invalid':
      return 'امضای دیجیتال یا ساختار توکن با کلید محرمانه فعلی سرور (.jwtsecret) مطابقت ندارد. احتمالاً سرور ری‌استارت شده یا توکن مخدوش است.';
    case 'token_user_missing_or_inactive':
      return 'شناسه کاربریِ موجود در توکن، در جدول users پایگاه‌داده یافت نشد یا حساب کاربری غیرفعال (isActive=0) است.';
    case 'token_invalidated_by_user_update':
      return 'این توکن قبل از آخرین ویرایش اطلاعات یا تغییر رمز عبور کاربر صادر شده و به دلایل امنیتی باطل شده است.';
    case 'role_forbidden':
      return `نقش کاربر (${details.userRole || 'نامشخص'}) اجازه دسترسی به این منبع را ندارد. نقش‌های مجاز: ${details.requiredRoles || 'نامشخص'}.`;
    case 'permission_denied':
      return `دسترسی مورد نیاز (${details.requiredPermissions || 'نامشخص'}) در لیست مجوزهای انتساب‌یافته به نقش کاربر وجود ندارد.`;
    case 'tree_permission_denied':
      return 'کاربر مجوزی برای مشاهده یا ویرایش این نوع درختواره ندارد.';
    case 'login_failed_invalid_credentials':
      return 'تلاش ناموفق برای ورود به سیستم: نام کاربری یا رمز عبور اشتباه است.';
    case 'role_check_without_authenticated_user':
      return 'بررسی نقش قبل از احراز هویت کاربر اجرا شده است؛ احتمالاً میدل‌ور requireRole بدون requireAuth یا قبل از آن صدا زده شده است.';
    default:
      return 'درخواست به دلیل عدم احراز شرایط امنیتی رد شد.';
  }
}

export async function initializeSessionAuthLog(dataDir: string) {
  try {
    ensureApplicationLogs(dataDir);
  } catch (error) {
    process.stderr.write(`Could not initialize session auth log: ${String(error)}\n`);
  }
}

/**
 * ثبت شکست احراز هویت، انقضای نشست یا عدم دسترسی
 */
export async function logSessionAuthFailure(
  req: Request,
  reason: string,
  details: AuthLogDetails = {}
) {
  const dataDir = process.env.USER_DATA_PATH || process.cwd();
  const timestamp = new Date().toISOString();
  const pathWithoutQuery = req.originalUrl ? req.originalUrl.split('?')[0] : req.url;
  const hint = getDiagnosticHint(reason, details);

  const entry: Record<string, unknown> = {
    timestamp,
    method: req.method,
    path: pathWithoutQuery,
    reason,
    hint,
    ip: req.ip || req.socket?.remoteAddress || 'نامشخص',
    userAgent: req.headers['user-agent'] || 'نامشخص',
    authorizationHeaderPresent: Boolean(req.headers.authorization),
    ...details,
  };

  const sep = '─'.repeat(80);
  const authHeaderStatus = req.headers.authorization
    ? `هدر احراز هویت: دارد (طول: ${req.headers.authorization.length} کاراکتر)`
    : 'هدر احراز هویت: ندارد';

  const userStr = details.username ? `کاربر: ${details.username} (${details.userId ?? ''})` : 'کاربر: نشست نامعتبر / مهمان';

  const readableLog = `
${sep}
[${timestamp}] 🔒 رخداد امنیتی / نشست: [${reason}]
مسیر: ${req.method} ${pathWithoutQuery} | ${userStr}
آی‌پی: ${entry.ip} | ${authHeaderStatus}
مرورگر: ${entry.userAgent}
💡 راهنمای تشخیصی: ${hint}
جزئیات: ${JSON.stringify(sanitizeValue(details))}
${sep}
`;

  try {
    ensureApplicationLogs(dataDir);
    // ذخیره در session-auth.log
    await fs.promises.appendFile(getSessionAuthLogPath(dataDir), readableLog, 'utf8');
    // ذخیره در session-expired.log برای سازگاری با مستندات گذشته
    await fs.promises.appendFile(getSessionExpiredLogPath(dataDir), `${JSON.stringify(sanitizeValue(entry))}\n`, 'utf8');

    // ثبت در لاگ جامع JSONL
    writeApplicationDiagnostic({
      level: 'warning',
      source: 'authentication',
      event: reason,
      message: hint,
      details: entry,
      timestamp,
    }, dataDir);
  } catch (error) {
    process.stderr.write(`Could not append session auth log: ${String(error)}\n`);
  }
}

/**
 * ثبت موفقیت ورود کاربر در لاگ نشست
 */
export async function logSessionAuthSuccess(
  req: Request,
  user: { id: number; username: string; role: string; fullName?: string }
) {
  const dataDir = process.env.USER_DATA_PATH || process.cwd();
  const timestamp = new Date().toISOString();
  const sep = '─'.repeat(80);

  const entry = {
    timestamp,
    event: 'login_success',
    userId: user.id,
    username: user.username,
    role: user.role,
    ip: req.ip || req.socket?.remoteAddress || 'نامشخص',
    userAgent: req.headers['user-agent'] || 'نامشخص',
  };

  const readableLog = `
${sep}
[${timestamp}] 🔑 ورود موفق به سیستم: [login_success]
کاربر: ${user.fullName || user.username} (${user.username} - نقش: ${user.role})
آی‌پی: ${entry.ip} | مرورگر: ${entry.userAgent}
${sep}
`;

  try {
    ensureApplicationLogs(dataDir);
    await fs.promises.appendFile(getSessionAuthLogPath(dataDir), readableLog, 'utf8');
  } catch { /* ignore */ }
}
