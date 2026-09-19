// src/store.ts
// مدیریت حالت برنامه - اصلاح شده برای سیستم مدیریت دانش

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// Theme System — تعریف تم‌های برنامه
// ============================================

export type ThemeId = 'ocean' | 'emerald' | 'royal' | 'sunset' | 'amber' | 'graphite';

export interface ThemeMeta {
  id: ThemeId;
  name: string;           // نام فارسی
  desc: string;           // توضیح کوتاه
  swatch: string[];       // دو رنگ برای پیش‌نمایش
}

export const THEMES: ThemeMeta[] = [
  { id: 'ocean',    name: 'اقیانوس آبی',  desc: 'آبی و نیلی — پیش‌فرض حرفه‌ای',   swatch: ['#2563eb', '#4f46e5'] },
  { id: 'emerald',  name: 'زمرد سبز',     desc: 'سبز و فیروزه‌ای — آرام و شفاف',  swatch: ['#059669', '#0d9488'] },
  { id: 'royal',    name: 'بنفش سلطنتی',  desc: 'بنفش و سرخابی — مدرن و متمایز',  swatch: ['#7c3aed', '#c026d3'] },
  { id: 'sunset',   name: 'غروب سرخ',     desc: 'قرمز و نارنجی — پرانرژی',        swatch: ['#dc2626', '#ea580c'] },
  { id: 'amber',    name: 'کهربای طلایی', desc: 'طلایی و نارنجی — گرم و کلاسیک',  swatch: ['#b45309', '#d97706'] },
  { id: 'graphite', name: 'گرافیت مدرن',  desc: 'خاکستری و آبی سرد — رسمی و مینیمال', swatch: ['#334155', '#0ea5e9'] },
];

// ============================================
// Auth Store
// ============================================

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  permissions?: string[];
  baseId: number | null;
  unitId: number | null;
  organizationLevel?: string | null;
  phone?: string | null;
  rank?: string | null;
  photoUrl?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => {
        // 🟢 پاک کردن کش‌های انتخاب کاربر هنگام خروج (انتخاب درختواره‌های تحلیل شکاف و...)
        try {
          sessionStorage.removeItem('gap_selected_required_tree');
          sessionStorage.removeItem('gap_selected_produced_tree');
        } catch { /* noop */ }
        set({ user: null, token: null });
      },
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'dana_auth_state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// UI Store
// ============================================

interface UIState {
  // سایدبار
  sidebarOpen: boolean;
  sidebarExpandedItems: string[];
  toggleSidebarItem: (id: string) => void;
  setSidebarExpandedItems: (items: string[]) => void;
  level3Name: string;
  toggleSidebar: () => void;
  
  // درختواره
  selectedTreeId: number | null;
  setSelectedTreeId: (id: number | null) => void;
  
  // درختواره‌ها
  trees: any[];
  fetchTrees: () => Promise<void>;
  
  periods: any[];
  activePeriod: any | null;
  setActivePeriod: (period: any | null) => void;
  fetchPeriods: () => Promise<void>;
  
  bases: any[];
  units: any[];
  fetchOrgData: () => Promise<void>;
  
  // قالب‌ها و سطوح
  templates: any[];
  knowledgeLevels: any[];
  knowledgeTypes: any[];
  fetchMetadata: () => Promise<void>;
  fetchSystemSettings: () => Promise<void>;
  saveSystemSettings: (settings: any) => Promise<void>;
  
  // تنظیمات ظاهری
  siteLogo: string | null;
  setSiteLogo: (logo: string | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  systemName: string;
  setSystemName: (name: string) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
  loginTitle: string;
  setLoginTitle: (title: string) => void;
  sidebarTitle: string;
  setSidebarTitle: (title: string) => void;
  browserTitle: string;
  setBrowserTitle: (title: string) => void;
  
  // بازنشانی
  resetFormState: () => void;
}

const safeFetchJson = async (url: string, options: any = {}) => {
  options.credentials = "include";
  // Add auth header if not present
  const state = useAuthStore.getState();
  if (state.token && (!options.headers || !(options.headers as any).Authorization)) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${state.token}`
    };
  }
  
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-error', { detail: 'نشست شما منقضی شده است. لطفا دوباره وارد شوید.' }));
      } else {
        window.dispatchEvent(new CustomEvent('network-error', { detail: `خطای سرور: ${res.status}` }));
      }
      return null;
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('API returned non-JSON for', url);
      return null;
    }
  } catch (e) {
    console.warn('Network error for', url, e);
    window.dispatchEvent(new CustomEvent('network-error', { detail: 'ارتباط با سرور قطع شده است. لطفا وضعیت شبکه را بررسی کنید.' }));
    return null;
  }
};

const UI_STORAGE_KEY = 'dana_ui_state';

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // سایدبار
      sidebarOpen: true,
      sidebarExpandedItems: [],
      toggleSidebarItem: (id: string) => set((state) => ({ sidebarExpandedItems: state.sidebarExpandedItems.includes(id) ? state.sidebarExpandedItems.filter((i: string) => i !== id) : [...state.sidebarExpandedItems, id] })),
      setSidebarExpandedItems: (items: string[]) => set({ sidebarExpandedItems: items }),
      level3Name: "فصل",
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // درختواره
      selectedTreeId: null,
      setSelectedTreeId: (id) => set({ selectedTreeId: id }),
      
      trees: [],
      fetchTrees: async () => {
        try {
          const data = await safeFetchJson('/api/trees', { cache: 'no-store' });
          if (!data) return;
          set({ trees: Array.isArray(data) ? data : [] });
        } catch (e) {
          console.error('Error fetching trees:', e);
        }
      },
      
      periods: [],
      activePeriod: null,
      setActivePeriod: (period) => {
        set({ activePeriod: period });
        get().fetchTrees();
      },
      fetchPeriods: async () => {
        try {
          const data = await safeFetchJson('/api/periods', { cache: 'no-store' });
          if (!data) return;
          set({ periods: data });
          get().fetchOrgData();
          
          if (data && data.length > 0) {
            set((state) => {
              if (!state.activePeriod) {
                const active = data.find((p: any) => p.isActive === 1) || data[0];
                return { activePeriod: active };
              }
              return {};
            });
          }
        } catch (e) {
          console.error('Error fetching periods:', e);
        }
      },
      
      bases: [],
      units: [],
      fetchOrgData: async () => {
        try {
          const [basesData, unitsData] = await Promise.all([
            safeFetchJson('/api/org/bases', { cache: 'no-store' }),
            safeFetchJson('/api/org/units', { cache: 'no-store' })
          ]);
          set({ 
            bases: Array.isArray(basesData) ? basesData : [],
            units: Array.isArray(unitsData) ? unitsData : []
          });
        } catch (e) {
          console.error('Error fetching org data:', e);
          set({ bases: [], units: [] });
        }
      },
      
      // قالب‌ها و سطوح
      templates: [],
      knowledgeLevels: [],
      knowledgeTypes: [],
      fetchMetadata: async () => {
        try {
          const [templates, levels, types] = await Promise.all([
            safeFetchJson('/api/metadata/templates'),
            safeFetchJson('/api/metadata/levels'),
            safeFetchJson('/api/metadata/knowledge-types')
          ]);
          set({
            templates: Array.isArray(templates) ? templates : [],
            knowledgeLevels: Array.isArray(levels) ? levels : [],
            knowledgeTypes: Array.isArray(types) ? types : [],
          });
        } catch (e) {
          console.error('Error fetching metadata:', e);
        }
      },

      fetchSystemSettings: async () => {
        try {
          const data = await safeFetchJson('/api/metadata/system-settings');
          if (data) {
            if (Object.keys(data).length > 0) {
              set({
                systemName: data.systemName || get().systemName,
                pageTitle: data.pageTitle || get().pageTitle,
                loginTitle: data.loginTitle || get().loginTitle,
                sidebarTitle: data.sidebarTitle || get().sidebarTitle,
                browserTitle: data.browserTitle || get().browserTitle,
                siteLogo: data.siteLogo || get().siteLogo,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching system settings:', error);
        }
      },

      saveSystemSettings: async (settings) => {
        try {
          const data = await safeFetchJson('/api/metadata/system-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          });
          if (data) {
            
            set({
              systemName: data.systemName || settings.systemName,
              pageTitle: data.pageTitle || settings.pageTitle,
              loginTitle: data.loginTitle || settings.loginTitle,
              sidebarTitle: data.sidebarTitle || settings.sidebarTitle,
              browserTitle: data.browserTitle || settings.browserTitle,
              siteLogo: data.siteLogo || settings.siteLogo,
            });
          }
        } catch (error) {
          console.error('Error saving system settings:', error);
          throw error;
        }
      },
      
      // تنظیمات ظاهری
      siteLogo: null,
      setSiteLogo: (logo) => set({ siteLogo: logo }),
      
      darkMode: false,
      toggleDarkMode: () => set((state) => {
        const newDarkMode = !state.darkMode;
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { darkMode: newDarkMode };
      }),

      // --- سیستم تم ---
      themeId: 'ocean',
      setTheme: (id: ThemeId) => {
        document.documentElement.setAttribute('data-theme', id);
        set({ themeId: id });
      },
      
      systemName: 'سیستم مدیریت دانش و نظام مسائل (DANA)',
      setSystemName: (name) => set({ systemName: name }),
      
      pageTitle: 'داشبورد',
      setPageTitle: (title) => set({ pageTitle: title }),
      
      loginTitle: 'سیستم مدیریت دانش و نظام مسائل',
      setLoginTitle: (title) => set({ loginTitle: title }),
      
      sidebarTitle: 'DANA',
      setSidebarTitle: (title) => set({ sidebarTitle: title }),
      
      browserTitle: 'DANA - سیستم مدیریت دانش و نظام مسائل',
      setBrowserTitle: (title) => set({ browserTitle: title }),
      
      resetFormState: () => {
        set({ selectedTreeId: null });
      },
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        selectedTreeId: state.selectedTreeId,
        activePeriod: state.activePeriod,
        siteLogo: state.siteLogo,
        darkMode: state.darkMode,
        themeId: state.themeId,
        systemName: state.systemName,
        pageTitle: state.pageTitle,
        loginTitle: state.loginTitle,
        sidebarTitle: state.sidebarTitle,
        browserTitle: state.browserTitle,
      }),
    }
  )
);

// ============================================
// Security Store
// ============================================

interface SecurityState {
  lockTimerMinutes: number;
  setLockTimerMinutes: (min: number) => void;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      lockTimerMinutes: 15,
      setLockTimerMinutes: (min) => set({ lockTimerMinutes: min }),
      isLocked: false,
      setLocked: (locked) => set({ isLocked: locked }),
    }),
    {
      name: 'dana_security_state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);