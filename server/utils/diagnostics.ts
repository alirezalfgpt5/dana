// server/utils/diagnostics.ts
// سیستم جامع ثبت و تفکیک خطاهای برنامه در پوشه logs

import fs from 'fs';
import path from 'path';

export type DiagnosticLevel = 'warning' | 'error' | 'fatal' | 'info';

export interface DiagnosticEntry {
  level: DiagnosticLevel;
  source: string;
  event: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  stack?: string;
}

const SECRET_KEY_PATTERN = /^(authorization|password|passwd|pwd|token|secret|cookie|accessToken|refreshToken)$/i;
let applicationDiagnosticsEnabled = true;
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function setApplicationDiagnosticsEnabled(enabled: boolean) {
  applicationDiagnosticsEnabled = enabled;
}

export function isApplicationDiagnosticsEnabled(): boolean {
  return applicationDiagnosticsEnabled;
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer ***REDACTED***')
    .replace(/((?:password|passwd|pwd|secret|token|authorization)\s*[:=]\s*["']?)([^"'\s,;]+)/gi, '$1***REDACTED***');
}

export function sanitizeValue(value: unknown, key = ''): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return '***REDACTED***';
  if (typeof value === 'string') return sanitizeString(value).slice(0, 16000);
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitizeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 60)
        .map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)])
    );
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return String(value).slice(0, 2000);
}

export function getLogDirectory(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(dataDir, 'logs');
}

export function getApplicationLogPath(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(getLogDirectory(dataDir), 'application-errors.jsonl');
}

export function getServerErrorLogPath(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(getLogDirectory(dataDir), 'server-errors.log');
}

export function getSessionAuthLogPath(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(getLogDirectory(dataDir), 'session-auth.log');
}

export function getSessionExpiredLogPath(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(getLogDirectory(dataDir), 'session-expired.log');
}

export function getClientErrorLogPath(dataDir = process.env.USER_DATA_PATH || process.cwd()): string {
  return path.join(getLogDirectory(dataDir), 'client-errors.log');
}

/**
 * اطمینان از وجود پوشه logs و فایل‌های تفکیک‌شده
 */
export function ensureApplicationLogs(dataDir = process.env.USER_DATA_PATH || process.cwd()) {
  const logDirectory = getLogDirectory(dataDir);
  try {
    fs.mkdirSync(logDirectory, { recursive: true });
    const standardFiles = [
      'application-errors.jsonl',
      'server-errors.log',
      'session-auth.log',
      'session-expired.log',
      'client-errors.log',
    ];
    for (const fileName of standardFiles) {
      const filePath = path.join(logDirectory, fileName);
      if (!fs.existsSync(filePath)) {
        fs.closeSync(fs.openSync(filePath, 'a'));
      }
    }
  } catch { /* ignore directory creation errors */ }
}

/**
 * چرخش فایل لاگ در صورتی که حجم آن بیش از سقف مجاز شود
 */
function rotateLogFileIfNeeded(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_LOG_FILE_SIZE) {
        const backupPath = `${filePath}.1`;
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
        fs.renameSync(filePath, backupPath);
      }
    }
  } catch { /* ignore rotation errors */ }
}

function safeAppendLog(filePath: string, content: string) {
  try {
    rotateLogFileIfNeeded(filePath);
    fs.appendFileSync(filePath, content, 'utf8');
  } catch (error) {
    try {
      fs.writeSync(2, `Failed to write to log file (${filePath}): ${String(error)}\n`);
    } catch { /* ignore */ }
  }
}

/**
 * ثبت در فایل جامع ساختاریافته JSONL (برای پردازش ماشینی و داشبوردها)
 */
export function writeApplicationDiagnostic(
  entry: DiagnosticEntry,
  dataDir = process.env.USER_DATA_PATH || process.cwd()
) {
  if (!applicationDiagnosticsEnabled) return;

  const normalizedEntry = sanitizeValue({
    timestamp: entry.timestamp || new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    event: entry.event,
    message: entry.message,
    ...(entry.stack ? { stack: entry.stack } : {}),
    details: entry.details || {},
  }) as Record<string, unknown>;

  ensureApplicationLogs(dataDir);
  safeAppendLog(
    getApplicationLogPath(dataDir),
    `${JSON.stringify(normalizedEntry)}\n`
  );
}

/**
 * ثبت خطاهای سمت سرور و روت‌های بک‌اند در فایل انسانی logs/server-errors.log
 */
export function writeServerErrorLog(
  data: {
    message: string;
    errorName?: string;
    stack?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    userId?: number | string | null;
    username?: string | null;
    ip?: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  },
  dataDir = process.env.USER_DATA_PATH || process.cwd()
) {
  if (!applicationDiagnosticsEnabled) return;
  ensureApplicationLogs(dataDir);

  const timestamp = data.timestamp || new Date().toISOString();
  const sep = '═'.repeat(80);
  const userStr = data.username ? `کاربر: ${data.username} (شناسه: ${data.userId ?? 'نامشخص'})` : 'کاربر: بدون احراز هویت / ناشناس';
  const methodStr = data.method ? `${data.method} ` : '';
  const urlStr = data.url ? `${data.url}` : '';
  const statusStr = data.statusCode ? ` | وضعیت: ${data.statusCode}` : '';

  let detailsBlock = '';
  if (data.details && Object.keys(data.details).length > 0) {
    try {
      const sanitized = sanitizeValue(data.details);
      detailsBlock = `\nجزئیات تکمیلی:\n${JSON.stringify(sanitized, null, 2)}`;
    } catch { /* ignore */ }
  }

  const stackBlock = data.stack ? `\nردیابی پشته (Stack Trace):\n${data.stack}` : '';

  const logMessage = `
${sep}
[${timestamp}] ❌ خطای سرور: ${methodStr}${urlStr}${statusStr}
${userStr} | آی‌پی: ${data.ip || 'نامشخص'}
نوع خطا: ${data.errorName || 'Error'}
شرح خطا: ${sanitizeString(data.message)}${detailsBlock}${stackBlock}
${sep}
`;

  safeAppendLog(getServerErrorLogPath(dataDir), logMessage);

  // هم‌زمان در فایل جامع JSONL نیز ثبت شود
  writeApplicationDiagnostic({
    level: 'error',
    source: 'server',
    event: data.errorName || 'server_error',
    message: data.message,
    stack: data.stack,
    details: {
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      userId: data.userId,
      username: data.username,
      ip: data.ip,
      ...(data.details || {}),
    },
    timestamp,
  }, dataDir);
}

/**
 * ثبت خطاهای کلاینت و فرانت‌اند در فایل انسانی logs/client-errors.log
 */
export function writeClientErrorLog(
  data: {
    event: string;
    message: string;
    stack?: string;
    url?: string;
    userId?: number | string | null;
    username?: string | null;
    userAgent?: string;
    ip?: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  },
  dataDir = process.env.USER_DATA_PATH || process.cwd()
) {
  if (!applicationDiagnosticsEnabled) return;
  ensureApplicationLogs(dataDir);

  const timestamp = data.timestamp || new Date().toISOString();
  const sep = '─'.repeat(80);
  const userStr = data.username ? `کاربر: ${data.username} (شناسه: ${data.userId ?? 'نامشخص'})` : 'کاربر: بدون احراز هویت';

  let detailsBlock = '';
  if (data.details && Object.keys(data.details).length > 0) {
    try {
      const sanitized = sanitizeValue(data.details);
      detailsBlock = `\nجزئیات مرورگر/کلاینت:\n${JSON.stringify(sanitized, null, 2)}`;
    } catch { /* ignore */ }
  }

  const stackBlock = data.stack ? `\nردیابی خطا (Client Stack):\n${data.stack}` : '';

  const logMessage = `
${sep}
[${timestamp}] ⚠️ خطای فرانت‌اند / کلاینت: [${data.event}]
مسیر صفحه: ${data.url || 'نامشخص'} | ${userStr}
آی‌پی: ${data.ip || 'نامشخص'} | مرورگر: ${data.userAgent || 'نامشخص'}
پیام خطا: ${sanitizeString(data.message)}${detailsBlock}${stackBlock}
${sep}
`;

  safeAppendLog(getClientErrorLogPath(dataDir), logMessage);

  // ثبت در JSONL
  writeApplicationDiagnostic({
    level: 'error',
    source: 'renderer',
    event: data.event,
    message: data.message,
    stack: data.stack,
    details: {
      url: data.url,
      userId: data.userId,
      username: data.username,
      userAgent: data.userAgent,
      ip: data.ip,
      ...(data.details || {}),
    },
    timestamp,
  }, dataDir);
}
