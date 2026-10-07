import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { useUIStore } from '../../store';

const routeNames: Record<string, string> = {
  '/': 'داشبورد',
  '/guide': 'راهنمای سامانه',
  '/wizard': 'دستیار یکپارچه',
  '/trees': 'درختواره‌ها',
  '/trees/required': 'درختواره مورد نیاز',
  '/trees/produced': 'درختواره تولیدشده',
  '/gaps': 'تحلیل شکاف',
  '/research': 'درختواره پژوهشی',
  '/issues': 'نظام مسائل',
  '/outputs': 'مدیریت خروجی‌ها',
  '/search': 'جستجوی عمیق',
  '/dynamic-reports': 'گزارش‌ساز پویا',
  '/users': 'مدیریت کاربران',
  '/roles': 'نقش‌ها و دسترسی‌ها',
  '/profile': 'پروفایل کاربری',
  '/org-structure': 'ساختار سازمانی',
  '/periods': 'دوره‌های زمانی',
  '/files': 'مدیریت فایل‌ها',
  '/settings': 'تنظیمات عمومی',
  '/definitions': 'تعاریف متغیرها و مفاهیم',
  '/templates': 'مدیریت قالب‌ها',
  '/audit': 'تاریخچه تغییرات',
};

export function Breadcrumbs() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const treeIdParam = searchParams.get('treeId');
  const trees = useUIStore((state) => state.trees);
  
  const pathnames = location.pathname.split('/').filter((x) => x);

  // در صفحه اصلی داشبورد برادکرامپ نیازی نیست
  if (location.pathname === '/') {
    return null;
  }

  // نام درختواره انتخابی در صورت وجود
  let activeTreeName: string | null = null;
  if (treeIdParam) {
    const foundTree = trees.find((t) => String(t.id) === String(treeIdParam));
    activeTreeName = foundTree?.name || `درختواره #${treeIdParam}`;
  }

  let currentPath = '';

  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 bg-white dark:bg-[#1e1e2f] px-4 py-3 rounded-xl shadow-sm border border-gray-100 dark:border-[#2d2d44] flex-wrap gap-y-1">
      <Link to="/" className="flex items-center hover:text-blue-500 transition-colors">
        <Home size={16} className="ml-1" />
        <span>خانه</span>
      </Link>
      
      {pathnames.map((name, index) => {
        currentPath += `/${name}`;
        const isLast = index === pathnames.length - 1;
        const routeName = routeNames[currentPath] || name;

        // اگر آخرین بخش است و درختواره‌ای انتخاب شده باشد، بخش جاری باید لینک به ایندکس باشد
        if (isLast && activeTreeName) {
          return (
            <React.Fragment key={currentPath}>
              <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
              <Link to={currentPath} className="hover:text-blue-500 transition-colors">
                {routeName}
              </Link>
              <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
              <span className="text-gray-800 dark:text-gray-200 font-bold truncate max-w-xs sm:max-w-md">
                {activeTreeName}
              </span>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={currentPath}>
            <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
            {isLast ? (
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {routeName}
              </span>
            ) : (
              <Link to={currentPath} className="hover:text-blue-500 transition-colors">
                {routeName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
