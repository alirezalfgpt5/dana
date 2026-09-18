// server/utils/audit.ts
// ثبت لاگ‌های حسابرسی

import { sqlite } from '../../src/db/index.js';

interface AuditLogOptions {
  userId: number | null;
  action: string; // CREATE, UPDATE, DELETE, VIEW, EXPORT
  entityName: string;
  entityId: number;
  changes: any;
  ip?: string;
  userAgent?: string;
}

export function logAudit(options: AuditLogOptions): void {
  try {
    const {
      userId,
      action,
      entityName,
      entityId,
      changes,
      ip = null,
      userAgent = null,
    } = options;

    const timestamp = new Date().toISOString();
    
    const stmt = sqlite.prepare(`
      INSERT INTO audit_logs (
        user_id, action, entity_name, entity_id, changes, ip, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId ?? null,
      action ?? null,
      entityName ?? null,
      entityId ?? null,
      typeof changes === 'string' ? changes : JSON.stringify(changes),
      ip ?? null,
      userAgent ?? null,
      timestamp
    );
  } catch (error) {
    console.error('❌ خطا در ثبت لاگ حسابرسی:', error);
  }
}

// ============================================
// توابع کمکی برای ثبت لاگ‌های خاص
// ============================================

export function logCreate(
  userId: number | null,
  entityName: string,
  entityId: number,
  data: any,
  ip?: string,
  userAgent?: string
) {
  logAudit({
    userId,
    action: 'CREATE',
    entityName,
    entityId,
    changes: data,
    ip,
    userAgent,
  });
}

export function logUpdate(
  userId: number | null,
  entityName: string,
  entityId: number,
  oldData: any,
  newData: any,
  ip?: string,
  userAgent?: string
) {
  logAudit({
    userId,
    action: 'UPDATE',
    entityName,
    entityId,
    changes: { old: oldData, new: newData },
    ip,
    userAgent,
  });
}

export function logDelete(
  userId: number | null,
  entityName: string,
  entityId: number,
  data: any,
  ip?: string,
  userAgent?: string
) {
  logAudit({
    userId,
    action: 'DELETE',
    entityName,
    entityId,
    changes: data,
    ip,
    userAgent,
  });
}

export function logExport(
  userId: number | null,
  entityName: string,
  entityId: number,
  format: string,
  ip?: string,
  userAgent?: string
) {
  logAudit({
    userId,
    action: 'EXPORT',
    entityName,
    entityId,
    changes: { format },
    ip,
    userAgent,
  });
}