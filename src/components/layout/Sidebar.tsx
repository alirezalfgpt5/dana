// src/components/layout/Sidebar.tsx
// سایدبار اصلی برنامه - با منوی کامل

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore, useAuthStore } from '../../store';
import {
  ChevronDown,
  ChevronUp,
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
    label: 'مدیریت دانش',
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
    id: 'tools',
    label: 'ابزارها',
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
    ],
  },
  {
    id: 'admin',
    label: 'مدیریت سیستم',
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
        id: 'audit',
        label: 'تاریخچه تغییرات',
        icon: History,
        path: '/audit',
      },
      {
        id: 'definitions',
        label: 'تعاریف',
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
];

// ============================================
// فیلتر منو بر اساس نقش
// ============================================

const filterMenuByRole = (items: MenuItem[], role: string | null, permissions: string[] = []): MenuItem[] => {
  return items
    .filter(item => {
      // Allow if user has 'all' permission
      if (permissions.includes('all')) return true;

      // If it's a leaf node with a path (and not the dashboard which we'll always allow)
      if (item.path && item.id !== 'dashboard') {
        return permissions.includes(item.id);
      }
      
      // If it's a parent node with roles explicitly defined
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
    
    if (hasChildren) {
      toggleExpand(item.id);
    }
    
    if (item.path) {
      onNavigate(item.path);
    }
  };

  return (
    <div className="select-none">
      <div
        className={twMerge(
          'group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer relative',
          isActive
            ? 'bg-gradient-to-l from-blue-50 to-indigo-50/60 text-blue-700 shadow-sm border border-blue-100'
            : 'hover:bg-gray-100/80 text-gray-700 border border-transparent',
          level > 0 ? 'mr-4' : ''
        )}
        style={{ paddingRight: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {/* نشانگر آیتم فعال */}
        {isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-full bg-gradient-to-b from-blue-500 to-indigo-500" />
        )}
        {Icon && (
          <span className={clsx(
            'flex-shrink-0 p-1 rounded-lg transition-all duration-200',
            isActive
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-200/60'
          )}>
            <Icon size={level === 0 ? 17 : 15} />
          </span>
        )}
        <span className={twMerge('flex-1', level === 0 ? 'text-sm font-medium' : 'text-[13px] text-gray-600')}>
          {item.label}
        </span>
        {hasChildren && (
          <span className="flex-shrink-0 text-gray-300 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
            <ChevronDown size={15} />
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className={clsx('mt-1 space-y-0.5 animate-fade-in', level > 0 ? 'border-r-2 border-gray-200/50 mr-4' : '')}>
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
    // Superadmin has all permissions by default
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

  // ============================================
  // باز/بسته کردن منوها
  // ============================================

  const toggleExpand = (id: string) => {
    toggleSidebarItem(id);
  };

  // ============================================
  // ناوبری
  // ============================================

  const handleNavigate = (path: string) => {
    navigate(path);
    clearSearch();
  };

  // ============================================
  // رندر نتایج جستجو
  // ============================================

  const renderSearchResults = () => {
    if (searchResults.length === 0 && searchTerm.length > 0) {
      return (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          <Search size={32} className="mx-auto mb-2 text-gray-300" />
          <p>نتیجه‌ای برای "<span className="font-medium text-gray-600">{searchTerm}</span>" یافت نشد</p>
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
            isActive
              ? 'bg-blue-50 text-blue-700 border border-blue-100/50'
              : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
          )}
        >
          {Icon && <Icon size={18} className="flex-shrink-0 text-gray-400" />}
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
        "bg-white border-l border-gray-200/70 shadow-xl h-[calc(100vh-4rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 flex-shrink-0 flex flex-col",
        sidebarOpen ? "w-72" : "w-0 opacity-0 overflow-hidden"
      )}
    >
      {/* هدر سایدبار */}
      <div className="p-5 border-b border-gray-200/70 bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-600 flex-shrink-0 relative overflow-hidden">
        {/* الگوی تزئینی ظریف */}
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
            <p className="text-blue-200 text-xs">{systemName || 'سیستم مدیریت دانش'}</p>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div className="p-3 border-b border-gray-200/80 flex-shrink-0">
        <div className="relative">
          <Search
            size={18}
            className={clsx(
              "absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
              searchTerm ? 'text-blue-500' : 'text-gray-400'
            )}
          />
          <input
            type="text"
            placeholder="جستجوی سریع..."
            className="w-full pr-10 pl-9 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="text-xs text-gray-400 mt-1.5 px-1">
            {searchResults.length} نتیجه برای "{searchTerm}"
          </div>
        )}
      </div>

      {/* منو */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4">
        {isSearching ? (
          <div className="space-y-1">
            <div className="px-3 py-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">نتایج جستجو</span>
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
      <div className="p-4 border-t border-gray-200/70 bg-gradient-to-b from-gray-50 to-white flex-shrink-0">
        <div className="flex flex-col gap-3">
          {/* پروفایل کاربر */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white shadow-sm border border-gray-200/70 card-elevated">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                <UserIcon size={18} />
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user?.fullName || 'کاربر مهمان'}</p>
              <p className="text-xs text-gray-500">
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
                location.pathname === '/profile'
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200"
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