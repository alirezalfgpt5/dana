import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { useUIStore } from '../../store';

const routeNames: Record<string, string> = {
  '/': 'داشبورد',
  '/guide': 'راهنمای سامانه',
  '/wizard': 'دستیار یکپارچه',
  '/trees': 'درختواره‌ها',
  '/trees/required': 'درختواره‌های مورد نیاز',
  '/trees/produced': 'درختواره‌های تولیدشده',
  '/gaps': 'تحلیل شکاف',
  '/research': 'درختواره‌های پژوهشی',
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
  '/definitions': 'تعاریف پایه',
  '/templates': 'مدیریت قالب‌ها',
  '/audit': 'تاریخچه تغییرات',
};

// کش درون‌برنامه‌ای نام درختواره‌ها برای بارگذاری بلادرنگ در برادکرامپ
const memoryTreeCache: Record<string, string> = {};

export function Breadcrumbs() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const treeIdParam = searchParams.get('treeId');
  const trees = useUIStore((state) => state.trees);
  const [treeNameCache, setTreeNameCache] = useState<Record<string, string>>(memoryTreeCache);
  
  const pathnames = location.pathname.split('/').filter((x) => x);

  // بارگذاری نام درختواره در صورت نبود در استور
  useEffect(() => {
    if (!treeIdParam) return;

    // ۱. بررسی در استور سراسری
    const found = trees.find((t) => String(t.id) === String(treeIdParam));
    if (found?.name) {
      memoryTreeCache[treeIdParam] = found.name;
      setTreeNameCache((prev) => ({ ...prev, [treeIdParam]: found.name }));
      return;
    }

    // ۲. بررسی در کش حافظه
    if (memoryTreeCache[treeIdParam]) {
      setTreeNameCache((prev) => ({ ...prev, [treeIdParam]: memoryTreeCache[treeIdParam] }));
      return;
    }

    // ۳. واکشی مستقیم از سرور
    let isMounted = true;
    fetch(`/api/trees/${treeIdParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.name) {
          memoryTreeCache[treeIdParam] = data.name;
          setTreeNameCache((prev) => ({ ...prev, [treeIdParam]: data.name }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [treeIdParam, trees]);

  // نام درختواره انتخابی در صورت وجود
  let activeTreeName: string | null = null;
  if (treeIdParam) {
    const foundTree = trees.find((t) => String(t.id) === String(treeIdParam));
    activeTreeName = foundTree?.name || treeNameCache[treeIdParam] || `درختواره #${treeIdParam}`;
  }

  // در صفحه اصلی داشبورد برادکرامپ نیازی نیست
  if (location.pathname === '/') {
    return null;
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

        // بخش «درختواره‌ها» به عنوان سرفصل دسته‌بندی است و مسیر مستقل ندارد
        if (currentPath === '/trees') {
          return (
            <React.Fragment key={currentPath}>
              <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {routeName}
              </span>
            </React.Fragment>
          );
        }

        // اگر آخرین بخش است و درختواره‌ای انتخاب شده باشد، بخش جاری باید لینک به ایندکس باشد
        if (isLast && activeTreeName) {
          return (
            <React.Fragment key={currentPath}>
              <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
              <Link to={currentPath} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                {routeName}
              </Link>
              <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
              <span className="text-blue-700 dark:text-blue-300 font-bold truncate max-w-xs sm:max-w-md bg-blue-50/70 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                {activeTreeName}
              </span>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={currentPath}>
            <ChevronLeft size={16} className="mx-2 text-gray-300 dark:text-gray-600" />
            {isLast ? (
              <span className="text-gray-800 dark:text-gray-200 font-bold">
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
