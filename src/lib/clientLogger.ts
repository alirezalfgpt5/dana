// src/lib/clientLogger.ts
// مدیریت استثناهای کلاینت و جلوگیری از تکرار لاگ‌ها در کنسول مرورگر

let isClientLoggerInitialized = false;
const recentClientErrors = new Map<string, { count: number; lastTime: number }>();
const CLIENT_DEDUP_WINDOW = 4000;

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
    // پاکسازی از حافظه
    setTimeout(() => {
      recentClientErrors.delete(errorMsg);
    }, CLIENT_DEDUP_WINDOW + 1000);
  });

  // مدیریت خطاهای Promise کنترل‌نشده
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || 'Unhandled Rejection');
    
    // اگر خطای نشست منقضی شده یا دسترسی قفل است، به‌آرامی مدیریت شود
    if (reason.includes('Unauthorized') || reason.includes('Session locked')) {
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
    setTimeout(() => {
      recentClientErrors.delete(reason);
    }, CLIENT_DEDUP_WINDOW + 1000);
  });
}
