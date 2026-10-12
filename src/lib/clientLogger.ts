// src/lib/clientLogger.ts
// مدیریت استثناهای کلاینت و جلوگیری از تکرار لاگ‌ها در کنسول مرورگر

let isClientLoggerInitialized = false;
const recentClientErrors = new Map<string, { count: number; lastTime: number }>();
const CLIENT_DEDUP_WINDOW = 4000;

export function reportClientDiagnostic(
  event: 'uncaught_error' | 'unhandled_rejection' | 'react_error_boundary',
  message: string,
  details: Record<string, unknown> = {}
) {
  if (!message.trim()) return;

  try {
    let userId: unknown = null;
    let username: unknown = null;
    try {
      const auth = JSON.parse(localStorage.getItem('dana_auth_state') || '{}');
      userId = auth?.state?.user?.id ?? null;
      username = auth?.state?.user?.username ?? null;
    } catch { /* ignore storage read error */ }

    const payload = JSON.stringify({
      event,
      message: message.slice(0, 16000),
      details: {
        url: window.location.href,
        pathname: window.location.pathname,
        userId,
        username,
        ...details,
      },
    });
    const body = new Blob([payload], { type: 'application/json' });
    if (!navigator.sendBeacon('/api/diagnostics/client', body)) {
      void fetch('/api/diagnostics/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // Diagnostics must never prevent the application from handling its original error.
  }
}

export function initClientErrorHandling() {
  if (isClientLoggerInitialized) return;
  isClientLoggerInitialized = true;

  // مدیریت استثناهای عمومی جاوااسکریپت در مرورگر
  window.addEventListener('error', (event) => {
    const errorMsg = event.message || 'Script error';
    const now = Date.now();
    const entry = recentClientErrors.get(errorMsg);

    if (entry && now - entry.lastTime < CLIENT_DEDUP_WINDOW) {
      entry.count++;
      entry.lastTime = now;
      event.preventDefault();
      return;
    }

    recentClientErrors.set(errorMsg, { count: 1, lastTime: now });
    reportClientDiagnostic('uncaught_error', errorMsg, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
    // پاکسازی از حافظه
    setTimeout(() => {
      recentClientErrors.delete(errorMsg);
    }, CLIENT_DEDUP_WINDOW + 1000);
  });

  // مدیریت خطاهای Promise کنترل‌نشده
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || 'Unhandled Rejection');
    
    // فیلتر کردن خطاهای سوکت Vite، نشست منقضی شده یا اتصالات مقطعی
    if (
      reason.includes('WebSocket') ||
      reason.includes('closed without opened') ||
      reason.includes('Unauthorized') ||
      reason.includes('Session locked')
    ) {
      event.preventDefault();
      return;
    }

    const now = Date.now();
    const entry = recentClientErrors.get(reason);

    if (entry && now - entry.lastTime < CLIENT_DEDUP_WINDOW) {
      entry.count++;
      entry.lastTime = now;
      event.preventDefault();
      return;
    }

    recentClientErrors.set(reason, { count: 1, lastTime: now });
    reportClientDiagnostic('unhandled_rejection', reason, {
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });
    setTimeout(() => {
      recentClientErrors.delete(reason);
    }, CLIENT_DEDUP_WINDOW + 1000);
  });
}
