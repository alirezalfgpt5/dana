// src/services/sessionManager.ts
// مدیریت یکپارچه و غیرجزیره‌ای نشست، انقضا و قفل صفحه

import toast from 'react-hot-toast';
import { useAuthStore, useSecurityStore } from '../store';

let handledSessionToken: string | null = null;
let lastExpiredToastTime = 0;

/**
 * مدیریت یکپارچه و مرکزی انقضای نشست کاربر
 * در زمان دریافت خطای ۴۰۱ (انقضای توکن یا دسترسی غیرمجاز)، به جای قفل کردن جزیره‌ای،
 * نشست منقضی‌شده پاک شده و کاربر به صفحه ورود هدایت می‌شود.
 */
export function handleUnauthorizedSession(requestToken: string | null, message?: string): boolean {
  const { user, token } = useAuthStore.getState();
  const pathname = `${window.location.pathname || '/'}${window.location.hash || ''}`;

  // در صفحه لاگین خطای ۴۰۱ به معنی نام کاربری/رمز اشتباه است نه انقضای نشست
  if (pathname.includes('/login')) {
    return false;
  }

  // اگر کاربری لاگین نیست، نشستی وجود ندارد که منقضی شود
  if (!user && !token) {
    return false;
  }

  // اگر توکن درخواست با توکن فعال مغایرت دارد (درخواست قدیمی)
  if (requestToken && token && requestToken !== token) {
    return false;
  }

  const activeToken = token || requestToken;
  if (activeToken && handledSessionToken === activeToken) {
    return true;
  }

  if (activeToken) {
    handledSessionToken = activeToken;
  }

  // خروج تمیز: پاک‌سازی اطلاعات احراز هویت و رفع حالت قفل
  useAuthStore.getState().logout();
  try {
    useSecurityStore.getState().setLocked(false);
  } catch { /* noop */ }

  // نمایش پیام اعلان با ضدتکرار
  const now = Date.now();
  if (now - lastExpiredToastTime > 3000) {
    lastExpiredToastTime = now;
    toast.error(message || 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.', {
      id: 'app-auth-expired',
      duration: 4000,
    });
  }

  // هدایت قطعی به صفحه ورود
  if (!window.location.pathname.includes('/login')) {
    window.location.assign('/login');
  }

  return true;
}

/**
 * بازنشانی وضعیت توکن منقضی‌شده پس از ورود موفق
 */
export function clearExpiredSessionToken(token?: string): void {
  if (!token || handledSessionToken === token) {
    handledSessionToken = null;
  }
}

/**
 * قفل امن صفحه (فقط هنگام حضور کاربر فعال و ورود معتبر)
 */
export function lockSession(): void {
  const { user, token } = useAuthStore.getState();
  if (user && token) {
    useSecurityStore.getState().setLocked(true);
  }
}

/**
 * بازگشایی قفل صفحه و تمدید توکن
 */
export function unlockSession(user: any, token: string): void {
  clearExpiredSessionToken(token);
  useAuthStore.getState().login(user, token);
  try {
    useSecurityStore.getState().setLocked(false);
  } catch { /* noop */ }
}
