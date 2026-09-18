// src/config/menuConfig.ts
import {
  LayoutDashboard,
  Users,
  Settings,
  FolderOpen,
  Network,
  BarChart3,
  History,
  Calendar,
  GitBranch,
  Target,
  FileText,
  Database,
  PieChart,
  Shield,
  FolderTree, Search, Waypoints
} from 'lucide-react';

export interface SubMenuItem {
  label: string;
  id?: string;
  path: string;
  icon?: React.ComponentType<any> | null;
  roles?: string[];
  submenus?: SubMenuItem[];
  onClick?: () => void;
}

export interface MenuItem {
  label: string;
  icon: React.ComponentType<any> | null;
  path?: string;
  color?: string;
  roles?: string[];
  submenus?: SubMenuItem[];
  onClick?: () => void;
}

export interface MenuGroup {
  id: string;
  label: string | null;
  items: MenuItem[];
  roles?: string[];
}

export const MENU_CONFIG: MenuGroup[] = [
  {
    id: 'dashboard',
    label: null,
    items: [
      { 
        label: 'داشبورد', 
        path: '/', 
        icon: LayoutDashboard, 
        color: 'text-blue-500' 
      },
      { 
        label: 'دستیار یکپارچه', 
        path: '/wizard', 
        icon: Waypoints, 
        color: 'text-purple-500' 
      },
    ]
  },
  
  {
    id: 'knowledge',
    label: 'مدیریت دانش',
    items: [
      { 
        label: 'درختواره مورد نیاز', 
        path: '/trees/required', 
        icon: GitBranch,
        color: 'text-blue-600'
      },
      { 
        label: 'درختواره تولیدشده', 
        path: '/trees/produced', 
        icon: FolderOpen,
        color: 'text-green-600'
      },
      { 
        label: 'تحلیل شکاف', 
        path: '/gaps', 
        icon: Target,
        color: 'text-red-600'
      },
      { 
        label: 'درختواره پژوهشی', 
        path: '/research', 
        icon: Database,
        color: 'text-purple-600'
      },
      { 
        label: 'نظام مسائل', 
        path: '/issues', 
        icon: Shield,
        color: 'text-amber-600'
      },
      { 
        label: 'خروجی‌ها', 
        path: '/outputs', 
        icon: FileText,
        color: 'text-gray-600'
      }
    ]
  },
  
  {
    id: 'tools',
    label: 'ابزارها',
        items: [
      { 
        label: 'جستجوی عمیق', 
        path: '/search', 
        icon: Search,
        color: 'text-indigo-500'
      },
      { 
        label: 'گزارش‌ساز پویا', 
        path: '/dynamic-reports', 
        icon: PieChart,
        color: 'text-teal-500'
      },
      { 
        label: 'مدیریت فایل‌ها', 
        path: '/files', 
        icon: FolderOpen,
        color: 'text-gray-500'
      },
      { 
        label: 'تنظیمات عمومی', 
        path: '/settings', 
        icon: Settings,
        color: 'text-gray-600'
      },
    ]
  },
  
  {
    id: 'admin',
    label: 'مدیریت سیستم',
    roles: ['superadmin'],
    items: [
      { 
        label: 'مدیریت سیستم', 
        icon: Settings,
        color: 'text-purple-500',
        submenus: [
          { label: 'ساختار سازمانی', path: '/org-structure', icon: Network },
          { label: 'مدیریت کاربران', path: '/users', icon: Users },
          { label: 'دوره‌های زمانی', path: '/periods', icon: Calendar },
          { label: 'تاریخچه تغییرات', path: '/audit', icon: History },
        ]
      }
    ]
  }
];