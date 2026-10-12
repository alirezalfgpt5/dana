// src/App.tsx
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, useToasterStore } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, Info, LoaderCircle, Network, X } from 'lucide-react';

// محدودکننده تعداد پیام‌های همزمان روی صفحه (حداکثر ۳ پیام همزمان برای جلوگیری از شلوغی رابط کاربری)
function ToastLimiter() {
  const { toasts } = useToasterStore();
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 3)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);
  return null;
}

type ToastItem = ReturnType<typeof useToasterStore>['toasts'][number];

function AppToast({ item }: { item: ToastItem }) {
  const [, setClock] = useState(0);
  const rawDuration = item.duration ?? 5000;
  const duration = Number.isFinite(rawDuration) ? rawDuration : Infinity;
  const elapsed = Math.max(0, Date.now() - item.createdAt - (item.pauseDuration || 0));
  const remaining = Number.isFinite(duration) ? Math.max(0, duration - elapsed) : Infinity;
  const progress = Number.isFinite(duration) && duration > 0
    ? Math.min(100, (elapsed / duration) * 100)
    : 0;
  const palette = item.type === 'success'
    ? { icon: CheckCircle2, color: 'text-emerald-600', bar: 'bg-emerald-500' }
    : item.type === 'error'
      ? { icon: AlertCircle, color: 'text-rose-600', bar: 'bg-rose-500' }
      : item.type === 'loading'
        ? { icon: LoaderCircle, color: 'text-blue-600', bar: 'bg-blue-500' }
        : { icon: Info, color: 'text-indigo-600', bar: 'bg-indigo-500' };
  const Icon = palette.icon;
  const message = typeof item.message === 'function' ? item.message(item) : item.message;

  useEffect(() => {
    if (!Number.isFinite(duration)) return;
    const timer = window.setInterval(() => setClock(value => value + 1), 100);
    return () => window.clearInterval(timer);
  }, [duration, item.id]);

  return (
    <div
      className={`min-w-[min(26rem,calc(100vw-2.5rem))] max-w-[26rem] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-xl ring-1 ring-black/5 transition-all duration-300 ${
        item.visible ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'
      }`}
      role={item.type === 'error' ? 'alert' : 'status'}
      dir="rtl"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon size={20} className={`shrink-0 ${palette.color} ${item.type === 'loading' ? 'animate-spin' : ''}`} />
        <div className="min-w-0 flex-1 text-sm leading-6 text-slate-800">
          {message}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
          {Number.isFinite(remaining) ? `${Math.ceil(remaining / 1000).toLocaleString('fa-IR')} ثانیه` : 'در حال انجام'}
        </span>
        <button
          type="button"
          onClick={() => toast.dismiss(item.id)}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="بستن اعلان"
        >
          <X size={15} />
        </button>
      </div>
      <div className="h-1 overflow-hidden bg-slate-100">
        <div
          className={`h-full ${palette.bar} transition-[width] duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

import { useUIStore, useAuthStore, useSecurityStore } from './store';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { AuthGuard } from './components/layout/AuthGuard';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const UsersManagement = lazy(() => import('./pages/Users').then(module => ({ default: module.UsersManagement })));
const RolesManagement = lazy(() => import('./pages/Roles').then(module => ({ default: module.RolesManagement })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const FilesManagement = lazy(() => import('./pages/Files').then(module => ({ default: module.FilesManagement })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Definitions = lazy(() => import('./pages/Definitions').then(module => ({ default: module.Definitions })));
const OrgStructure = lazy(() => import('./pages/OrgStructure').then(module => ({ default: module.OrgStructure })));
const AuditLog = lazy(() => import('./pages/AuditLog').then(module => ({ default: module.AuditLog })));
const Periods = lazy(() => import('./pages/Periods').then(module => ({ default: module.Periods })));
const TemplatesManagement = lazy(() => import('./pages/Templates').then(module => ({ default: module.TemplatesManagement })));
const RequiredTree = lazy(() => import('./pages/Trees/RequiredTree').then(module => ({ default: module.RequiredTree })));
const ProducedTree = lazy(() => import('./pages/Trees/ProducedTree').then(module => ({ default: module.ProducedTree })));
const GapAnalysis = lazy(() => import('./pages/Gaps/GapAnalysis').then(module => ({ default: module.GapAnalysis })));
const ResearchTree = lazy(() => import('./pages/Research/ResearchTree').then(module => ({ default: module.ResearchTree })));
const IssueSystem = lazy(() => import('./pages/Issues/IssueSystem').then(module => ({ default: module.IssueSystem })));
const Outputs = lazy(() => import('./pages/Outputs/Outputs').then(module => ({ default: module.Outputs })));
const DeepSearch = lazy(() => import('./pages/DeepSearch').then(module => ({ default: module.DeepSearch })));
const DynamicReports = lazy(() => import('./pages/DynamicReports').then(module => ({ default: module.DynamicReports })));
const Guide = lazy(() => import('./pages/Guide').then(module => ({ default: module.Guide })));
const ProcessWizard = lazy(() => import('./pages/Wizard/ProcessWizard').then(module => ({ default: module.ProcessWizard })));
const ProgramMap = lazy(() => import('./pages/ProgramMap').then(module => ({ default: module.ProgramMap })));
const UiTextSettings = lazy(() => import('./pages/UiTextSettings').then(module => ({ default: module.UiTextSettings })));
import { loadUiTextOverrides, translateUiText, UI_TEXT_UPDATED_EVENT } from './utils/uiText';


import { ErrorBoundary } from './components/ErrorBoundary';
import { normalizePermissions } from './config/permissions';

function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  const user = useAuthStore(state => state.user);
  const routePermissions: Record<string, string> = {
    '/wizard': 'wizard',
    '/guide': 'guide',
    '/trees/required': 'required-tree',
    '/trees/produced': 'produced-tree',
    '/gaps': 'gaps',
    '/research': 'research',
    '/issues': 'issues',
    '/outputs': 'outputs',
    '/search': 'search',
    '/dynamic-reports': 'dynamic-reports',
    '/users': 'users',
    '/roles': 'roles',
    '/profile': 'profile',
    '/org-structure': 'org-structure',
    '/periods': 'periods',
    '/files': 'files',
    '/settings': 'settings',
    '/definitions': 'definitions',
    '/templates': 'templates',
    '/audit': 'audit',
  };
  if (normalizedPath === '/program-map' || normalizedPath === '/settings/text') {
    return user?.role === 'superadmin' ? children : <Navigate to="/" replace />;
  }
  const permission = routePermissions[normalizedPath];
  const assigned = normalizePermissions(user?.permissions || []);
  return user?.role === 'superadmin'
    || !permission
    || assigned.includes(permission)
    ? children
    : <Navigate to="/" replace />;
}

export default function App() {
  const [, setUiTextRevision] = useState(0);
  const darkMode = useUIStore((state) => state.darkMode);
  const fetchSystemSettings = useUIStore((state) => state.fetchSystemSettings);
  const fetchMetadata = useUIStore((state) => state.fetchMetadata);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const updateUser = useAuthStore((state) => state.updateUser);

  useEffect(() => {
    const handleUiTextUpdate = () => setUiTextRevision(revision => revision + 1);
    window.addEventListener(UI_TEXT_UPDATED_EVENT, handleUiTextUpdate);
    return () => window.removeEventListener(UI_TEXT_UPDATED_EVENT, handleUiTextUpdate);
  }, []);

  useEffect(() => {
    fetchSystemSettings();
    loadUiTextOverrides().catch(error => {
      console.error('Could not load database-backed UI text overrides:', error);
    });
    // فقط وقتی کاربر لاگین معتبر دارد متادیتا دریافت شود
    if (user && token) {
      fetchMetadata();
    }
  }, [fetchSystemSettings, fetchMetadata, user, token]);

  useEffect(() => {
    if (!user || !token) return;
    (window.customFetch || window.fetch)('/api/auth/permissions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        if (!response.ok) throw new Error('Could not refresh role permissions');
        const result: unknown = await response.json();
        if (
          result
          && typeof result === 'object'
          && 'permissions' in result
          && Array.isArray(result.permissions)
          && result.permissions.every(permission => typeof permission === 'string')
        ) {
          const permissions = result.permissions as string[];
          if (JSON.stringify(user.permissions || []) !== JSON.stringify(permissions)) {
            updateUser({ ...user, permissions });
          }
        }
      })
      .catch(error => console.error('Could not refresh current role permissions:', error));
  }, [user, token, updateUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleAuthError = (e: any) => {
      const path = (window.location.pathname || '/') + (window.location.hash || '');
      const isLogin = path.includes('/login');
      const { user: curUser, token: curToken } = useAuthStore.getState();

      // پاسخ‌های 401 دیررس یا تکراری بعد از شروع قفل نباید کاربر را از نشست خارج کنند.
      if (isLogin || !curUser || !curToken || (window as any)._sessionExpiredHandled) return;

      (window as any)._sessionExpiredHandled = true;
      toast.error(translateUiText(e.detail || 'نشست شما منقضی شده است. لطفا دوباره وارد شوید.'), { id: 'app-auth-expired' });
      useSecurityStore.getState().setLocked(true);
      useAuthStore.setState({ token: null });
    };
    
    const handleNetworkError = (e: any) => {
      toast.error(translateUiText(e.detail || 'خطا در ارتباط با سرور'), { id: 'app-network-error' });
    };

    window.addEventListener('auth-error', handleAuthError);
    window.addEventListener('network-error', handleNetworkError);
    
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.removeEventListener('network-error', handleNetworkError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastLimiter />
        <Toaster
          position="bottom-left"
          reverseOrder
          gutter={10}
          containerStyle={{
            bottom: 20,
            left: 20,
            right: 'auto',
            top: 'auto',
            width: 'max-content',
            alignItems: 'flex-start',
            direction: 'ltr',
          }}
          toastOptions={{
            duration: 5000,
          }}
        >
          {(item) => <AppToast item={item} />}
        </Toaster>
        <Suspense fallback={
          <div className="surface-page flex min-h-screen items-center justify-center p-6" role="status" aria-live="polite">
            <div className="theme-card flex w-full max-w-sm flex-col items-center gap-5 p-8 text-center shadow-xl">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient shadow-lg">
                <Network size={29} className="text-white" />
                <LoaderCircle size={20} className="absolute -bottom-2 -left-2 animate-spin rounded-full bg-[var(--surface-main)] p-0.5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-strong">دانا</h2>
                <p className="mt-1 text-sm text-muted">در حال آماده‌سازی صفحه</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
              </div>
            </div>
          </div>
        }>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<AuthGuard><RoutePermissionGuard><MainLayout /></RoutePermissionGuard></AuthGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="guide" element={<Guide />} />
            <Route path="program-map" element={user?.role === 'superadmin' ? <ProgramMap /> : <Navigate to="/" replace />} />
            <Route path="wizard" element={<ProcessWizard />} />
            
            {/* مدیریت دانش */}
            <Route path="trees" element={<Navigate to="/trees/required" replace />} />
            <Route path="trees/required" element={<RequiredTree />} />
            <Route path="trees/produced" element={<ProducedTree />} />
            <Route path="gaps" element={<GapAnalysis />} />
            <Route path="research" element={<ResearchTree />} />
            <Route path="issues" element={<IssueSystem />} />
            <Route path="outputs" element={<Outputs />} />
            <Route path="search" element={<DeepSearch />} />
            <Route path="dynamic-reports" element={<DynamicReports />} />
            
            {/* مدیریت سیستم */}
            <Route path="users" element={<UsersManagement />} />
            <Route path="roles" element={<RolesManagement />} />
            <Route path="profile" element={<Profile />} />
            <Route path="org-structure" element={<OrgStructure />} />
            <Route path="periods" element={<Periods />} />
            <Route path="files" element={<FilesManagement />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/text" element={user?.role === 'superadmin' ? <UiTextSettings /> : <Navigate to="/" replace />} />
            <Route path="definitions" element={<Definitions />} />
            <Route path="templates" element={<TemplatesManagement />} />
            <Route path="audit" element={<AuditLog />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}