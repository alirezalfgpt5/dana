import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import { ensureApplicationLogs, writeApplicationDiagnostic } from './diagnostics.js';

type AuthLogDetails = Record<string, string | number | boolean | null>;

function getLogPath(dataDir: string) {
  return path.join(dataDir, 'logs', 'session-expired.log');
}

export async function initializeSessionAuthLog(dataDir: string) {
  try {
    ensureApplicationLogs(dataDir);
  } catch (error) {
    process.stderr.write(`Could not initialize session expiration log: ${String(error)}\n`);
  }
}

export async function logSessionAuthFailure(
  req: Request,
  reason: string,
  details: AuthLogDetails = {}
) {
  const dataDir = process.env.USER_DATA_PATH || process.cwd();
  const logPath = getLogPath(dataDir);
  const entry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl.split('?')[0],
    reason,
    ...details,
  };

  try {
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
    writeApplicationDiagnostic({
      level: 'warning',
      source: 'authentication',
      event: reason,
      message: 'Request rejected because the authentication session was missing, invalid, or expired.',
      details: entry,
    }, dataDir);
  } catch (error) {
    process.stderr.write(`Could not append session expiration log: ${String(error)}\n`);
  }
}
