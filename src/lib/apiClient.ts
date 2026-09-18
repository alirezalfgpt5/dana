// src/lib/apiClient.ts
// کلاینت API ساده با مدیریت خطا و toast

import toast from 'react-hot-toast';
import { useAuthStore } from '../store';

interface ApiOptions extends RequestInit {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    ...fetchOptions
  } = options;

  // 🟢 اگر نشست منقضی شده و صفحه قفل است، درخواست‌های جدید زودتر قطع می‌شوند (جلوگیری از طوفان درخواست و پیام تکراری)
  if ((window as any)._sessionExpiredHandled) {
    const { useSecurityStore } = await import('../store');
    if (useSecurityStore.getState().isLocked) {
      throw new Error('Session locked');
    }
  }

  try {
    const isFormData = fetchOptions.body instanceof FormData;
    const customHeaders = (fetchOptions.headers as Record<string, string>) || {};
    const finalHeaders = { ...customHeaders };
    
    // Disable caching to prevent stale data
    if (!fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET') {
      finalHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      finalHeaders['Pragma'] = 'no-cache';
      finalHeaders['Expires'] = '0';
    }
    
    // Inject auth token if it exists
    const token = useAuthStore.getState().token;
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    } else if (isFormData) {
      delete finalHeaders['Content-Type'];
    }

    // 🟢 توکن و user از Store خوانده می‌شود — توکن null یعنی نیاز به قفل صفحه
    const res = await fetch(endpoint, {
      ...fetchOptions,
      headers: finalHeaders,
      cache: 'no-store', // Force no caching at the browser level
    });

    // خواندن پاسخ
    const text = await res.text();

    if (!text) {
      if (showErrorToast) toast.error('پاسخ خالی از سرور');
      throw new Error('پاسخ خالی از سرور');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('خطا در تبدیل پاسخ به JSON:', text);
      if (showErrorToast) toast.error('خطا در پردازش پاسخ سرور');
      throw new Error('خطا در پردازش پاسخ سرور');
    }

    // خطا در پاسخ
    if (!res.ok) {
      // اگر ۴۰۱ بود، فقط یک‌بار پیام بده و به اسکرین‌لاک برو (نه صفحه لاگین)
      if (res.status === 401) {
        // ⚠️ Dedup: فقط اولین ۴۰۱ پیام می‌دهد و قفل می‌کند — نه ۵۰ بار پیام پشت هم
        if (!(window as any)._sessionExpiredHandled) {
          (window as any)._sessionExpiredHandled = true;
          toast.error('نشست شما منقضی شد — برای ادامه، رمز عبور خود را وارد کنید', {
            id: 'session-expired',
            duration: 5000,
          });
          // 🟢 قفل صفحه (اسکرین‌لاک) به‌جای ردن به صفحه لاگین:
          // داده‌ها و وضعیت کاربر حفظ می‌شود و با رمز صحیح ادامه می‌دهد
          import('../store').then(({ useSecurityStore }) => {
            useSecurityStore.getState().setLocked(true);
            // توکن نامعتبر حذف می‌شود اما user و همه stateها حفظ می‌مانند
            useAuthStore.setState({ token: null });
          });
        }
        throw new Error('Unauthorized');
      }
      
      const message = data.message || data.error || 'خطا در ارتباط با سرور';
      if (showErrorToast) toast.error(message);
      throw new Error(message);
    }

    // موفقیت
    if (showSuccessToast) {
      toast.success(successMessage || 'عملیات با موفقیت انجام شد');
    }

    return data;
  } catch (error: any) {
    // خطاهای شبکه
    if (
      error.name === 'TypeError' ||
      error.message === 'Failed to fetch' ||
      error.message.includes('NetworkError')
    ) {
      if (showErrorToast) {
        toast.error('خطا در برقراری ارتباط با سرور (اتصال اینترنت را بررسی کنید)');
      }
    }

    // اگر خطا از قبل toast داشته باشد، دوباره نمایش نده
    if (!error._toastShown && showErrorToast && error.message && error.message !== 'Unauthorized') {
      toast.error(error.message);
      error._toastShown = true;
    }

    throw error;
  }
}

// ============================================
// توابع کمکی
// ============================================

export async function get<T = any>(
  endpoint: string,
  options?: Omit<ApiOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'GET' });
}

export async function post<T = any>(
  endpoint: string,
  data?: any,
  options?: Omit<ApiOptions, 'method' | 'body'>
): Promise<T> {
  const isFormData = data instanceof FormData;
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  });
}

export async function put<T = any>(
  endpoint: string,
  data?: any,
  options?: Omit<ApiOptions, 'method' | 'body'>
): Promise<T> {
  const isFormData = data instanceof FormData;
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  });
}

export async function del<T = any>(
  endpoint: string,
  options?: Omit<ApiOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
}

export default apiClient;