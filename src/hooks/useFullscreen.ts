// src/hooks/useFullscreen.ts
import { useState, useCallback, useEffect } from 'react';

/**
 * مدیریت حالت تمام‌صفحه به صورت شبیه‌سازی شده (CSS) 
 * برای جلوگیری از تداخل با حالت تمام‌صفحه نیتیو مرورگر
 */
export function useFullscreen(elementId?: string) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    // در صورت خروج از صفحه یا آنمونت شدن، استایل‌ها را پاک کنیم
    return () => {
      setIsFullscreen(false);
    };
  }, []);

  // اگر elementId داده شده باشد، می‌توانیم کلاس را روی آن اعمال کنیم
  // اما ساده‌تر این است که کامپوننت کلاس `simulated-fullscreen` را خودش به المنت اضافه کند
  
  return { isFullscreen, toggleFullscreen, setIsFullscreen };
}
