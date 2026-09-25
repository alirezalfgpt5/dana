// server/utils/logger.ts
// سیستم جامع لاگینگ، جلوگیری از تکرار لاگ‌ها و مدیریت استثناها (DANA)

import util from 'util';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  timer: NodeJS.Timeout | null;
}

class SystemLogger {
  private minLevel: LogLevel;
  private isProduction: boolean;
  private dedupWindowMs: number;
  private recentLogs: Map<string, LogEntry> = new Map();
  private maxStoredEntries = 1000;

  // Circuit breaker for error storms
  private errorCountInWindow = 0;
  private windowResetTimer: NodeJS.Timeout | null = null;
  private isCircuitOpen = false;

  // Raw console references
  public readonly raw = {
    log: console.log.bind(console),
    info: (console.info || console.log).bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: (console.debug || console.log).bind(console),
  };

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
    this.dedupWindowMs = parseInt(process.env.LOG_DEDUP_WINDOW_MS || '5000', 10);

    // Periodically reset error rate limiter window
    this.startRateLimiter();
  }

  private startRateLimiter() {
    this.windowResetTimer = setInterval(() => {
      this.errorCountInWindow = 0;
      this.isCircuitOpen = false;
    }, 5000);
    // Don't keep event loop alive just for rate limiter timer
    if (this.windowResetTimer.unref) {
      this.windowResetTimer.unref();
    }
  }

  public setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private sanitize(str: string): string {
    if (!str || typeof str !== 'string') return '';
    // Mask passwords, jwt tokens, secrets, and auth headers
    return str
      .replace(/(password|passwd|pwd|secret|token|authorization)\s*[:=]\s*["']?([^"'\s,;]+)/gi, '$1: "***REDACTED***"')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer ***REDACTED***');
  }

  private formatMessage(args: any[]): string {
    const formatted = args
      .map(arg => {
        if (arg instanceof Error) {
          if (this.isProduction) {
            // Keep stack brief in production to prevent log bloat
            const stackLines = (arg.stack || '').split('\n').slice(0, 5).join('\n');
            return `${arg.name}: ${arg.message}${stackLines ? '\n' + stackLines : ''}`;
          }
          return arg.stack || `${arg.name}: ${arg.message}`;
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return util.inspect(arg, { depth: 3, colors: false, maxArrayLength: 20 });
          } catch {
            return '[Complex Object]';
          }
        }
        return String(arg);
      })
      .join(' ');

    return this.sanitize(formatted);
  }

  private getSignature(level: LogLevel, message: string): string {
    // Generate signature by taking first 180 chars and stripping variable timestamps/numbers
    const normalized = message
      .slice(0, 180)
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '')
      .replace(/\b\d{5,}\b/g, '#ID#');
    return `${level}:${normalized}`;
  }

  private printOutput(level: LogLevel, text: string, repeatedCount = 0, elapsedMs = 0) {
    const timestamp = new Date().toISOString();
    let prefix = '';
    let writer = this.raw.log;

    switch (level) {
      case LogLevel.DEBUG:
        prefix = '🔍 [DEBUG]';
        writer = this.raw.debug;
        break;
      case LogLevel.INFO:
        prefix = 'ℹ️ [INFO]';
        writer = this.raw.info;
        break;
      case LogLevel.WARN:
        prefix = '⚠️ [WARN]';
        writer = this.raw.warn;
        break;
      case LogLevel.ERROR:
        prefix = '❌ [ERROR]';
        writer = this.raw.error;
        break;
    }

    let repetitionNote = '';
    if (repeatedCount > 1) {
      const seconds = Math.round(elapsedMs / 1000) || 1;
      repetitionNote = ` [تکرار ${repeatedCount} بار در ${seconds} ثانیه اخیر]`;
    }

    writer(`[${timestamp}] ${prefix}${repetitionNote} ${text}`);
  }

  private logWithDeduplication(level: LogLevel, args: any[]) {
    if (level < this.minLevel) return;

    const message = this.formatMessage(args);
    if (!message) return;

    // Suppress experimental node warnings from cluttering error logs
    if (message.includes('ExperimentalWarning: SQLite is an experimental feature')) {
      return;
    }

    // Error rate limiter / circuit breaker to prevent stdout/stderr flooding
    if (level >= LogLevel.WARN) {
      this.errorCountInWindow++;
      if (this.errorCountInWindow > 80) {
        if (!this.isCircuitOpen) {
          this.isCircuitOpen = true;
          this.raw.warn(`[${new Date().toISOString()}] ⚠️ [RATE LIMIT] حجم لاگ‌های هشدار و خطا بیش از حد مجاز است. لاگ‌های تکراری موقتاً مسدود شدند.`);
        }
        return;
      }
    }

    const signature = this.getSignature(level, message);
    const now = Date.now();
    const existing = this.recentLogs.get(signature);

    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;

      // Reset debounce timer
      if (existing.timer) {
        clearTimeout(existing.timer);
      }

      // If repeated a lot (e.g., 25 times), flush an interim note
      if (existing.count % 25 === 0) {
        this.printOutput(level, existing.message, existing.count, now - existing.firstSeen);
      }

      // Schedule final flush after quiet window
      existing.timer = setTimeout(() => {
        if (existing.count > 1) {
          this.printOutput(level, existing.message, existing.count, Date.now() - existing.firstSeen);
        }
        this.recentLogs.delete(signature);
      }, this.dedupWindowMs);

      // Unref timer so it doesn't block shutdown
      if (existing.timer.unref) {
        existing.timer.unref();
      }
      return;
    }

    // New unique log entry: print immediately!
    this.printOutput(level, message);

    // Evict old entries if cache is growing too large
    if (this.recentLogs.size >= this.maxStoredEntries) {
      const oldestKey = this.recentLogs.keys().next().value;
      if (oldestKey) {
        const item = this.recentLogs.get(oldestKey);
        if (item?.timer) clearTimeout(item.timer);
        this.recentLogs.delete(oldestKey);
      }
    }

    const timer = setTimeout(() => {
      const entry = this.recentLogs.get(signature);
      if (entry && entry.count > 1) {
        this.printOutput(level, entry.message, entry.count, Date.now() - entry.firstSeen);
      }
      this.recentLogs.delete(signature);
    }, this.dedupWindowMs);

    if (timer.unref) {
      timer.unref();
    }

    this.recentLogs.set(signature, {
      level,
      message,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      timer,
    });
  }

  public debug(...args: any[]) {
    this.logWithDeduplication(LogLevel.DEBUG, args);
  }

  public info(...args: any[]) {
    this.logWithDeduplication(LogLevel.INFO, args);
  }

  public warn(...args: any[]) {
    this.logWithDeduplication(LogLevel.WARN, args);
  }

  public error(...args: any[]) {
    this.logWithDeduplication(LogLevel.ERROR, args);
  }

  // Intercept standard console methods so that all 260+ calls across existing routes
  // automatically benefit from deduplication and rate limiting!
  public patchConsole() {
    console.error = (...args: any[]) => this.error(...args);
    console.warn = (...args: any[]) => this.warn(...args);
    console.info = (...args: any[]) => this.info(...args);
    // Keep console.log for general info, but route through deduplicator if in production
    if (this.isProduction) {
      console.log = (...args: any[]) => this.info(...args);
    }
  }

  // Restore raw console if needed
  public restoreConsole() {
    console.log = this.raw.log;
    console.info = this.raw.info;
    console.warn = this.raw.warn;
    console.error = this.raw.error;
    console.debug = this.raw.debug;
  }
}

export const logger = new SystemLogger();

// ============================================
// مکانیزم مدیریت استثناها و رویدادهای پیش‌بینی‌نشده
// ============================================

let unhandledExceptionsCount = 0;
let lastExceptionTime = 0;

export function setupProcessExceptionHandlers() {
  process.on('uncaughtException', (err: any) => {
    const now = Date.now();
    if (now - lastExceptionTime > 5000) {
      unhandledExceptionsCount = 0;
    }
    lastExceptionTime = now;
    unhandledExceptionsCount++;

    const isFatal =
      err?.code === 'EADDRINUSE' ||
      err?.code === 'ENOSPC' ||
      err?.code === 'ENOMEM' ||
      err?.message?.includes('DatabaseSync') ||
      err?.message?.includes('address already in use');

    if (isFatal) {
      logger.raw.error(`[FATAL UNCAUGHT EXCEPTION] پروسه سرور به دلیل خطای غیرقابل بازگشت متوقف می‌شود:`, err);
      process.exit(1);
    }

    logger.error('Unhandled Exception caught safely:', err);

    // If an infinite exception storm occurs, stop to prevent CPU pegging
    if (unhandledExceptionsCount > 30) {
      logger.raw.error('⚠️ [CRITICAL] نرخ استثناهای مکرر از آستانه ایمنی عبور کرد. سرور جهت بازیابی ری‌استارت می‌شود.');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.warn('Unhandled Promise Rejection caught safely:', reason);
  });
}
