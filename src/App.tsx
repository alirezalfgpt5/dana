// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import toast from 'react-hot-toast';

import { useUIStore, useAuthStore } from './store';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UsersManagement } from './pages/Users';
import { RolesManagement } from './pages/Roles';
import { Profile } from './pages/Profile';
import { FilesManagement } from './pages/Files';
import { Settings } from './pages/Settings';
import { Definitions } from './pages/Definitions';
import { OrgStructure } from './pages/OrgStructure';
import { AuditLog } from './pages/AuditLog';
import { Periods } from './pages/Periods';
import { TemplatesManagement } from './pages/Templates';
import { AuthGuard } from './components/layout/AuthGuard';

// صفحات مدیریت دانش
import { RequiredTree } from './pages/Trees/RequiredTree';
import { ProducedTree } from './pages/Trees/ProducedTree';
import { GapAnalysis } from './pages/Gaps/GapAnalysis';
import { ResearchTree } from './pages/Research/ResearchTree';
import { IssueSystem } from './pages/Issues/IssueSystem';
import { Outputs } from './pages/Outputs/Outputs';
import { DeepSearch } from './pages/DeepSearch';
import { DynamicReports } from './pages/DynamicReports';
import { Guide } from './pages/Guide';
import { ProcessWizard } from './pages/Wizard/ProcessWizard';


import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const darkMode = useUIStore((state) => state.darkMode);
  const fetchSystemSettings = useUIStore((state) => state.fetchSystemSettings);
  const fetchMetadata = useUIStore((state) => state.fetchMetadata);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    fetchSystemSettings();
    fetchMetadata();
  }, [fetchSystemSettings, fetchMetadata]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleAuthError = (e: any) => {
      toast.error(e.detail || 'نشست شما منقضی شده است');
      logout();
    };
    
    const handleNetworkError = (e: any) => {
      toast.error(e.detail || 'خطا در ارتباط با سرور');
    };

    window.addEventListener('auth-error', handleAuthError);
    window.addEventListener('network-error', handleNetworkError);
    
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.removeEventListener('network-error', handleNetworkError);
    };
  }, [logout]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ className: 'font-sans rtl' }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="guide" element={<Guide />} />
            <Route path="wizard" element={<ProcessWizard />} />
            
            {/* مدیریت دانش */}
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
            <Route path="definitions" element={<Definitions />} />
            <Route path="templates" element={<TemplatesManagement />} />
            <Route path="audit" element={<AuditLog />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}