// src/main.tsx
// نقطه ورودی برنامه

/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useAuthStore, dispatchAuthError } from './store';
import { initToastDeduplication } from './lib/toastInterceptor';
import { initClientErrorHandling } from './lib/clientLogger';

// فعال‌سازی سیستم هوشمند مهار لوپ خطا و مدیریت استثناها
initToastDeduplication();
initClientErrorHandling();

// ============================================
// بررسی وجود المنت ریشه
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found!');
}

// ============================================
// اعمال تم و حالت شب ذخیره‌شده (قبل از رندر — ضد فلش)
// ============================================

try {
  const stored = JSON.parse(localStorage.getItem('dana_ui_state') || '{}');
  const persisted = (stored?.state || {}) as { darkMode?: boolean; themeId?: string };
  if (persisted.darkMode) document.documentElement.classList.add('dark');
  document.documentElement.setAttribute('data-theme', String(persisted.themeId || 'ocean'));
} catch { /* noop */ }

// ============================================
// Patch Global Fetch for Auth Token Injection & Cold-Start Auto-Retry
// ============================================
const originalFetch = window.fetch;

window.customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = useAuthStore.getState().token;
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
  
  const options = { ...init };
  const urlString = url.toString();
  const isApiRequest = urlString.startsWith('/api') || urlString.includes('/api/');
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  
  if (token && isApiRequest) {
    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headers;
  }
  
  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      const res = await originalFetch(input, options);
      
      if (res.status === 401 && isApiRequest) {
        // برای روت لاگین یا تنظیمات عمومی نیازی به پرتاب رویداد انقضای نشست نیست
        if (!urlString.includes('/api/auth/login') && !urlString.includes('/api/metadata/system-settings')) {
          dispatchAuthError('نشست شما منقضی شده است. لطفا دوباره وارد شوید.');
        }
      }
      
      // اگر در درخواست GET سرور به دلیل بیداری اولیه کانتینر کدهای 502/503/504 داد، با یک وقفه کوتاه بازآزمایی می‌شود
      if (isApiRequest && isGet && (res.status === 502 || res.status === 503 || res.status === 504) && attempt < 1) {
        await new Promise((r) => setTimeout(r, 600));
        return attemptFetch(attempt + 1);
      }
      
      return res;
    } catch (err: any) {
      if (isApiRequest && isGet && attempt < 1) {
        await new Promise((r) => setTimeout(r, 600));
        return attemptFetch(attempt + 1);
      }
      throw err;
    }
  };
  
  return attemptFetch(0);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: window.customFetch,
    configurable: true,
    writable: true
  });
} catch (e) {
  console.warn('Could not patch window.fetch. Using window.customFetch fallback.', e);
}


// ============================================
// رندر برنامه
// ============================================

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ============================================
// گزارش وضعیت در کنسول (توسعه)
// ============================================

if (import.meta.env.DEV) {
  console.log('🚀 DANA - سیستم مدیریت دانش و نظام مسائل');
  console.log('📚 نسخه: 3.0.0');
  console.log('🌐 محیط: توسعه');
  console.log('📅 تاریخ: ' + new Date().toLocaleDateString('fa-IR'));
}