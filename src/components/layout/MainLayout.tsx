// src/components/layout/MainLayout.tsx
// لایه‌بندی اصلی برنامه

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuthStore, useUIStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { CommandPalette } from '../CommandPalette';

export function MainLayout() {
  const { user } = useAuthStore();
  const { fetchPeriods, fetchTrees, fetchOrgData, fetchMetadata, periods, bases, units, themeId, sidebarOpen, toggleSidebar } = useUIStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 🟢 ریسپانسیو: در موبایل/تبلت باریک (زیر md) سایدبار به‌صورت پیش‌فرض بسته می‌ماند تا محتوای اصلی
  // تمام عرض را داشته باشد و کارت‌ها (نوار جستجو و…) از باکس خود بیرون نزنند.
  // اگر کاربر از دکمه منو آن را باز کند، به‌صورت overlay روی محتوا می‌نشیند (نه فشردن محتوا).
  // state از getState() خوانده می‌شود چون در StrictMode این افکت دوبار اجرا می‌شود (closure کهنه نباید toggle را برگرداند).
  useLayoutEffect(() => {
    if (window.innerWidth < 768 && useUIStore.getState().sidebarOpen) {
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // اعمال تم انتخابی روی <html> (حتی اگر از localStorage بازیابی شده باشد)
  useEffect(() => {
    if (themeId) {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  }, [themeId]);

  useEffect(() => {
    if (user) {
      // بارگذاری همزمان همه داده‌ها
      const loadAllData = async () => {
        try {
          await Promise.all([
            fetchPeriods(),
            fetchTrees(),
            fetchOrgData(),
            fetchMetadata(),
          ]);
          setIsDataLoaded(true);
        } catch (error) {
          console.error('Error loading data:', error);
          setIsDataLoaded(true); // حتی با خطا، صفحه را نشان بده
        }
      };
      
      loadAllData();
    }
  }, [user, fetchPeriods, fetchTrees, fetchOrgData, fetchMetadata]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen surface-page flex flex-col font-sans overflow-hidden print:bg-white print:h-auto print:overflow-visible transition-colors duration-200">
      <div className="print:hidden">
        <Topbar />
      </div>

      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <div className="print:hidden max-md:fixed max-md:top-16 max-md:right-0 max-md:bottom-0 max-md:z-40">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 surface-page print:bg-white print:p-0 print:overflow-visible transition-colors duration-200">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0">
            <div className="print:hidden">
              <Breadcrumbs />
            </div>
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}