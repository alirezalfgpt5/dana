// src/components/layout/MainLayout.tsx
// لایه‌بندی اصلی برنامه

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuthStore, useUIStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { CommandPalette } from '../CommandPalette';
import { AlertTriangle } from 'lucide-react';

export function MainLayout() {
  const { user } = useAuthStore();
  const { fetchPeriods, fetchOrgData, fetchMetadata, themeId, toggleSidebar } = useUIStore();
  const [setupIssues, setSetupIssues] = useState<Array<'structure' | 'period'>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  const refreshSetupIssues = async () => {
    const [periodsLoaded, orgDataLoaded] = await Promise.all([
      fetchPeriods(),
      fetchOrgData(),
    ]);
    if (!periodsLoaded || !orgDataLoaded) return;

    const { periods, bases, units } = useUIStore.getState();
    setSetupIssues([
      ...(bases.length === 0 && units.length === 0 ? ['structure' as const] : []),
      ...(periods.length === 0 ? ['period' as const] : []),
    ]);
  };

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
    let cancelled = false;
    if (user) {
      // بارگذاری همزمان همه داده‌ها
      const loadAllData = async () => {
        try {
          const [periodsLoaded, orgDataLoaded] = await Promise.all([fetchPeriods(), fetchOrgData()]);
          await fetchMetadata();
          if (cancelled || !periodsLoaded || !orgDataLoaded) return;
          const { periods, bases, units } = useUIStore.getState();
          setSetupIssues([
            ...(bases.length === 0 && units.length === 0 ? ['structure' as const] : []),
            ...(periods.length === 0 ? ['period' as const] : []),
          ]);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      
      loadAllData();
    }
    return () => { cancelled = true; };
  }, [user, fetchPeriods, fetchOrgData, fetchMetadata]);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;
    const setupPaths = ['/org-structure', '/periods'];
    if (
      user
      && previousPath !== location.pathname
      && setupPaths.includes(previousPath)
      && !setupPaths.includes(location.pathname)
    ) {
      refreshSetupIssues().catch(error => {
        console.error('Error refreshing setup prerequisites:', error);
      });
    }
  }, [location.pathname, user, fetchPeriods, fetchOrgData]);

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
            {setupIssues.length > 0
              && !['/org-structure', '/periods'].includes(location.pathname) && (
                <aside className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-red-100 p-1.5 text-red-700 dark:bg-red-900 dark:text-red-200">
                      <AlertTriangle size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">پیش‌نیازهای شروع کار</p>
                      <p className="mt-1 text-xs leading-6 text-red-800 dark:text-red-200">
                        برای ثبت و تحلیل اطلاعات، ابتدا {setupIssues.includes('structure') ? 'ساختار سازمانی' : ''}
                        {setupIssues.includes('structure') && setupIssues.includes('period') ? ' و ' : ''}
                        {setupIssues.includes('period') ? 'دورهٔ زمانی' : ''} را تعریف کنید.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {setupIssues.includes('structure') && (
                      <button
                        onClick={() => navigate('/org-structure')}
                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800"
                      >
                        تعریف ساختار سازمانی
                      </button>
                    )}
                    {setupIssues.includes('period') && (
                      <button
                        onClick={() => navigate('/periods')}
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950"
                      >
                        تعریف دورهٔ زمانی
                      </button>
                    )}
                  </div>
                </aside>
              )}
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}