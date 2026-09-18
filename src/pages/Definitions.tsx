// src/pages/Settings.tsx
// تنظیمات سیستم - با مدیریت قالب‌ها و سطوح

import React, { useState, useEffect } from 'react';
import { 
  Save, Settings as SettingsIcon, Shield,
  Image, RefreshCw, CheckCircle,
  Plus, Trash2, Edit, X,
  Layers, Tag, Building2, 
} from 'lucide-react';
import { useSecurityStore, useUIStore } from '../store';
import { DynamicMetadataManager } from '../components/DynamicMetadataManager';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

type TabType = 'general' | 'security';

type DefTabType = string;
export function Definitions() {
  const { 
    systemName, setSystemName,
    pageTitle, setPageTitle,
    loginTitle, setLoginTitle,
    sidebarTitle, setSidebarTitle,
    browserTitle, setBrowserTitle,
    siteLogo, setSiteLogo 
  } = useUIStore();
  
  const { lockTimerMinutes, setLockTimerMinutes } = useSecurityStore();

  const [activeTab, setActiveTab] = useState<DefTabType>('levels');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // State برای مدیریت قالب‌ها
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ type: '', title: '', description: '' });

  // State برای مدیریت سطوح
  const [levels, setLevels] = useState<any[]>([]);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [levelForm, setLevelForm] = useState({ name: '', description: '' });

  // State برای مدیریت انواع دانش
  const [knowledgeTypes, setKnowledgeTypes] = useState<any[]>([]);
  const [editingKnowledgeType, setEditingKnowledgeType] = useState<any>(null);
  const [showKnowledgeTypeForm, setShowKnowledgeTypeForm] = useState(false);
  const [knowledgeTypeForm, setKnowledgeTypeForm] = useState({ name: '', category: '' });

  // State برای مدیریت سطوح سازمانی
  const [orgLevels, setOrgLevels] = useState<any[]>([]);
  const [editingOrgLevel, setEditingOrgLevel] = useState<any>(null);
  const [showOrgLevelForm, setShowOrgLevelForm] = useState(false);
  const [orgLevelForm, setOrgLevelForm] = useState({ name: '', description: '' });
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({isOpen: false, action: null, message: ''});

  // فرم عمومی
  

  const [logoBase64, setLogoBase64] = useState<string | null>(siteLogo);

  // ============================================
  // بارگذاری داده‌ها
  // ============================================
  useEffect(() => {
    fetchTemplates();
    fetchLevels();
    fetchKnowledgeTypes();
    fetchOrgLevels();
  }, []);


  const fetchTemplates = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/metadata/templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchLevels = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/metadata/levels');
      const data = await res.json();
      setLevels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching levels:', error);
    }
  };

  const fetchKnowledgeTypes = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/metadata/knowledge-types');
      const data = await res.json();
      setKnowledgeTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching knowledge types:', error);
    }
  };

  const fetchOrgLevels = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/metadata/org-levels');
      const data = await res.json();
      setOrgLevels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching organizational levels:', error);
    }
  };

  // ============================================
  // مدیریت قالب‌ها
  // ============================================

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.type || !templateForm.title) {
      toast.error('نوع و عنوان قالب الزامی است');
      return;
    }

    setLoading(true);
    try {
      const url = editingTemplate ? `/api/metadata/templates/${editingTemplate.id}` : '/api/metadata/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (!res.ok) throw new Error('خطا در ذخیره قالب');

      toast.success(editingTemplate ? 'قالب با موفقیت ویرایش شد' : 'قالب با موفقیت ایجاد شد');
      setShowTemplateForm(false);
      setTemplateForm({ type: '', title: '', description: '' });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره قالب');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteTemplate = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این قالب اطمینان دارید؟',
      action: async () => {
        try {
          const res = await(window.customFetch || window.fetch)(`/api/metadata/templates/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'خطا در حذف قالب');
          }
          toast.success('قالب با موفقیت حذف شد');
          fetchTemplates();
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف قالب');
        }
      }
    });
  };

  // ============================================
  // مدیریت سطوح
  // ============================================

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.name) {
      toast.error('نام سطح الزامی است');
      return;
    }

    setLoading(true);
    try {
      const url = editingLevel ? `/api/metadata/levels/${editingLevel.id}` : '/api/metadata/levels';
      const method = editingLevel ? 'PUT' : 'POST';

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelForm),
      });

      if (!res.ok) throw new Error('خطا در ذخیره سطح');

      toast.success(editingLevel ? 'سطح با موفقیت ویرایش شد' : 'سطح با موفقیت ایجاد شد');
      setShowLevelForm(false);
      setLevelForm({ name: '', description: '' });
      setEditingLevel(null);
      fetchLevels();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره سطح');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLevel = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این سطح اطمینان دارید؟',
      action: async () => {
        try {
          const res = await(window.customFetch || window.fetch)(`/api/metadata/levels/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'خطا در حذف سطح');
          }
          toast.success('سطح با موفقیت حذف شد');
          fetchLevels();
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف سطح');
        }
      }
    });
  };

  // ============================================
  // مدیریت انواع دانش
  // ============================================

  const handleSaveKnowledgeType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeTypeForm.name) {
      toast.error('نام نوع دانش الزامی است');
      return;
    }

    setLoading(true);
    try {
      const url = editingKnowledgeType 
        ? `/api/metadata/knowledge-types/${editingKnowledgeType.id}` 
        : '/api/metadata/knowledge-types';
      const method = editingKnowledgeType ? 'PUT' : 'POST';

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledgeTypeForm),
      });

      if (!res.ok) throw new Error('خطا در ذخیره نوع دانش');

      toast.success(editingKnowledgeType ? 'نوع دانش با موفقیت ویرایش شد' : 'نوع دانش با موفقیت ایجاد شد');
      setShowKnowledgeTypeForm(false);
      setKnowledgeTypeForm({ name: '', category: '' });
      setEditingKnowledgeType(null);
      fetchKnowledgeTypes();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره نوع دانش');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKnowledgeType = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این نوع دانش اطمینان دارید؟',
      action: async () => {
        try {
          const res = await(window.customFetch || window.fetch)(`/api/metadata/knowledge-types/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'خطا در حذف نوع دانش');
          }
          toast.success('نوع دانش با موفقیت حذف شد');
          fetchKnowledgeTypes();
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف نوع دانش');
        }
      }
    });
  };

  // ============================================
  // مدیریت سطوح سازمانی
  // ============================================

  const handleSaveOrgLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgLevelForm.name) {
      toast.error('نام سطح سازمانی الزامی است');
      return;
    }

    setLoading(true);
    try {
      const url = editingOrgLevel 
        ? `/api/metadata/org-levels/${editingOrgLevel.id}` 
        : '/api/metadata/org-levels';
      const method = editingOrgLevel ? 'PUT' : 'POST';

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgLevelForm),
      });

      if (!res.ok) throw new Error('خطا در ذخیره سطح سازمانی');

      toast.success(editingOrgLevel ? 'سطح سازمانی با موفقیت ویرایش شد' : 'سطح سازمانی با موفقیت ایجاد شد');
      setShowOrgLevelForm(false);
      setOrgLevelForm({ name: '', description: '' });
      setEditingOrgLevel(null);
      fetchOrgLevels();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره سطح سازمانی');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrgLevel = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این سطح سازمانی اطمینان دارید؟',
      action: async () => {
        try {
          const res = await(window.customFetch || window.fetch)(`/api/metadata/org-levels/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'خطا در حذف سطح سازمانی');
          }
          toast.success('سطح سازمانی با موفقیت حذف شد');
          fetchOrgLevels();
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف سطح سازمانی');
        }
      }
    });
  };
  // ============================================
  // رندر تب‌ها
  // ============================================

    const renderTabContent = () => {
    switch (activeTab) {
      case 'levels':
        return renderLevelsTab();
      case 'knowledge-types':
        return renderKnowledgeTypesTab();
      case 'org-levels':
        return renderOrgLevelsTab();
      case 'dynamic-meta':
        return <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2d2d44] p-6 transition-colors">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Tag className="text-blue-600" />
            مدیریت مقادیر پایه فرم‌ها
          </h2>
          <DynamicMetadataManager />
        </div>;
      default:
        return null;
    }
  };

  

  const renderLevelsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">مدیریت سطوح دانش</h3>
        <button onClick={() => { setEditingLevel(null); setLevelForm({ name: '', description: '' }); setShowLevelForm(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
          <Plus size={14} /> سطح جدید
        </button>
      </div>

      {levels.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-[#2d2d44] rounded-xl">
          <Layers size={32} className="mx-auto mb-2 text-gray-300" />
          <p>هیچ سطحی تعریف نشده است</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {levels.map(level => (
            <div key={level.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg border border-gray-200 dark:border-[#2d2d44] hover:border-blue-300 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{level.name}</p>
                <p className="text-xs text-gray-400">{level.description || 'بدون توضیحات'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingLevel(level); setLevelForm({ name: level.name, description: level.description || '' }); setShowLevelForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteLevel(level.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderKnowledgeTypesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">مدیریت انواع دانش</h3>
        <button onClick={() => { setEditingKnowledgeType(null); setKnowledgeTypeForm({ name: '', category: '' }); setShowKnowledgeTypeForm(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
          <Plus size={14} /> نوع جدید
        </button>
      </div>

      {knowledgeTypes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-[#2d2d44] rounded-xl">
          <Tag size={32} className="mx-auto mb-2 text-gray-300" />
          <p>هیچ نوع دانشی تعریف نشده است</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {knowledgeTypes.map(kt => (
            <div key={kt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg border border-gray-200 dark:border-[#2d2d44] hover:border-blue-300 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{kt.name}</p>
                <p className="text-xs text-gray-400">{kt.category || 'بدون دسته‌بندی'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingKnowledgeType(kt); setKnowledgeTypeForm({ name: kt.name, category: kt.category || '' }); setShowKnowledgeTypeForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteKnowledgeType(kt.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrgLevelsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">مدیریت سطوح سازمانی</h3>
        <button onClick={() => { setEditingOrgLevel(null); setOrgLevelForm({ name: '', description: '' }); setShowOrgLevelForm(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
          <Plus size={14} /> سطح جدید
        </button>
      </div>

      {orgLevels.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-[#2d2d44] rounded-xl">
          <Building2 size={32} className="mx-auto mb-2 text-gray-300" />
          <p>هیچ سطح سازمانی تعریف نشده است</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {orgLevels.map(ol => (
            <div key={ol.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg border border-gray-200 dark:border-[#2d2d44] hover:border-blue-300 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{ol.name}</p>
                <p className="text-xs text-gray-400">{ol.description || 'بدون توضیحات'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingOrgLevel(ol); setOrgLevelForm({ name: ol.name, description: ol.description || '' }); setShowOrgLevelForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteOrgLevel(ol.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  

  // ============================================
  // مودال‌ها
  // ============================================

  const renderModal = (title: string, show: boolean, onClose: () => void, onSubmit: (e: React.FormEvent) => void, editing: any, children?: React.ReactNode) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {editing ? <Edit size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{editing ? `ویرایش ${title}` : `${title} جدید`}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={onSubmit} className="p-5 space-y-4">
            {children}
            <div className="pt-4 border-t border-gray-200 dark:border-[#2d2d44] flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">انصراف</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-200/50 disabled:opacity-50">
                <Save size={16} /> {editing ? 'ذخیره تغییرات' : 'ایجاد'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-4 md:pt-6 sticky top-0 z-20 bg-gray-100 dark:bg-[#12121a] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 mb-6 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl shadow-lg shadow-slate-200/50">
              <SettingsIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">تعاریف پایه</h1>
              <p className="text-gray-500 text-sm mt-0.5">مدیریت تنظیمات عمومی، قالب‌ها، سطوح و امنیت</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-gray-200 dark:border-[#2d2d44]/80 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-[#2d2d44]">
          <div className="flex flex-wrap">
            
            <button onClick={() => setActiveTab('levels')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'levels' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <Layers size={16} /> سطوح دانش
            </button>
            <button onClick={() => setActiveTab('knowledge-types')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'knowledge-types' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <Tag size={16} /> انواع دانش
            </button>
            <button onClick={() => setActiveTab('org-levels')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'org-levels' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <Building2 size={16} /> سطوح سازمانی
            </button>
            
            <button onClick={() => setActiveTab('dynamic-meta')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'dynamic-meta' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <Tag size={16} /> مقادیر پایه فرم‌ها
            </button>
          </div>
        </div>

        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* Modals */}
      {renderModal(
        'قالب',
        showTemplateForm,
        () => { setShowTemplateForm(false); setEditingTemplate(null); setTemplateForm({ type: '', title: '', description: '' }); },
        handleSaveTemplate,
        editingTemplate,
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">نوع قالب</label>
            <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={templateForm.type} onChange={e => setTemplateForm({...templateForm, type: e.target.value})} placeholder="مثال: قرارداد" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">عنوان قالب</label>
            <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})} placeholder="مثال: قرارداد کاری" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">توضیحات (اختیاری)</label>
            <textarea className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm min-h-[60px]" value={templateForm.description} onChange={e => setTemplateForm({...templateForm, description: e.target.value})} placeholder="توضیحات..." />
          </div>
        </>
      )}

      {renderModal(
        'سطح دانش',
        showLevelForm,
        () => { setShowLevelForm(false); setEditingLevel(null); setLevelForm({ name: '', description: '' }); },
        handleSaveLevel,
        editingLevel,
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">نام سطح</label>
            <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={levelForm.name} onChange={e => setLevelForm({...levelForm, name: e.target.value})} placeholder="مثال: سطح ۱" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">توضیحات (اختیاری)</label>
            <textarea className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm min-h-[60px]" value={levelForm.description} onChange={e => setLevelForm({...levelForm, description: e.target.value})} placeholder="توضیحات..." />
          </div>
        </>
      )}

      {renderModal(
        'نوع دانش',
        showKnowledgeTypeForm,
        () => { setShowKnowledgeTypeForm(false); setEditingKnowledgeType(null); setKnowledgeTypeForm({ name: '', category: '' }); },
        handleSaveKnowledgeType,
        editingKnowledgeType,
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">نام نوع دانش</label>
            <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={knowledgeTypeForm.name} onChange={e => setKnowledgeTypeForm({...knowledgeTypeForm, name: e.target.value})} placeholder="مثال: آیین‌نامه" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">دسته‌بندی (اختیاری)</label>
            <input type="text" className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={knowledgeTypeForm.category} onChange={e => setKnowledgeTypeForm({...knowledgeTypeForm, category: e.target.value})} placeholder="مثال: مستندات راهبردی" />
          </div>
        </>
      )}

      {renderModal(
        'سطح سازمانی',
        showOrgLevelForm,
        () => { setShowOrgLevelForm(false); setEditingOrgLevel(null); setOrgLevelForm({ name: '', description: '' }); },
        handleSaveOrgLevel,
        editingOrgLevel,
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">نام سطح سازمانی</label>
            <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={orgLevelForm.name} onChange={e => setOrgLevelForm({...orgLevelForm, name: e.target.value})} placeholder="مثال: مدیریت کل" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">توضیحات (اختیاری)</label>
            <textarea className="w-full px-4 py-2.5 border border-gray-300 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm min-h-[60px]" value={orgLevelForm.description} onChange={e => setOrgLevelForm({...orgLevelForm, description: e.target.value})} placeholder="توضیحات..." />
          </div>
        </>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="تایید حذف"
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.action) {
            confirmModal.action();
          }
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
      />
    </div>
  );
}

export default Definitions;