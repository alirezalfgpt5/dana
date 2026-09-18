// src/main.tsx
// نقطه ورودی برنامه

/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useAuthStore } from './store';

// ============================================
// بررسی وجود المنت ریشه
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found!');
}

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
      window.dispatchEvent(new CustomEvent('auth-error', { detail: 'نشست شما منقضی شده است. لطفا دوباره وارد شوید.' }));
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