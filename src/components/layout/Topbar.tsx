// src/components/layout/Topbar.tsx
// نوار بالایی برنامه
import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../../store';
import { Search, LogOut, User as UserIcon, Info, Mail, Phone, LayoutDashboard, Maximize2, Minimize2, Menu, Moon, Sun, Calendar, Network } from 'lucide-react';
import { format } from 'date-fns-jalali';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, periods, activePeriod, setActivePeriod, systemName, darkMode, toggleDarkMode } = useUIStore();
  const [time, setTime] = useState(new Date());
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // گوش دادن به تغییرات فول‌اسکرین
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white/95 dark:bg-[#1e1e2f] backdrop-blur-md shadow-sm border-b border-gray-200/80 dark:border-[#2d2d44] h-16 flex items-center justify-between px-4 sticky top-0 z-50 transition-colors duration-200">
      {/* بخش چپ */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* عنوان */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50">
            <Network size={17} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            <span className="bg-gradient-to-l from-blue-600 to-indigo-600 bg-clip-text text-transparent">DANA</span>
          </h1>
          <div className="hidden md:flex items-center before:content-[''] before:w-px before:h-5 before:bg-gray-200 before:mx-2">
            <div className="w-44 lg:w-56 overflow-hidden relative">
              <p className="text-gray-500 dark:text-gray-300 text-sm whitespace-nowrap animate-[marquee_15s_linear_infinite] hover:animate-none">
                {systemName || 'سیستم مدیریت دانش'}
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
              className="w-64 h-9 pl-10 pr-4 rounded-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-blue-400/50 focus:bg-white dark:focus:bg-[#1a1a2e] text-sm text-gray-800 dark:text-gray-200 transition-all duration-200 outline-none"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400">
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* انتخاب دوره زمانی */}
        {periods && periods.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 mr-4">
            <Calendar size={18} className="text-gray-400" />
            <div className="w-56">
              <SearchableSelect
                options={periods.map((p: any) => ({ 
                  value: p.id, 
                  label: `${p.name} ${p.isActive === 1 ? "(جاری)" : ""}` 
                }))}
                value={activePeriod?.id || ""}
                onChange={(val) => {
                  const p = periods.find((p: any) => String(p.id) === String(val));
                  if (p) setActivePeriod(p);
                }}
                theme="dark"
              />
            </div>
          </div>
        )}
        
        {/* دکمه داشبورد */}
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all duration-200"
          title="داشبورد"
        >
          <LayoutDashboard size={18} />
        </button>

        {/* دکمه تم */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200"
          title={darkMode ? 'حالت روز' : 'حالت شب'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* دکمه فول‌اسکرین */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200"
          title={isFullscreen ? 'خروج از حالت تمام‌صفحه' : 'حالت تمام‌صفحه'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* بخش راست */}
      <div className="flex items-center gap-6">
        {/* تاریخ و ساعت */}
        <div className="hidden md:flex flex-col items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-medium font-mono leading-tight min-w-[70px]">
          <span>{format(time, 'yyyy/MM/dd')}</span>
          <span>{format(time, 'HH:mm:ss')}</span>
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
        <div className="flex items-center border-r border-gray-200 dark:border-[#2d2d44] pr-4">
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
