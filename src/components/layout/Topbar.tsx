// src/components/layout/Topbar.tsx
// نوار بالایی برنامه — با پشتیبانی از سیستم تم
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, useUIStore, THEMES } from '../../store';
import { Search, X, LogOut, Info, Mail, Phone, LayoutDashboard, Maximize2, Minimize2, Menu, Moon, Sun, Calendar, Network, Palette, Check } from 'lucide-react';
import { formatPersianDate, formatPersianDateTime } from '../../utils/persianDate';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useLocation, useNavigate } from 'react-router-dom';

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, periods, activePeriod, setActivePeriod, systemName, darkMode, toggleDarkMode, themeId, setTheme } = useUIStore();
  const [time, setTime] = useState(new Date());
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // بستن منوی تم با کلیک بیرون
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // گوش دادن به تغییرات فول‌اسکرین
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('q');
    setSearchQuery(location.pathname === '/issues' ? query || '' : '');
  }, [location.pathname, location.search]);

  const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch((err: any) => {
      console.error(`Error: ${err.message}`);
    });
  } else {
    document.documentElement.requestFullscreen({
      navigationUI: 'hide'
    }).catch((err: any) => {
      console.error(`Error: ${err.message}`);
    });
  }
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/issues?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (location.pathname === '/issues' && new URLSearchParams(location.search).has('q')) {
      navigate('/issues');
    }
  };

  return (
    <header className="topbar-shell shadow-sm h-16 flex items-center justify-between px-2 sm:px-4 sticky top-0 z-50 transition-colors duration-200">
      {/* بخش چپ */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* عنوان */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex w-8 h-8 rounded-xl brand-gradient items-center justify-center shadow-md">
            <Network size={17} className="text-white" />
          </div>
          <h1 className="hidden sm:block text-xl font-bold tracking-tight text-strong">
            <span className="brand-gradient-text">DANA</span>
          </h1>
          <div className="hidden md:flex items-center before:content-[''] before:w-px before:h-5 before:bg-gray-200 dark:before:bg-[#2d2d44] before:mx-2">
            <div className="w-48 lg:w-60 overflow-hidden relative py-0.5">
              <p className="text-sm whitespace-nowrap animate-marquee cursor-default font-medium" style={{ color: 'var(--text-muted)' }}>
                {systemName || 'سیستم مدیریت دانش و نظام مسائل (دانا)'}
              </p>
            </div>
          </div>
        </div>

        {/* جستجوی سراسری */}
        <div className="hidden lg:flex items-center ml-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو مسائل، اسناد..."
              className="w-64 h-9 pl-10 pr-9 rounded-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-blue-400/50 focus:bg-white dark:focus:bg-[#1a1a2e] text-sm text-gray-800 dark:text-gray-200 transition-all duration-200 outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="پاک کردن جستجو" aria-label="پاک کردن جستجو">
                <X size={15} />
              </button>
            )}
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400">
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* انتخاب دوره زمانی */}
        {periods && periods.length > 0 && (
          <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-3 min-w-0 flex-1 sm:flex-none">
            <Calendar size={16} className="hidden sm:block text-gray-400 shrink-0" />
            {activePeriod && <Check size={15} className="text-emerald-500 shrink-0" aria-label="دوره انتخاب‌شده" />}
            <div className="w-[clamp(4.5rem,24vw,9rem)] sm:w-36 lg:w-56 min-w-0">
              <SearchableSelect
                options={periods.map((p: any) => ({ 
                  value: p.id, 
                  label: `${p.name} ${Number(p.isComplete) === 1 ? '(تکمیل‌شده)' : Number(p.isActive) === 1 ? '(فعال)' : '(غیرفعال)'}`
                }))}
                value={activePeriod?.id || ""}
                onChange={(val) => {
                  const p = periods.find((p: any) => String(p.id) === String(val));
                  if (p) setActivePeriod(p);
                }}
                theme="dark"
                className="min-w-0"
              />
            </div>
          </div>
        )}
        
        {/* دکمه داشبورد */}
        <button
          onClick={() => navigate('/')}
          className="hidden sm:flex p-2 rounded-lg transition-all duration-200"
          style={{ color: 'var(--text-faint)' }}
          title="داشبورد"
        >
          <LayoutDashboard size={18} />
        </button>

        {/* دکمه تم */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200"
          style={{ color: 'var(--text-muted)' }}
          title={darkMode ? 'حالت روز' : 'حالت شب'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* سوئیچر تم (پالت رنگی) */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200"
            style={{ color: 'var(--text-muted)' }}
            title="انتخاب تم ظاهری"
          >
            <Palette size={18} />
          </button>

          {showThemeMenu && (
            <div className="absolute left-0 top-full mt-2 w-64 surface-raised border divider-main rounded-2xl shadow-2xl p-2 z-[60] animate-fade-in">
              <p className="text-xs font-bold px-3 py-2" style={{ color: 'var(--text-faint)' }}>
                انتخاب تم ظاهری
              </p>
              {THEMES.map((theme) => {
                const isActive = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id); setShowThemeMenu(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-right transition-colors ${
                      isActive ? 'menu-item-active' : 'menu-item-idle hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex-shrink-0 shadow-inner border border-white/20"
                      style={{ background: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]})` }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium leading-tight">{theme.name}</span>
                      <span className="block text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>{theme.desc}</span>
                    </span>
                    {isActive && <Check size={16} style={{ color: 'var(--brand-600)' }} />}
                  </button>
                );
              })}
              <div className="border-t divider-main mt-1 pt-1">
                <button
                  onClick={() => { navigate('/settings'); setShowThemeMenu(false); }}
                  className="w-full text-center text-xs py-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                  style={{ color: 'var(--brand-600)' }}
                >
                  تنظیمات بیشتر در بخش تنظیمات ←
                </button>
              </div>
            </div>
          )}
        </div>

        {/* دکمه فول‌اسکرین */}
        <button
          onClick={toggleFullscreen}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200"
          style={{ color: 'var(--text-muted)' }}
          title={isFullscreen ? 'خروج از حالت تمام‌صفحه' : 'حالت تمام‌صفحه'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* بخش راست */}
      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
        {/* تاریخ و ساعت */}
        <div className="hidden md:flex flex-col items-center justify-center text-xs font-medium font-mono leading-tight min-w-[70px]" style={{ color: 'var(--text-muted)' }}>
          <span>{formatPersianDate(time)}</span>
          <span>{formatPersianDateTime(time, 'HH:mm:ss')}</span>
        </div>

        {/* اطلاعات توسعه‌دهنده */}
        <div
          className="hidden lg:flex items-center gap-2"
          onMouseEnter={() => setShowDevInfo(true)}
          onMouseLeave={() => setShowDevInfo(false)}
        >
          <div className="relative group cursor-default">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 hover:border-blue-400/30 transition-colors">
              <Info size={15} className="text-blue-500" />
            </div>
            {/* Tooltip */}
            {showDevInfo && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-2xl p-3 z-50">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-white">توسعه‌دهنده</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="text-blue-400">👨</span>
                    <span>علیرضا لباف</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400" dir="ltr">
                    <Phone size={10} className="text-gray-500" />
                    <span>۰۹۱۹۶۶۰۰۵۴۵</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400" dir="ltr">
                    <Mail size={10} className="text-gray-500" />
                    <span>alirezalf@gmail.com</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* خروج */}
        <div className="flex items-center border-r divider-main pr-2 sm:pr-4">
          <button
            onClick={logout}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title="خروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
