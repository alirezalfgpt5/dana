// src/components/layout/MainLayout.tsx
// لایه‌بندی اصلی برنامه

import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuthStore, useUIStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { CommandPalette } from '../CommandPalette';

export function MainLayout() {
  const { user } = useAuthStore();
  const { fetchPeriods, fetchTrees, fetchOrgData, fetchMetadata, periods, bases, units } = useUIStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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
    <div className="h-screen bg-gray-50 dark:bg-[#12121a] flex flex-col font-sans overflow-hidden print:bg-white print:h-auto print:overflow-visible transition-colors duration-200">
      <div className="print:hidden">
        <Topbar />
      </div>

      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100 dark:bg-[#12121a] print:bg-white print:p-0 print:overflow-visible transition-colors duration-200">
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