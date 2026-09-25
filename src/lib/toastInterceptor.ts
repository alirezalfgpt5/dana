// src/lib/toastInterceptor.ts
// سیستم هوشمند مدیریت Toast، جلوگیری از لوپ خطا و عدم تکرار پیام‌های خطا

import toast, { ToastOptions } from 'react-hot-toast';

interface ToastEntry {
  lastShown: number;
  count: number;
  toastId: string;
}

const recentErrors = new Map<string, ToastEntry>();
const DEDUP_WINDOW_MS = 3500; // بازه زمانی ۳.۵ ثانیه‌ای برای ادغام خطاهای مشابه
const CIRCUIT_THRESHOLD = 5;  // حداکثر ۵ خطا در ۱.۵ ثانیه قبل از فعال‌سازی فیوز
let recentTimestamps: number[] = [];
let isCircuitBreakerOpen = false;
let circuitTimer: any = null;

let isInitialized = false;

export function initToastDeduplication() {
  if (isInitialized) return;
  isInitialized = true;

  const originalToastError = toast.error.bind(toast);

  (toast as any).error = (message: any, options?: ToastOptions) => {
    const now = Date.now();
    const rawMessage = typeof message === 'string' ? message : String(message || 'خطای غیرمنتظره');
    const cleanMessage = rawMessage.trim();

    // 1. بررسی فیوز محافظتی (Circuit Breaker) برای جلوگیری از لوپ بی‌پایان خطا
    recentTimestamps = recentTimestamps.filter(t => now - t < 1500);
    recentTimestamps.push(now);

    if (recentTimestamps.length >= CIRCUIT_THRESHOLD) {
      if (!isCircuitBreakerOpen) {
        isCircuitBreakerOpen = true;
        originalToastError(
          'تکرار مکرر خطا تشخیص داده شد؛ نمایش اعلان‌ها برای چند لحظه متوقف شد تا سامانه پایدار بماند.',
          {
            id: 'system-circuit-breaker-warning',
            duration: 4000,
          }
        );

        clearTimeout(circuitTimer);
        circuitTimer = setTimeout(() => {
          isCircuitBreakerOpen = false;
          recentTimestamps = [];
        }, 4000);
      }
      return 'circuit-breaker-active';
    }

    if (isCircuitBreakerOpen) {
      return 'suppressed-by-circuit-breaker';
    }

    // 2. کلید یکتا برای تطبیق خطاها
    const dedupKey = options?.id ? String(options.id) : cleanMessage;
    const existing = recentErrors.get(dedupKey);

    if (existing && (now - existing.lastShown < DEDUP_WINDOW_MS)) {
      existing.count += 1;
      existing.lastShown = now;

      // به‌روزرسانی پیام فعلی با شمارنده تکرار بدون تولید کارت جدید
      if (existing.count >= 2) {
        return originalToastError(`${cleanMessage} (${existing.count}×)`, {
          ...options,
          id: existing.toastId,
          duration: 3500,
        });
      }
      return existing.toastId;
    }

    // 3. ثبت خطای جدید و نمایش آن
    const toastId = options?.id || `err-${Math.random().toString(36).substring(2, 9)}`;
    recentErrors.set(dedupKey, {
      lastShown: now,
      count: 1,
      toastId,
    });

    // پاکسازی حافظه پس از انقضای پنجره
    setTimeout(() => {
      const entry = recentErrors.get(dedupKey);
      if (entry && Date.now() - entry.lastShown >= DEDUP_WINDOW_MS) {
        recentErrors.delete(dedupKey);
      }
    }, DEDUP_WINDOW_MS + 1000);

    return originalToastError(message, {
      ...options,
      id: toastId,
    });
  };
}
