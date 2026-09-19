// src/components/layout/Sidebar.tsx
// سایدبار اصلی برنامه — با پشتیبانی کامل از سیستم تم

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore, useAuthStore } from '../../store';
import {
  ChevronDown,
  User as UserIcon,
  LogOut,
  Search,
  X,
  Building2,
  LayoutDashboard,
  Settings,
  Layers,
  Users,
  Network,
  FolderTree,
  GitBranch,
  Target,
  Database,
  Shield,
  FileText,
  BarChart3,
  FolderOpen,
  History,
  Calendar,
  HelpCircle,
  Waypoints,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// منوها
// ============================================

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  path?: string;
  children?: MenuItem[];
  roles?: string[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    id: 'wizard',
    label: 'دستیار یکپارچه',
    icon: Waypoints,
    path: '/wizard',
  },
  {
    id: 'knowledge',
    label: 'گامهای حکمرانی دانشی',
    icon: FolderTree,
    children: [
      {
        id: 'required-tree',
        label: 'درختواره مورد نیاز',
        icon: GitBranch,
        path: '/trees/required',
      },
      {
        id: 'produced-tree',
        label: 'درختواره تولیدشده',
        icon: FolderOpen,
        path: '/trees/produced',
      },
      {
        id: 'gaps',
        label: 'تحلیل شکاف',
        icon: Target,
        path: '/gaps',
      },
      {
        id: 'research',
        label: 'درختواره پژوهشی',
        icon: Database,
        path: '/research',
      },
      {
        id: 'issues',
        label: 'نظام مسائل',
        icon: Shield,
        path: '/issues',
      },
      {
        id: 'outputs',
        label: 'خروجی‌ها',
        icon: FileText,
        path: '/outputs',
      },
    ],
  },
    {
    id: 'admin',
    label: 'تعاریف / پیش نیازها',
    icon: Settings,
    roles: ['superadmin'],
    children: [
      {
        id: 'org-structure',
        label: 'ساختار سازمانی',
        icon: Network,
        path: '/org-structure',
      },
      {
        id: 'periods',
        label: 'دوره‌های زمانی',
        icon: Calendar,
        path: '/periods',
      },
      {
        id: 'definitions',
        label: 'تعاریف متغیرها و مفاهیم',
        icon: Layers,
        path: '/definitions',
      },
      {
        id: 'templates',
        label: 'مدیریت قالب‌ها',
        icon: FileText,
        path: '/templates',
      },
    ],
  },
  {
    id: 'tools',
    label: 'تنظیمات و ابزارها',
    icon: BarChart3,
    children: [
      {
        id: 'guide',
        label: 'راهنمای سامانه',
        icon: HelpCircle,
        path: '/guide',
      },
      {
        id: 'files',
        label: 'مدیریت فایل‌ها',
        icon: FolderOpen,
        path: '/files',
      },
      {
        id: 'users',
        label: 'مدیریت کاربران',
        icon: Users,
        path: '/users',
      },
      {
        id: 'roles',
        label: 'نقش‌ها و دسترسی‌ها',
        icon: Shield,
        path: '/roles',
      },
      {
        id: 'settings',
        label: 'تنظیمات عمومی',
        icon: Settings,
        path: '/settings',
      },
      {
        id: 'audit',
        label: 'تاریخچه تغییرات',
        icon: History,
        path: '/audit',
      },
    ],
  }
];

// ============================================
// فیلتر منو بر اساس نقش
// ============================================

const filterMenuByRole = (items: MenuItem[], role: string | null, permissions: string[] = []): MenuItem[] => {
  return items
    .filter(item => {
      if (permissions.includes('all')) return true;
      if (item.path && item.id !== 'dashboard') {
        return permissions.includes(item.id);
      }
      if (item.roles && !item.roles.includes(role || '')) {
        return false;
      }
      return true;
    })
    .map(item => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children, role, permissions) : undefined,
    }))
    .filter(item => {
      if (item.children && item.children.length === 0 && !item.path) return false;
      return true;
    });
};

// ============================================
// کامپوننت TreeNode
// ============================================

interface TreeNodeProps {
  item: MenuItem;
  level: number;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  onNavigate: (path: string) => void;
}

function TreeNode({ item, level, expandedItems, toggleExpand, onNavigate }: TreeNodeProps) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const isActive = item.path ? location.pathname === item.path : false;
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) toggleExpand(item.id);
    if (item.path) onNavigate(item.path);
  };

  return (
    <div className="select-none">
      <div
        className={twMerge(
          'group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer relative',
          isActive
            ? 'menu-item-active shadow-sm'
            : 'menu-item-idle',
          level > 0 ? 'mr-4' : ''
        )}
        style={{ paddingRight: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {/* نشانگر آیتم فعال */}
        {isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-full bg-brand-500" style={{ backgroundColor: 'var(--brand-500)' }} />
        )}
        {Icon && (
          <span className={clsx(
            'flex-shrink-0 p-1 rounded-lg transition-all duration-200',
            isActive
              ? 'text-brand'
              : 'text-faint group-hover:text-main'
          )}
          style={isActive ? { color: 'var(--brand-600)' } : { color: 'var(--text-faint)' }}>
            <Icon size={level === 0 ? 17 : 15} />
          </span>
        )}
        <span className={twMerge('flex-1', level === 0 ? 'text-sm font-medium' : 'text-[13px]')} style={!isActive ? { color: 'var(--text-muted)' } : undefined}>
          {item.label}
        </span>
        {hasChildren && (
          <span className="flex-shrink-0 text-faint transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', color: 'var(--text-faint)' }}>
            <ChevronDown size={15} />
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className={clsx('mt-1 space-y-0.5 animate-fade-in', level > 0 ? 'border-r-2 divider-main mr-4' : '')}>
          {item.children!.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// کامپوننت اصلی Sidebar
// ============================================

export function Sidebar() {
  const { sidebarOpen, siteLogo, systemName, sidebarExpandedItems, toggleSidebarItem, setSidebarExpandedItems } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const expandedItems = useMemo(() => new Set(sidebarExpandedItems), [sidebarExpandedItems]);

  // باز کردن خودکار منو بر اساس مسیر فعلی
  useEffect(() => {
    const currentPath = location.pathname;
    const itemsToExpand = new Set(sidebarExpandedItems);
    let changed = false;

    for (const item of MENU_ITEMS) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === currentPath) {
            if (!itemsToExpand.has(item.id)) {
              itemsToExpand.add(item.id);
              changed = true;
            }
          }
          if (child.children) {
            for (const subChild of child.children) {
              if (subChild.path === currentPath) {
                if (!itemsToExpand.has(item.id)) { itemsToExpand.add(item.id); changed = true; }
                if (!itemsToExpand.has(child.id)) { itemsToExpand.add(child.id); changed = true; }
              }
            }
          }
        }
      }
    }

    if (changed) {
      setSidebarExpandedItems(Array.from(itemsToExpand));
    }
  }, [location.pathname, sidebarExpandedItems, setSidebarExpandedItems]);

  const filteredMenu = useMemo(() => {
    const userRole = user?.role || 'user';
    const permissions = user?.permissions || [];
    if (userRole === 'superadmin' && !permissions.includes('all')) {
      permissions.push('all');
    }
    return filterMenuByRole(MENU_ITEMS, userRole, permissions);
  }, [user]);

  // ============================================
  // جستجو
  // ============================================

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setIsSearching(term.length > 0);

    if (term.length === 0) {
      setSearchResults([]);
      return;
    }

    const results: MenuItem[] = [];
    const searchLower = term.toLowerCase();

    const searchItems = (items: MenuItem[]) => {
      for (const item of items) {
        const labelMatch = item.label.toLowerCase().includes(searchLower);
        if (labelMatch && item.path) {
          results.push({ ...item });
        }
        if (item.children) {
          searchItems(item.children);
        }
      }
    };

    searchItems(filteredMenu);
    setSearchResults(results);
  }, [filteredMenu]);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const toggleExpand = (id: string) => {
    toggleSidebarItem(id);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    clearSearch();
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0 && searchTerm.length > 0) {
      return (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          <Search size={32} className="mx-auto mb-2 opacity-40" />
          <p>نتیجه‌ای برای "<span className="font-medium">{searchTerm}</span>" یافت نشد</p>
        </div>
      );
    }

    return searchResults.map((result, index) => {
      const Icon = result.icon;
      const isActive = result.path ? location.pathname === result.path : false;

      return (
        <div
          key={`${result.id}-${index}`}
          onClick={() => result.path && handleNavigate(result.path)}
          className={twMerge(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer',
            isActive ? 'menu-item-active' : 'menu-item-idle'
          )}
        >
          {Icon && <Icon size={18} className="flex-shrink-0 opacity-60" />}
          <span>{result.label}</span>
        </div>
      );
    });
  };

  // ============================================
  // رندر اصلی
  // ============================================

  return (
    <aside
      className={clsx(
        "sidebar-shell shadow-xl h-[calc(100vh-4rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 flex-shrink-0 flex flex-col",
        sidebarOpen ? "w-72" : "w-0 opacity-0 overflow-hidden"
      )}
    >
      {/* هدر سایدبار — گرادیان برند از تم */}
      <div className="sidebar-header p-5 flex-shrink-0 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          {siteLogo ? (
            <img src={siteLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white/20 backdrop-blur-sm shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Building2 className="text-white" size={22} />
            </div>
          )}
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">DANA</h2>
            <p className="text-white/70 text-xs">{systemName || 'سیستم مدیریت دانش'}</p>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div className="p-3 border-b divider-main flex-shrink-0">
        <div className="relative">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
            style={{ color: searchTerm ? 'var(--brand-500)' : 'var(--text-faint)' }}
          />
          <input
            type="text"
            placeholder="جستجوی سریع..."
            className="input-theme w-full pr-10 pl-9 py-2 text-sm outline-none"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="text-xs mt-1.5 px-1" style={{ color: 'var(--text-faint)' }}>
            {searchResults.length} نتیجه برای "{searchTerm}"
          </div>
        )}
      </div>

      {/* منو — اسکرول ظریف فقط هنگام hover */}
      <div className="flex-1 overflow-y-auto sidebar-hover-scroll p-4">
        {isSearching ? (
          <div className="space-y-1">
            <div className="px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>نتایج جستجو</span>
            </div>
            {renderSearchResults()}
          </div>
        ) : (
          <nav className="space-y-1">
            {filteredMenu.map((item) => (
              <TreeNode
                key={item.id}
                item={item}
                level={0}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>
        )}
      </div>

      {/* فوتر سایدبار */}
      <div className="p-4 border-t divider-main flex-shrink-0" style={{ background: 'var(--surface-soft)' }}>
        <div className="flex flex-col gap-3">
          {/* پروفایل کاربر */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl theme-card card-elevated">
            <div className="relative">
              <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                <UserIcon size={18} />
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-strong">{user?.fullName || 'کاربر مهمان'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.role === 'superadmin' ? 'مدیر کل سیستم' : 'کاربر سیستم'}
              </p>
            </div>
          </div>

          {/* دکمه‌های پایین */}
          <div className="flex gap-2">
            <button
              onClick={() => handleNavigate('/profile')}
              className={twMerge(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                location.pathname === '/profile' ? 'menu-item-active' : 'btn-ghost'
              )}
            >
              <UserIcon size={16} />
              پروفایل
            </button>
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200"
            >
              <LogOut size={16} />
              خروج
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
