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
      toast.error('نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
      useAuthStore.getState().logout();
      // با delay کوچیک هدایت کن تا toast دیده بشه
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
    
    const message = error.response?.data?.error || 
                    error.response?.data?.message || 
                    error.message || 
                    'خطا در ارتباط با سرور';
    
    // خطاهای ۴۰۰ و ۵۰۰ را با toast نمایش نده (برای مدیریت در کامپوننت)
    if (error.response?.status >= 500) {
      toast.error('خطای سرور. لطفاً مجدداً تلاش کنید.');
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;