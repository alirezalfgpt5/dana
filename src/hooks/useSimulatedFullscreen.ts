// src/hooks/useSimulatedFullscreen.ts
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * مدیریت حالت تمام‌صفحه به صورت شبیه‌سازی شده (CSS) 
 * جلوگیری از تداخل با حالت تمام‌صفحه نیتیو مرورگر که در تاپ‌بار استفاده می‌شود
 */
export function useSimulatedFullscreen(elementId?: string) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    // پیدا کردن المنت مورد نظر اگر آیدی داده شده باشد
    if (elementId) {
      elementRef.current = document.getElementById(elementId);
    }
  }, [elementId, isFullscreen]);

  useEffect(() => {
    if (elementRef.current) {
      if (isFullscreen) {
        elementRef.current.classList.add('simulated-fullscreen');
      } else {
        elementRef.current.classList.remove('simulated-fullscreen');
      }
    }
    
    // اگر المنت مشخص نشده باشد، این هوک فقط مقدار بولین را برمی‌گرداند 
    // تا کامپوننت کلاس `simulated-fullscreen` را خودش اعمال کند
    
    return () => {
      if (elementRef.current) {
         elementRef.current.classList.remove('simulated-fullscreen');
      }
    };
  }, [isFullscreen]);

  return { isFullscreen, toggleFullscreen, setIsFullscreen };
}
