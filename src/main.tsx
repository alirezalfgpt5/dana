// src/main.tsx
// نقطه ورودی برنامه

/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useAuthStore } from './store';
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
// Patch Global Fetch for Auth Token Injection
// ============================================
const originalFetch = window.fetch;

window.customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = useAuthStore.getState().token;
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
  
  const options = { ...init };
  const urlString = url.toString();
  const isApiRequest = urlString.startsWith('/api') || urlString.includes('/api/');
  
  if (token && isApiRequest) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  try {
    const res = await originalFetch(input, options);
    
    if (res.status === 401 && isApiRequest) {
      const now = Date.now();
      const lastAuthTime = (window as any)._lastAuthErrorDispatch || 0;
      if (now - lastAuthTime > 4000) {
        (window as any)._lastAuthErrorDispatch = now;
        window.dispatchEvent(new CustomEvent('auth-error', { detail: 'نشست شما منقضی شده است. لطفا دوباره وارد شوید.' }));
      }
    }
    
    return res;
  } catch (err) {
    throw err;
  }
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