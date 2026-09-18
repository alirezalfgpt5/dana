import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/': 'داشبورد',
  '/guide': 'راهنما',
  '/wizard': 'مراحل فرآیند',
  '/trees': 'درختواره‌ها',
  '/trees/required': 'درختواره نیازمندی‌ها',
  '/trees/produced': 'درختواره تولیدات',
  '/gaps': 'تحلیل شکاف',
  '/research': 'درختواره پژوهشی',
  '/issues': 'نظام مسائل',
  '/outputs': 'مدیریت خروجی‌ها',
  '/search': 'جستجوی عمیق',
  '/dynamic-reports': 'گزارش‌ساز پویا',
  '/users': 'مدیریت کاربران',
  '/roles': 'مدیریت نقش‌ها',
  '/profile': 'پروفایل کاربری',
  '/org-structure': 'ساختار سازمانی',
  '/periods': 'دوره‌های زمانی',
  '/files': 'مدیریت فایل‌ها',
  '/settings': 'تنظیمات',
  '/definitions': 'تعاریف پایه',
  '/templates': 'قالب‌های اطلاعاتی',
  '/audit': 'لاگ سیستم',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If we are at root dashboard, don't show complex breadcrumbs
  if (location.pathname === '/') {
    return null;
  }

  let currentPath = '';

  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 bg-white dark:bg-[#1e1e2f] px-4 py-3 rounded-xl shadow-sm border border-gray-100 dark:border-[#2d2d44]">
      <Link to="/" className="flex items-center hover:text-blue-500 transition-colors">
        <Home size={16} className="ml-1" />
        <span>خانه</span>
      </Link>
      
      {pathnames.map((name, index) => {
        currentPath += `/${name}`;
        const isLast = index === pathnames.length - 1;
        const routeName = routeNames[currentPath] || name;

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
