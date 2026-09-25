// server/utils/portManager.ts
// ماژول مدیریت، آزادسازی هوشمند پورت و حل همیشگی خطای EADDRINUSE

import { execSync } from 'child_process';
import http from 'http';
import { logger } from './logger.js';

/**
 * یافتن شناسه‌های فرآیند (PID) اشغال‌کننده پورت مشخص
 */
export function getPidsListeningOnPort(port: number): number[] {
  const pids: number[] = [];
  const currentPid = process.pid;
  const parentPid = process.ppid;

  try {
    // روش اول: بررسی از طریق ابزار ss
    const ssOut = execSync(`ss -lptn "sport = :${port}" 2>/dev/null`, { encoding: 'utf8' });
    const matches = ssOut.matchAll(/pid=(\d+)/g);
    for (const match of matches) {
      const pid = parseInt(match[1], 10);
      if (pid && pid !== currentPid && pid !== parentPid && !pids.includes(pid)) {
        pids.push(pid);
      }
    }
  } catch {
    // خطا در اجرای ss بی‌خطر است
  }

  // روش دوم: اگر با ss پیدا نشد، بررسی از طریق lsof
  if (pids.length === 0) {
    try {
      const lsofOut = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf8' });
      for (const line of lsofOut.split('\n')) {
        const pid = parseInt(line.trim(), 10);
        if (pid && pid !== currentPid && pid !== parentPid && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    } catch {
      // lsof ممکن است نصب نباشد
    }
  }

  return pids;
}

/**
 * آزادسازی سریع پورت مشخص با خاتمه دادن به پردازش‌های متخاصم یا آویزان
 */
export function freePort(port: number): boolean {
  let freed = false;
  const currentPid = process.pid;
  const parentPid = process.ppid;

  const targetPids = getPidsListeningOnPort(port);
  for (const pid of targetPids) {
    try {
      logger.info(`🔄 آزادسازی پورت ${port}: بستن پردازش قبلی (PID ${pid})...`);
      process.kill(pid, 'SIGTERM');
      freed = true;
    } catch {
      // نادیده گرفتن اگر قبلاً بسته شده
    }
  }

  // اگر پردازش‌ها با SIGTERM بسته نشدند، با SIGKILL فورس کن
  if (targetPids.length > 0) {
    try {
      // انتظار خیلی کوتاه ۵۰ میلی‌ثانیه برای خروج مسالمت‌آمیز
      const checkPids = getPidsListeningOnPort(port);
      for (const pid of checkPids) {
        try {
          process.kill(pid, 'SIGKILL');
          freed = true;
        } catch {}
      }
    } catch {}
  }

  // روش تکمیلی اضطراری با fuser در لینوکس
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`);
    freed = true;
  } catch {
    // fuser ممکن است خروجی 1 دهد اگر پروسه‌ای نباشد
  }

  return freed;
}

/**
 * بستن پروسه‌های تکراری قدیمی `server.ts` در حافظه
 */
export function killLingeringServerProcesses() {
  try {
    const currentPid = process.pid;
    const parentPid = process.ppid;
    const pgrepOut = execSync("pgrep -f 'server.ts' 2>/dev/null", { encoding: 'utf8' });
    const pids = pgrepOut
      .split('\n')
      .map(s => parseInt(s.trim(), 10))
      .filter(p => p && p !== currentPid && p !== parentPid);

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {}
    }
  } catch {
    // عادی است
  }
}

/**
 * راه‌اندازی سرور با مدیریت بازگشتی و خودکار خطای EADDRINUSE
 */
export function listenWithAutoPortRecovery(
  httpServer: http.Server,
  port: number,
  host: string = '0.0.0.0',
  onSuccess?: () => void
) {
  let retryCount = 0;
  const maxRetries = 5;

  const tryListen = () => {
    // پاک کردن خطاهای قبلی جهت جلوگیری از تکرار رویدادها
    httpServer.removeAllListeners('error');

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        retryCount++;
        logger.warn(
          `⚠️ پورت ${port} اشغال است (EADDRINUSE). در حال آزادسازی خودکار و تلاش مجدد (${retryCount} از ${maxRetries})...`
        );

        // تلاش برای آزادسازی پورت
        freePort(port);

        if (retryCount <= maxRetries) {
          setTimeout(() => {
            try {
              httpServer.close();
            } catch {}
            tryListen();
          }, 600);
          return;
        }

        logger.error(`❌ پس از ${maxRetries} بار تلاش، امکان آزادسازی پورت ${port} فراهم نشد.`);
        process.exit(1);
      }

      logger.error('❌ خطای سرور HTTP:', err);
      process.exit(1);
    });

    httpServer.listen(port, host, () => {
      if (onSuccess) {
        onSuccess();
      }
    });
  };

  // گام اول: آزادسازی پیشگیرانه قبل از اولین تلاش
  freePort(port);
  tryListen();
}

/**
 * خروج تمیز (Graceful Shutdown) هنگام توقف سرور توسط سیستم
 */
export function setupGracefulShutdown(httpServer: http.Server) {
  let isShuttingDown = false;

  const handleShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`🛑 دریافت سیگنال ${signal}: در حال بستن سرور و آزادسازی کامل سوکت‌ها...`);

    httpServer.close(() => {
      logger.info('✅ سرور با موفقیت متوقف شد و پورت آزاد گردید.');
      process.exit(0);
    });

    // در صورتی که پس از ۲ ثانیه اتصالی گیر کرده بود، فورس خارج شو
    setTimeout(() => {
      process.exit(0);
    }, 2000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
