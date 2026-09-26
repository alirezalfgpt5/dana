// src/services/api.ts
import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: '',
  timeout: 15000,
});

import { useAuthStore } from '../store';

// Interceptor برای افزودن توکن
api.interceptors.request.use((config) => {
  try {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Error reading token', e);
  }
  return config;
}, (error) => Promise.reject(error));

let isAuthRedirecting = false;

// Interceptor برای مدیریت پاسخ‌ها - اینجا response.data رو برگردون
api.interceptors.response.use(
  (response) => {
    // اگر response.data وجود داشته باشه و آرایه باشه، برگردون
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }
    // اگر response.data وجود نداشت، کل response رو برگردون
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 🟢 بدون نشست فعال یا در مسیر عمومی لاگین، ۴۰۱ طبیعی است و نباید پیام انقضای نشست بدهد
      const currentPath = (window.location.pathname || '/') + (window.location.hash || '');
      const onPublicRoute = currentPath.includes('/login');
      const { user, token } = useAuthStore.getState();
      const hasSession = !!(user && token);
      if (hasSession && !onPublicRoute && !isAuthRedirecting) {
        isAuthRedirecting = true;
        toast.error('نشست شما منقضی شده است. لطفاً دوباره وارد شوید.', { id: 'app-auth-expired' });
        useAuthStore.getState().logout();
        setTimeout(() => {
          isAuthRedirecting = false;
          window.location.href = '/login';
        }, 1500);
      } else if (!hasSession || onPublicRoute) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(new Error('Unauthorized'));
    }
    
    const message = error.response?.data?.error || 
                    error.response?.data?.message || 
                    error.message || 
                    'خطا در ارتباط با سرور';
    
    // خطاهای سرور (۵۰۰) با آیدی یکتا برای جلوگیری از تکرار چندگانه
    if (error.response?.status >= 500) {
      toast.error('خطای سرور. لطفاً مجدداً تلاش کنید.', { id: 'server-500-error' });
    }
    
    const err = new Error(message);
    (err as any)._toastShown = true;
    return Promise.reject(err);
  }
);

export default api;