// src/pages/Files.tsx
// مدیریت فایل‌ها، تبادل داده سازمانی و صدور/ورود قالب‌های اکسل یگان‌ها بر اساس ساختار و دوره زمانی

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder, File as FileIcon, Download, Trash2, Image, FileText, Archive,
  Search, RefreshCw, HardDrive, FolderOpen, Grid3x3, List,
  FileJson, FileSpreadsheet, FileCode, Music, Video, Package,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Clock, Calendar, Filter, X, Eye, UploadCloud, CheckCircle2,
  AlertTriangle, Building2, Layers, GitBranch, ArrowDownToLine,
  FileCheck, ShieldAlert, Sparkles, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns-jalali';
import { useAuthStore } from '../store';

interface FileItem {
  id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  mimeType: string;
  module: string;
  moduleId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BaseItem {
  id: number;
  name: string;
}

interface UnitItem {
  id: number;
  base_id: number;
  name: string;
}

interface PeriodItem {
  id: number;
  name: string;
  is_active?: number;
}

interface UnitStat {
  unit_id: number;
  unit_name: string;
  base_id: number;
  base_name: string;
  tree_count: number;
  node_count: number;
  issue_count: number;
}

export function FilesManagement() {
  const { user } = useAuthStore();
  const [activeMainTab, setActiveMainTab] = useState<'exchange' | 'storage'>('exchange');

  // -------------------------------------------------------------
  // ۱. Stateهای بخش تبادل داده و قالب‌های یگانی
  // -------------------------------------------------------------
  const [bases, setBases] = useState<BaseItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [viewModeScope, setViewModeScope] = useState<'individual' | 'aggregate'>('individual');
  const [unitStats, setUnitStats] = useState<UnitStat[]>([]);
  const [statsAggregated, setStatsAggregated] = useState({ totalUnits: 0, totalTrees: 0, totalNodes: 0, totalIssues: 0 });

  // وضعیت دانلود و آپلود
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // ۲. Stateهای بخش فایل‌های پیوست (Storage)
  // -------------------------------------------------------------
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [totalSize, setTotalSize] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // بارگذاری داده‌های اولیه ساختار و دوره‌ها
  useEffect(() => {
    fetchOrgAndPeriods();
    fetchFiles();
  }, []);

  const fetchOrgAndPeriods = async () => {
    try {
      const [basesRes, unitsRes, periodsRes] = await Promise.all([
        (window.customFetch || window.fetch)('/api/org/bases'),
        (window.customFetch || window.fetch)('/api/org/units'),
        (window.customFetch || window.fetch)('/api/periods'),
      ]);

      const basesData = await basesRes.json();
      const unitsData = await unitsRes.json();
      const periodsData = await periodsRes.json();

      setBases(Array.isArray(basesData) ? basesData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      const pList = Array.isArray(periodsData) ? periodsData : [];
      setPeriods(pList);

      // مقداردهی اولیه پیش‌فرض
      if (pList.length > 0) {
        const activeP = pList.find((p: any) => p.is_active === 1 || p.isActive === 1) || pList[0];
        setSelectedPeriodId(String(activeP.id));
      }
      if (Array.isArray(basesData) && basesData.length > 0) {
        setSelectedBaseId(String(basesData[0].id));
      }
    } catch (error) {
      console.error('Error fetching org data:', error);
      toast.error('خطا در دریافت اطلاعات ساختار سازمانی');
    }
  };

  // فیلتر کردن یگان‌ها بر اساس پایگاه انتخاب‌شده
  const filteredUnits = useMemo(() => {
    if (!selectedBaseId) return units;
    return units.filter(u => u.base_id === Number(selectedBaseId));
  }, [units, selectedBaseId]);

  useEffect(() => {
    if (filteredUnits.length > 0 && !filteredUnits.some(u => String(u.id) === selectedUnitId)) {
      setSelectedUnitId(String(filteredUnits[0].id));
    }
  }, [filteredUnits]);

  // بارگذاری آمار ساختار یگان‌ها
  const fetchUnitStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedPeriodId) params.append('periodId', selectedPeriodId);
      if (selectedBaseId) params.append('baseId', selectedBaseId);
      if (viewModeScope === 'individual' && selectedUnitId) {
        params.append('unitId', selectedUnitId);
      } else {
        params.append('mode', 'aggregate');
      }

      const res = await (window.customFetch || window.fetch)(`/api/files/unit-stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUnitStats(data.units || []);
        setStatsAggregated(data.aggregated || { totalUnits: 0, totalTrees: 0, totalNodes: 0, totalIssues: 0 });
      }
    } catch (e) {
      console.error('Error loading unit stats:', e);
    }
  };

  useEffect(() => {
    fetchUnitStats();
  }, [selectedPeriodId, selectedBaseId, selectedUnitId, viewModeScope]);

  // -------------------------------------------------------------
  // متدهای بخش قالب و همگام‌سازی اکسل
  // -------------------------------------------------------------

  const handleDownloadTemplate = async () => {
    if (!selectedUnitId || !selectedPeriodId) {
      toast.error('لطفاً ابتدا یگان سازمانی و دوره زمانی را انتخاب فرمایید.');
      return;
    }

    setIsDownloadingTemplate(true);
    try {
      const url = `/api/files/template/download?unitId=${selectedUnitId}&periodId=${selectedPeriodId}`;
      const res = await (window.customFetch || window.fetch)(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در صدور فایل قالب');
      }

      const blob = await res.blob();
      const unitObj = units.find(u => String(u.id) === selectedUnitId);
      const periodObj = periods.find(p => String(p.id) === selectedPeriodId);
      const filename = `قالب_خام_دانا_${unitObj?.name || 'یگان'}_${periodObj?.name || 'دوره'}.xlsx`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('قالب خام اکسل یگان با موفقیت صادر و دریافت شد.');
    } catch (error: any) {
      console.error('Template download error:', error);
      toast.error(error.message || 'خطا در دریافت قالب اکسل');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewData(null);
      setSyncSummary(null);
    }
  };

  const handlePreviewExcel = async () => {
    if (!selectedFile) {
      toast.error('لطفاً ابتدا یک فایل اکسل انتخاب کنید.');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (selectedUnitId) formData.append('unitId', selectedUnitId);
      if (selectedPeriodId) formData.append('periodId', selectedPeriodId);

      const res = await (window.customFetch || window.fetch)('/api/files/template/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در اعتبارسنجی فایل اکسل');
      }

      setPreviewData(data);
      if (data.valid) {
        toast.success(`فایل معتبر است (${data.stats.totalNodes} گره دانشی و ${data.stats.totalIssues} مسئله شناسایی شد).`);
      } else {
        toast.error(`فایل دارای ${data.errors?.length || 0} خطا در اعتبارسنجی است.`);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error.message || 'خطا در پیش‌نمایش فایل اکسل');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSyncToDatabase = async () => {
    if (!selectedFile) {
      toast.error('لطفاً فایل اکسل پرشده را انتخاب کنید.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (selectedUnitId) formData.append('unitId', selectedUnitId);
      if (selectedPeriodId) formData.append('periodId', selectedPeriodId);

      const res = await (window.customFetch || window.fetch)('/api/files/template/upload-sync', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در همگام‌سازی اطلاعات یگان');
      }

      setSyncSummary(data.summary);
      setPreviewData(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast.success(data.message || 'اطلاعات با موفقیت در پایگاه داده اعمال شد.');
      fetchUnitStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'خطا در همگام‌سازی فایل اکسل');
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------
  // متدهای بخش فایل‌های پیوست (Storage)
  // -------------------------------------------------------------
  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await (window.customFetch || window.fetch)('/api/files');
      const data = await res.json();
      setFiles(data.files || []);
      setTotalSize(data.totalSize || 0);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('خطا در دریافت لیست فایل‌ها');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteStorageFile = async (name: string) => {
    if (!confirm(`آیا از حذف فایل "${name}" اطمینان دارید؟`)) return;
    try {
      const res = await (window.customFetch || window.fetch)(`/api/files/${name}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('فایل با موفقیت حذف شد');
        fetchFiles();
      } else {
        const error = await res.json();
        toast.error(error.error || 'خطا در حذف فایل');
      }
    } catch (error) {
      toast.error('خطا در اتصال به سرور');
    }
  };

  const handleDownloadStorageFile = (name: string) => {
    window.open(`/api/files/download/${name}`, '_blank');
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type === 'image') return <Image size={20} className="text-blue-500" />;
    if (type === 'archive') return <Package size={20} className="text-amber-500" />;
    if (ext === 'pdf') return <FileText size={20} className="text-red-500" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText size={20} className="text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet size={20} className="text-emerald-600" />;
    if (['json', 'xml'].includes(ext || '')) return <FileCode size={20} className="text-purple-500" />;
    return <FileIcon size={20} className="text-gray-400" />;
  };

  // فیلتر کردن فایل‌های پیوست
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || file.type === filterType;
      const matchesModule = filterModule === 'all' || file.module === filterModule;
      return matchesSearch && matchesType && matchesModule;
    });
  }, [files, searchTerm, filterType, filterModule]);

  const selectedUnitObj = units.find(u => String(u.id) === selectedUnitId);
  const selectedBaseObj = bases.find(b => String(b.id) === selectedBaseId);
  const selectedPeriodObj = periods.find(p => String(p.id) === selectedPeriodId);

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* هدر صفحه */}
      <div className="bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-medium">
                سامانه مدیریت دانش و نظام مسائل (دانا)
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-medium">
                نسخه تبادل داده سازمانی ۳.۲
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              مدیریت فایل‌ها و تبادل داده سازمانی
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
              تولید و صدور قالب‌های خام اکسل برای یگان‌های سازمانی بر اساس دوره زمانی، دریافت اطلاعات تکمیل‌شده، اعتبارسنجی ساختار درختی و همگام‌سازی مستقیم با پایگاه داده.
            </p>
          </div>

          {/* تب‌های اصلی */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-start md:self-auto">
            <button
              onClick={() => setActiveMainTab('exchange')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMainTab === 'exchange'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileSpreadsheet size={18} />
              تبادل داده و قالب‌های یگان
            </button>
            <button
              onClick={() => setActiveMainTab('storage')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMainTab === 'storage'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <HardDrive size={18} />
              آرشیو فایل‌های پیوست ({files.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* تب ۱: تبادل داده و قالب‌های یگانی */}
      {/* ========================================================================= */}
      {activeMainTab === 'exchange' && (
        <div className="space-y-6">
          {/* نوار انتخاب ساختار سازمانی و دوره */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {/* انتخاب دوره زمانی */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    دوره زمانی ارزیابی
                  </label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_active ? '(فعال)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* انتخاب نیرو / پایگاه */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-500" />
                    نیرو / رده بالادست
                  </label>
                  <select
                    value={selectedBaseId}
                    onChange={(e) => setSelectedBaseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {bases.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* انتخاب یگان سازمانی */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-500" />
                    یگان سازمانی مجری
                  </label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {filteredUnits.length === 0 ? (
                      <option value="">هیچ یگانی یافت نشد</option>
                    ) : (
                      filteredUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* سوئیچ بررسی تفکیکی / تجمیعی */}
              <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">حالت نمایش:</span>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setViewModeScope('individual')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewModeScope === 'individual'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    تفکیکی (یگان انتخابی)
                  </button>
                  <button
                    onClick={() => setViewModeScope('aggregate')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewModeScope === 'aggregate'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    تجمیعی (کل زیرمجموعه‌ها)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* دو ستون اصلی: ۱. دریافت قالب خام  ۲. بارگذاری و به‌روزرسانی */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* بخش ۱: دریافت قالب خام */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <ArrowDownToLine size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      صدور قالب خام اکسل یگان
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      فرمت استاندارد جمع‌آوری درخت دانش و نظام مسائل بر اساس ساختار
                    </p>
                  </div>
                </div>

                {/* کارت مشخصات یگان و دوره */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5 mb-6 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">یگان مخاطب:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedUnitObj?.name || 'انتخاب نشده'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">رده بالادست:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedBaseObj?.name || 'انتخاب نشده'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">دوره ارزیابی:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedPeriodObj?.name || 'انتخاب نشده'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 text-xs">وضعیت داده در سامانه:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      آماده صدور قالب
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-6">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <HelpCircle size={15} />
                    نحوه کارکرد فرآیند:
                  </p>
                  این فایل دارای شناسنامه سیستمی قفل‌شده است تا اطلاعات دقیقاً به همین یگان و دوره منتسب گردد. کارشناسان یگان، درخت دانش و مسائل را در شیت‌های مربوطه تکمیل نموده و سپس فایل نهایی را در بخش روبه‌رو بارگذاری می‌کنند.
                </div>
              </div>

              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate || !selectedUnitId}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isDownloadingTemplate ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    در حال ساخت و صدور فایل اکسل...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} />
                    دریافت فایل قالب خام اکسل برای «{selectedUnitObj?.name || 'یگان'}»
                  </>
                )}
              </button>
            </div>

            {/* بخش ۲: بارگذاری و همگام‌سازی اکسل پرشده */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      بارگذاری و همگام‌سازی فایل پرشده
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      خواندن داده‌های یگان و به‌روزرسانی هوشمند دیتابیس بر اساس ساختار و دوره
                    </p>
                  </div>
                </div>

                {/* ناحیه انتخاب فایل Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-slate-50 dark:bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={36} className="text-emerald-600" />
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        حجم: {(selectedFile.size / 1024).toFixed(1)} کیلوبایت • برای تغییر کلیک کنید
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud size={36} className="text-slate-400" />
                      <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                        برای انتخاب فایل اکسل پرشده کلیک کنید
                      </div>
                      <div className="text-xs text-slate-400">
                        پشتیبانی از فرمت‌های استاندارد XLSX و XLS
                      </div>
                    </div>
                  )}
                </div>

                {/* پیش‌نمایش یا هشدارهای فایل */}
                {previewData && (
                  <div className={`p-4 rounded-xl border mb-4 text-xs space-y-2 ${
                    previewData.valid
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {previewData.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        نتیجه اعتبارسنجی فایل اکسل:
                      </span>
                      <span>یگان: {previewData.unitName || 'شناسایی شد'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <div>گره‌های دانشی شناسایی‌شده: <b>{previewData.stats?.totalNodes}</b></div>
                      <div>مسائل شناسایی‌شده: <b>{previewData.stats?.totalIssues}</b></div>
                    </div>
                    {previewData.errors?.length > 0 && (
                      <div className="mt-2 space-y-1 text-red-600 dark:text-red-400">
                        {previewData.errors.slice(0, 3).map((err: string, i: number) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* پیام نتیجه همگام‌سازی */}
                {syncSummary && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1.5 mb-4">
                    <div className="font-bold flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={16} />
                      همگام‌سازی با موفقیت انجام شد:
                    </div>
                    <div>درخت دانشی یگان: <b>{syncSummary.totalNodes}</b> گره ({syncSummary.nodesCreated} جدید، {syncSummary.nodesUpdated} ویرایش)</div>
                    <div>نظام مسائل: <b>{syncSummary.totalIssues}</b> مسئله ({syncSummary.issuesCreated} جدید، {syncSummary.issuesUpdated} ویرایش)</div>
                  </div>
                )}
              </div>

              {/* دکمه‌های عملیاتی */}
              <div className="flex gap-3">
                <button
                  onClick={handlePreviewExcel}
                  disabled={!selectedFile || isPreviewLoading || isUploading}
                  className="flex-1 py-3 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPreviewLoading ? <RefreshCw size={15} className="animate-spin" /> : <Eye size={15} />}
                  پیش‌نمایش و بررسی
                </button>
                <button
                  onClick={handleSyncToDatabase}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUploading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  به‌روزرسانی و اعمال در سامانه
                </button>
              </div>
            </div>
          </div>

          {/* بخش ۳: وضعیت و آمار تجمیعی/تفکیکی یگان‌ها */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GitBranch size={18} className="text-blue-500" />
                  وضعیت پوشش اطلاعات یگان‌ها ({viewModeScope === 'aggregate' ? 'گزارش تجمیعی' : 'گزارش تفکیکی'})
                </h3>
                <p className="text-xs text-slate-500">
                  فهرست یگان‌های تحت پوشش، تعداد درختواره‌ها، گره‌های دانشی و مسائل ثبت‌شده در دوره انتخابی
                </p>
              </div>

              {/* کارت‌های خلاصه آماری تجمیعی */}
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400">کل یگان‌ها</div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{statsAggregated.totalUnits}</div>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">کل گره‌های دانشی</div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{statsAggregated.totalNodes}</div>
                </div>
                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                  <div className="text-xs text-purple-600 dark:text-purple-400">کل مسائل ثبت‌شده</div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{statsAggregated.totalIssues}</div>
                </div>
              </div>
            </div>

            {/* جدول آمار یگان‌ها */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">شناسه</th>
                    <th className="py-3 px-4">نام یگان سازمانی</th>
                    <th className="py-3 px-4">رده بالادست (نیرو)</th>
                    <th className="py-3 px-4 text-center">تعداد درختواره</th>
                    <th className="py-3 px-4 text-center">گره‌های دانشی</th>
                    <th className="py-3 px-4 text-center">مسائل شناسنامه‌دار</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unitStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        هیچ اطلاعاتی برای این فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    unitStats.map((item) => (
                      <tr key={item.unit_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{item.unit_id}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{item.unit_name}</td>
                        <td className="py-3 px-4 text-slate-500">{item.base_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            item.tree_count > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.tree_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {item.node_count}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                          {item.issue_count}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedBaseId(String(item.base_id));
                              setSelectedUnitId(String(item.unit_id));
                              toast.success(`یگان «${item.unit_name}» انتخاب شد.`);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
                          >
                            انتخاب جهت کار با قالب
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* تب ۲: آرشیو فایل‌های پیوست (Storage) */}
      {/* ========================================================================= */}
      {activeMainTab === 'storage' && (
        <div className="space-y-6">
          {/* نوار جستجو و فیلترهای پیوست‌ها */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در نام فایل‌های پیوست..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl pr-10 pl-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">همه فرمت‌ها</option>
                <option value="image">تصاویر</option>
                <option value="application">اسناد و داکیومنت‌ها</option>
                <option value="archive">فایل‌های فشرده</option>
              </select>

              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">همه بخش‌ها</option>
                <option value="issues">نظام مسائل</option>
                <option value="trees">درختواره‌ها</option>
                <option value="assets">دارایی‌های دانشی</option>
                <option value="exports">خروجی‌ها</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchFiles}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="تازه‌سازی"
              >
                <RefreshCw size={18} className={loadingFiles ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* جدول یا شبکه فایل‌های پیوست */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">نوع</th>
                    <th className="py-3 px-4">نام فایل</th>
                    <th className="py-3 px-4">بخش مربوطه</th>
                    <th className="py-3 px-4">حجم</th>
                    <th className="py-3 px-4">تاریخ بارگذاری</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        {loadingFiles ? 'در حال بارگذاری فایل‌ها...' : 'هیچ فایلی یافت نشد.'}
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4">
                          {getFileIcon(file.type, file.name)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate" title={file.name}>
                          {file.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                            {file.module}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {file.createdAt ? format(new Date(file.createdAt), 'yyyy/MM/dd HH:mm') : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDownloadStorageFile(file.name)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="دانلود فایل"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteStorageFile(file.name)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="حذف فایل"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
