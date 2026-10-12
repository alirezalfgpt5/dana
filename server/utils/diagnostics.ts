import fs from 'fs';
import path from 'path';

export type DiagnosticLevel = 'warning' | 'error' | 'fatal';

export interface DiagnosticEntry {
  level: DiagnosticLevel;
  source: string;
  event: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

const SECRET_KEY_PATTERN = /^(authorization|password|passwd|pwd|token|secret|cookie|accessToken|refreshToken)$/i;

function sanitizeString(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer ***REDACTED***')
    .replace(/((?:password|passwd|pwd|secret|token|authorization)\s*[:=]\s*["']?)([^"'\s,;]+)/gi, '$1***REDACTED***');
}

function sanitizeValue(value: unknown, key = ''): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return '***REDACTED***';
  if (typeof value === 'string') return sanitizeString(value).slice(0, 12000);
  if (Array.isArray(value)) return value.slice(0, 30).map(item => sanitizeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)])
    );
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return String(value).slice(0, 1000);
}

export function getApplicationLogPath(dataDir: string) {
  return path.join(dataDir, 'logs', 'application-errors.jsonl');
}

export function ensureApplicationLogs(dataDir: string) {
  const logDirectory = path.join(dataDir, 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  for (const fileName of ['application-errors.jsonl', 'session-expired.log']) {
    fs.closeSync(fs.openSync(path.join(logDirectory, fileName), 'a'));
  }
}

export function writeApplicationDiagnostic(entry: DiagnosticEntry, dataDir = process.env.USER_DATA_PATH || process.cwd()) {
  const normalizedEntry = sanitizeValue({
    timestamp: entry.timestamp || new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    event: entry.event,
    message: entry.message,
    details: entry.details || {},
  }) as Record<string, unknown>;

  try {
    ensureApplicationLogs(dataDir);
    fs.appendFileSync(
      getApplicationLogPath(dataDir),
      `${JSON.stringify(normalizedEntry)}\n`,
      'utf8'
    );
  } catch (error) {
    try {
      fs.writeSync(2, `Failed to write application diagnostic log: ${String(error)}\n`);
    } catch {
      // The process may be shutting down and stderr may already be unavailable.
    }
  }
}
