// server/utils/portManager.ts
// ماژول مدیریت و آزادسازی هوشمند پورت، سازگار با ویندوز و لینوکس

import { execSync } from 'child_process';
import http from 'http';
import { logger } from './logger.js';

/**
 * یافتن شناسه‌های فرآیند (PID) اشغال‌کننده پورت مشخص به روش کراس‌پلتفرم
 */
export function getPidsListeningOnPort(port: number): number[] {
  const pids: number[] = [];
  const currentPid = process.pid;
  const parentPid = process.ppid;

  // ۱. سیستم‌عامل ویندوز
  if (process.platform === 'win32') {
    try {
      const netstatOut = execSync(`netstat -ano -p tcp`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of netstatOut.split('\n')) {
        if (!line.includes(`:${port}`)) continue;
        const parts = line.trim().split(/\s+/);
        // ستون آخر در ویندوز netstat برابر PID است
        if (parts.length >= 5 && parts[3]?.toUpperCase() === 'LISTENING') {
          const pid = parseInt(parts[4], 10);
          if (pid && pid !== currentPid && pid !== parentPid && !pids.includes(pid)) {
            pids.push(pid);
          }
        }
      }
    } catch {
      // در صورت نبود پروسه عادی است
    }
    return pids;
  }

  // ۲. سیستم‌عامل‌های لینوکس و مک
  try {
    const ssOut = execSync(`ss -lptn "sport = :${port}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const matches = ssOut.matchAll(/pid=(\d+)/g);
    for (const match of matches) {
      const pid = parseInt(match[1], 10);
      if (pid && pid !== currentPid && pid !== parentPid && !pids.includes(pid)) {
        pids.push(pid);
      }
    }
  } catch {}

  if (pids.length === 0) {
    try {
      const lsofOut = execSync(`lsof -ti :${port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of lsofOut.split('\n')) {
        const pid = parseInt(line.trim(), 10);
        if (pid && pid !== currentPid && pid !== parentPid && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    } catch {}
  }

  return pids;
}

/**
 * آزادسازی سریع پورت مشخص با خاتمه دادن به پردازش‌های متخاصم یا آویزان
 */
export function freePort(port: number): boolean {
  let freed = false;
  const targetPids = getPidsListeningOnPort(port);

  for (const pid of targetPids) {
    try {
      logger.info(`🔄 Port ${port} release: Closing previous process (PID ${pid})...`);

      if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGTERM');
      }
      freed = true;
    } catch {
      // نادیده گرفتن در صورت پایان پردازش
    }
  }

  // روی لینوکس در صورت نیاز fuser تست شود (بدون syntax 2>/dev/null که در ویندوز خطا می‌دهد)
  if (process.platform !== 'win32' && targetPids.length > 0) {
    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
      freed = true;
    } catch {}
  }

  return freed;
}

/**
 * بستن پروسه‌های تکراری قدیمی `server.ts` در حافظه
 */
export function killLingeringServerProcesses() {
  if (process.platform === 'win32') {
    // در ویندوز از جستجوی ساده رد می‌شویم
    return;
  }

  try {
    const currentPid = process.pid;
    const parentPid = process.ppid;
    const pgrepOut = execSync("pgrep -f 'server.ts'", {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = pgrepOut
      .split('\n')
      .map(s => parseInt(s.trim(), 10))
      .filter(p => p && p !== currentPid && p !== parentPid);

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {}
    }
  } catch {}
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
    httpServer.removeAllListeners('error');

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        retryCount++;
        logger.warn(
          `⚠️ Port ${port} is in use (EADDRINUSE). Attempting automatic release and retry (${retryCount} of ${maxRetries})...`
        );

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

        logger.error(`❌ Port ${port} could not be released after ${maxRetries} attempts.`);
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
      logger.info(`🛑 Received ${signal}: Gracefully shutting down server and freeing all sockets...`); 
    httpServer.close(() => {
      logger.info('✅ Server has been shut down successfully and the port is now free.');
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(0);
    }, 2000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
