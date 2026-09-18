// src/pages/Settings.tsx
// تنظیمات سیستم - با مدیریت قالب‌ها و سطوح

import React, { useState, useEffect } from 'react';
import { 
  Save, Settings as SettingsIcon, Shield,
  Image, RefreshCw, CheckCircle,
  Plus, Trash2, Edit, X,
  Layers, Tag, Building2, Download
} from 'lucide-react';
import { useSecurityStore, useUIStore, useAuthStore } from '../store';
import { DynamicMetadataManager } from '../components/DynamicMetadataManager';
import toast from 'react-hot-toast';

type TabType = 'general' | 'security';

export function Settings() {
  const { 
    systemName, setSystemName,
    pageTitle, setPageTitle,
    loginTitle, setLoginTitle,
    sidebarTitle, setSidebarTitle,
    browserTitle, setBrowserTitle,
    siteLogo, setSiteLogo 
  } = useUIStore();
  
  const { lockTimerMinutes, setLockTimerMinutes } = useSecurityStore();

  const [activeTab, setActiveTab] = useState<TabType>('general');
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

  // فرم عمومی
  const [formData, setFormData] = useState({
    systemName: '',
    pageTitle: '',
    loginTitle: '',
    sidebarTitle: '',
    browserTitle: '',
    lockTimer: 15,
  });

  const [logoBase64, setLogoBase64] = useState<string | null>(siteLogo);

  // ============================================
  // بارگذاری داده‌ها
  // ============================================

  useEffect(() => {
    setFormData({
      systemName: systemName || 'سیستم مدیریت دانش (DANA)',
      pageTitle: pageTitle || 'داشبورد مدیریت دانش',
      loginTitle: loginTitle || 'سیستم مدیریت دانش و نظام مسائل',
      sidebarTitle: sidebarTitle || 'DANA',
      browserTitle: browserTitle || 'DANA - سیستم مدیریت دانش و نظام مسائل',
      lockTimer: lockTimerMinutes || 15,
    });
    setLogoBase64(siteLogo);

    fetchTemplates();
    fetchLevels();
    fetchKnowledgeTypes();
    fetchOrgLevels();
  }, [systemName, pageTitle, loginTitle, sidebarTitle, browserTitle, lockTimerMinutes, siteLogo]);

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
    if (!confirm('آیا از حذف این قالب اطمینان دارید؟')) return;

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
    if (!confirm('آیا از حذف این سطح اطمینان دارید؟')) return;

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
    if (!confirm('آیا از حذف این نوع دانش اطمینان دارید؟')) return;

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
    if (!confirm('آیا از حذف این سطح سازمانی اطمینان دارید؟')) return;

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
  };

  // ============================================
  // ذخیره تنظیمات عمومی
  // ============================================

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const { saveSystemSettings } = useUIStore.getState();
      const settingsToSave = {
        systemName: formData.systemName,
        pageTitle: formData.pageTitle,
        loginTitle: formData.loginTitle,
        sidebarTitle: formData.sidebarTitle,
        browserTitle: formData.browserTitle,
        siteLogo: logoBase64 !== siteLogo ? (logoBase64 || '') : (siteLogo || '')
      };
      
      if (saveSystemSettings) {
        await saveSystemSettings(settingsToSave);
      } else {
        setSystemName(formData.systemName);
        setPageTitle(formData.pageTitle);
        setLoginTitle(formData.loginTitle);
        setSidebarTitle(formData.sidebarTitle);
        setBrowserTitle(formData.browserTitle);
        if (logoBase64 !== siteLogo) {
          setSiteLogo(logoBase64);
        }
      }
      
      setLockTimerMinutes(formData.lockTimer);
      
      document.title = formData.browserTitle || 'DANA - سیستم مدیریت دانش';
      
      setIsSaved(true);
      toast.success('تنظیمات با موفقیت ذخیره شد');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      toast.error('خطا در ذخیره تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // آپلود لوگو
  // ============================================

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png", 0.7));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const compressedBase64 = await compressImage(file);
        setLogoBase64(compressedBase64);
        toast.success("تصویر با موفقیت بارگذاری شد");
      } catch (err) {
        toast.error("خطا در بارگذاری تصویر");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
    toast('لوگو حذف شد');
  };

  // ============================================
  // رندر تب‌ها
  // ============================================

    const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'security':
        return renderSecurityTab();
      default:
        return null;
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6 max-w-2xl">
      {/* پشتیبان‌گیری دیتابیس */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-blue-800 dark:text-blue-300">پشتیبان‌گیری از پایگاه داده</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">ایجاد نسخه پشتیبان یا دریافت فایل کامل دیتابیس (SQLite)</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={async () => {
              const loadToast = toast.loading('در حال ایجاد پشتیبان...');
              try {
                const token = useAuthStore.getState().token;
                const res = await (window.customFetch || window.fetch)('/api/backup/create', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'خطا در ایجاد پشتیبان');
                toast.success(`پشتیبان ساخته شد: ${data.backup?.name || ''}`, { id: loadToast });
              } catch (err: any) {
                toast.error(err.message || 'خطا در ایجاد پشتیبان', { id: loadToast });
              }
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Save size={16} /> ایجاد پشتیبان
          </button>
          <button
            onClick={() => {
              const token = useAuthStore.getState().token;
             (window.customFetch || window.fetch)('/api/backup/download', {
                headers: { Authorization: `Bearer ${token}` }
              })
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'database.sqlite');
                document.body.appendChild(link);
                link.click();
                link.remove();
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download size={16} /> دانلود دیتابیس
          </button>
        </div>
      </div>

      {/* لوگو */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-gray-400" />
            لوگوی سیستم
          </div>
        </label>
        <div className="flex items-center gap-4">
          {logoBase64 ? (
            <div className="relative w-20 h-20 rounded-xl border border-gray-200 dark:border-[#2d2d44] overflow-hidden group">
              <img src={logoBase64} alt="لوگو" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                <button onClick={handleRemoveLogo} className="text-white hover:text-red-400 text-xs font-medium">
                  حذف
                </button>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 dark:border-[#2d2d44] flex items-center justify-center text-gray-400 hover:border-blue-300 transition-colors">
              <span className="text-xs">بدون لوگو</span>
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <label className="px-4 py-2 bg-gray-50 dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2 cursor-pointer">
              <Image size={16} />
              بارگذاری تصویر
              <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} disabled={loading} />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">فرمت‌های PNG, JPG • حداکثر ۲۰۰×۲۰۰ پیکسل</p>
          </div>
        </div>
      </div>

      {/* عناوین */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          نام سیستم (تاپبار)
        </label>
        <input type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={formData.systemName} onChange={e => setFormData({...formData, systemName: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          عنوان صفحه اصلی (داشبورد)
        </label>
        <input type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={formData.pageTitle} onChange={e => setFormData({...formData, pageTitle: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          عنوان صفحه ورود
        </label>
        <input type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={formData.loginTitle} onChange={e => setFormData({...formData, loginTitle: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          عنوان سایدبار
        </label>
        <input type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={formData.sidebarTitle} onChange={e => setFormData({...formData, sidebarTitle: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          عنوان مرورگر (Tab)
        </label>
        <input type="text" className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm" value={formData.browserTitle} onChange={e => setFormData({...formData, browserTitle: e.target.value})} />
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-[#2d2d44]">
        <button onClick={handleSaveGeneral} disabled={loading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-200/50 disabled:opacity-50">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {loading ? 'در حال ذخیره...' : isSaved ? 'ذخیره شد' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );

  

  

  

  const renderSecurityTab = () => (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs">
        <p className="font-medium">نکات امنیتی:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>زمان قفل صفحه پس از بیکاری کاربر</li>
          <li>برای غیرفعال کردن قفل خودکار، مقدار ۰ را وارد کنید</li>
          <li>تغییرات پس از ذخیره، بلافاصله اعمال می‌شوند</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            زمان قفل صفحه (دقیقه)
          </div>
        </label>
        <div className="flex items-center gap-3">
          <input type="number" min="0" max="120" className="w-32 px-4 py-2.5 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-[#1a1a2e]/50 focus:bg-white dark:focus:bg-[#1e1e2f] dark:bg-[#1e1e2f] text-sm text-center" value={formData.lockTimer} onChange={e => setFormData({...formData, lockTimer: Number(e.target.value)})} />
          <span className="text-sm text-gray-500">دقیقه</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {formData.lockTimer === 0 ? 'قفل خودکار غیرفعال است' : `پس از ${formData.lockTimer} دقیقه بیکاری، صفحه قفل می‌شود`}
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#2d2d44] p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${formData.lockTimer > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-700 dark:text-gray-200">وضعیت: {formData.lockTimer > 0 ? 'فعال' : 'غیرفعال'}</span>
        </div>
      </div>
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
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">تنظیمات سیستم</h1>
              <p className="text-gray-500 text-sm mt-0.5">مدیریت تنظیمات عمومی، قالب‌ها، سطوح و امنیت</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-gray-200 dark:border-[#2d2d44]/80 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-[#2d2d44]">
          <div className="flex flex-wrap">
            <button onClick={() => setActiveTab('general')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <SettingsIcon size={16} /> عمومی
            </button>
            
            
            
            <button onClick={() => setActiveTab('security')} className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 flex items-center gap-2 ${activeTab === 'security' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-[#2d2d44]'}`}>
              <Shield size={16} /> امنیت
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
    </div>
  );
}

export default Settings;