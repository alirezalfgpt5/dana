// src/components/trees/TreeIndexPage.tsx
// صفحه ایندکس جامع درختواره‌ها با قابلیت حذف نرم، بازیابی، صفحه‌بندی، فیلتر و نوار ابزار استاندارد

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Building2, 
  GitBranch, 
  Layers, 
  AlertTriangle,
  FolderTree,
  Archive,
  CheckCircle2,
  HelpCircle,
  LucideIcon,
  Copy
} from 'lucide-react';
import { PageToolbar, PageToolbarAction } from '../ui/PageToolbar';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TreeLevelsHelp } from '../../pages/Trees/components/TreeLevelsHelp';
import { exportToExcel } from '../../lib/excelUtils';
import { formatPersianDate as formatDate } from '../../utils/persianDate';
import toast from 'react-hot-toast';

export interface TreeItem {
  id: number;
  name: string;
  type: 'required' | 'produced' | 'research';
  description?: string | null;
  periodId?: number | null;
  periodName?: string;
  baseId?: number | null;
  unitId?: number | null;
  baseName?: string | null;
  unitName?: string | null;
  orgStructure?: string | null;
  isActive?: number;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
  leafCount?: number;
  branchCount?: number;
}

interface TreeIndexPageProps {
  title: string;
  subtitle: string;
  treeType: 'required' | 'produced' | 'research';
  icon: LucideIcon;
  iconGradient?: string;
  trees: TreeItem[];
  periods: any[];
  bases?: any[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
  onSelectTree: (treeId: number) => void;
  onAddNewTree: () => void;
  onEditTree: (tree: TreeItem) => void;
  onCloneTree?: (tree: TreeItem) => void;
  onSoftDeleteTree: (treeId: number) => Promise<boolean>;
  onRestoreTree: (treeId: number) => Promise<boolean>;
  onPermanentDeleteTree: (treeId: number) => Promise<boolean>;
}

// فرمت‌کننده تاریخ شمسی ساده و تمیز
function formatPersianDate(isoString: string): string {
  if (!isoString) return '-';
  return formatDate(isoString);
}

export function TreeIndexPage({
  title,
  subtitle,
  treeType,
  icon: MainIcon,
  iconGradient = 'from-blue-600 to-indigo-600',
  trees = [],
  periods = [],
  bases = [],
  loading = false,
  onRefresh,
  onSelectTree,
  onAddNewTree,
  onEditTree,
  onCloneTree,
  onSoftDeleteTree,
  onRestoreTree,
  onPermanentDeleteTree,
}: TreeIndexPageProps) {
  // فیلترها و وضعیت
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedBase, setSelectedBase] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [showHelp, setShowHelp] = useState(false);

  // صفحه‌بندی
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // مدال تایید عملیات
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    isDanger: false,
  });

  // فیلتر درختواره‌ها
  const { filteredList, activeCount, trashCount, totalNodesCount } = useMemo(() => {
    let actCount = 0;
    let trshCount = 0;
    let nodesSum = 0;

    trees.forEach((t) => {
      if (t.isActive === 0) {
        trshCount++;
      } else {
        actCount++;
        nodesSum += t.nodeCount || 0;
      }
    });

    const list = trees.filter((tree) => {
      // تفکیک تب سطل بازیافت و فعال
      const isTreeActive = tree.isActive !== 0;
      if (activeTab === 'active' && !isTreeActive) return false;
      if (activeTab === 'trash' && isTreeActive) return false;

      // جستجو
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = tree.name.toLowerCase().includes(term);
        const matchDesc = tree.description?.toLowerCase().includes(term);
        const matchOrg = tree.orgStructure?.toLowerCase().includes(term);
        if (!matchName && !matchDesc && !matchOrg) return false;
      }

      // فیلتر دوره
      if (selectedPeriod !== 'all' && String(tree.periodId) !== selectedPeriod) {
        return false;
      }

      // فیلتر پایگاه/یگان
      if (selectedBase !== 'all' && String(tree.baseId) !== selectedBase) {
        return false;
      }

      return true;
    });

    return {
      filteredList: list,
      activeCount: actCount,
      trashCount: trshCount,
      totalNodesCount: nodesSum,
    };
  }, [trees, activeTab, searchTerm, selectedPeriod, selectedBase]);

  // موارد صفحه جاری
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // تغییر صفحه در صورت خروج از محدوده
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // خروجی اکسل
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      toast.error('داده‌ای برای خروجی اکسل وجود ندارد');
      return;
    }
    const exportData = filteredList.map((t, idx) => ({
      ردیف: idx + 1,
      'شناسه': t.id,
      'عنوان درختواره': t.name,
      'توضیحات': t.description || '-',
      'دوره زمانی': t.periodName || 'نامشخص',
      'ساختار سازمانی / مالک': t.orgStructure || '-',
      'تعداد کل گره‌ها': t.nodeCount || 0,
      'تعداد شاخه‌ها': t.branchCount || 0,
      'تعداد برگ‌ها': t.leafCount || 0,
      'تاریخ ایجاد': formatPersianDate(t.createdAt),
      'وضعیت': t.isActive !== 0 ? 'فعال' : 'حذف نرم شده',
    }));
    exportToExcel(exportData, `فهرست_درختواره_${treeType}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // اکشن‌های نوار ابزار بالا
  const toolbarActions: PageToolbarAction[] = [
    {
      id: 'add-new',
      label: 'افزودن درختواره',
      icon: Plus,
      variant: 'primary',
      onClick: onAddNewTree,
      title: 'ایجاد درختواره جدید',
    },
    {
      id: 'toggle-trash',
      label: activeTab === 'active' ? 'سطل بازیافت' : 'درختواره‌های فعال',
      icon: activeTab === 'active' ? Archive : FolderTree,
      variant: activeTab === 'active' ? 'secondary' : 'indigo',
      badge: activeTab === 'active' && trashCount > 0 ? trashCount : undefined,
      active: activeTab === 'trash',
      onClick: () => {
        setActiveTab(activeTab === 'active' ? 'trash' : 'active');
        setCurrentPage(1);
      },
      title: activeTab === 'active' ? 'مشاهده درختواره‌های حذف نرم شده' : 'بازگشت به درختواره‌های فعال',
    },
    {
      id: 'export-excel',
      label: 'خروجی اکسل',
      icon: FileSpreadsheet,
      variant: 'success',
      onClick: handleExportExcel,
      title: 'دریافت خروجی اکسل از فهرست درختواره‌ها',
    },
    {
      id: 'refresh',
      label: 'بروزرسانی',
      icon: RefreshCw,
      variant: 'secondary',
      onClick: async () => {
        await onRefresh();
        toast.success('فهرست درختواره‌ها بروزرسانی شد');
      },
      title: 'بارگذاری مجدد داده‌ها',
    },
    {
      id: 'help',
      label: 'راهنمای کاربری',
      icon: HelpCircle,
      variant: 'ghost',
      onClick: () => setShowHelp(value => !value),
      title: 'راهنمای درختواره‌ها',
      active: showHelp,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* ۱. نوار ابزار اختصاصی بالای صفحه */}
      <PageToolbar
        title={title}
        subtitle={subtitle}
        icon={MainIcon}
        iconColor={iconGradient}
        actions={toolbarActions}
        pdfEnabled={!loading && paginatedList.length > 0}
        actionsClassName="flex-nowrap overflow-x-auto pb-1"
      />

      {showHelp && (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
            <strong className="block mb-1">
              {treeType === 'required'
                ? 'راهنمای درختواره مورد نیاز'
                : treeType === 'produced'
                  ? 'راهنمای درختواره تولیدشده'
                  : 'راهنمای درختواره پژوهشی'}
            </strong>
            {treeType === 'required'
              ? 'درختواره مورد نیاز، دانش و توانمندی‌های لازم را از ریشه تا برگ تعریف می‌کند. برای شروع، درختواره را ایجاد یا انتخاب کنید و سپس گره‌ها را به ترتیب سطح بسازید.'
              : treeType === 'produced'
                ? 'درختواره تولیدشده، دانش و توانمندی‌های موجود را ثبت می‌کند. درختواره را انتخاب کنید و گره‌های موجود را در سطح مناسب وارد کنید.'
                : 'درختواره پژوهشی برای سازمان‌دهی موضوعات پژوهشی و پیگیری گپ‌های دانشی است. درختواره را انتخاب کنید تا موارد پژوهشی و وضعیت آن‌ها را ببینید.'}
          </div>
          <TreeLevelsHelp />
        </div>
      )}

      {/* ۲. کارت‌های آماری سریع */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">درختواره‌های فعال</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <MainIcon size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">مجموع کل گره‌ها</p>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalNodesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">دوره‌های تعریف‌شده</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{periods.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveTab(activeTab === 'trash' ? 'active' : 'trash');
            setCurrentPage(1);
          }}
          className={`cursor-pointer transition-all border rounded-xl p-3.5 shadow-sm flex items-center justify-between ${
            activeTab === 'trash'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white dark:bg-[#1e1e2f] border-gray-200/80 dark:border-gray-800 hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">سطل بازیافت (حذف نرم)</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{trashCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Archive size={20} />
          </div>
        </div>
      </div>

      {/* ۳. بخش فیلترها و نوار جستجو */}
      <div className="bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* جعبه جستجو */}
          <div className="md:col-span-2 relative">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو بر اساس نام، توضیحات یا ساختار سازمانی..."
              className="w-full pr-10 pl-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
            />
          </div>

          {/* فیلتر دوره */}
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
            >
              <option value="all">همه دوره‌های زمانی</option>
              {periods.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} {p.year ? `(${p.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* فیلتر یگان / پایگاه */}
          <div>
            <select
              value={selectedBase}
              onChange={(e) => {
                setSelectedBase(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
            >
              <option value="all">همه ساختارهای سازمانی</option>
              {bases.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* هشدار وضعیت سطل بازیافت */}
        {activeTab === 'trash' && (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Archive size={16} />
              <span className="font-bold">در حال مشاهده سطل بازیافت:</span>
              <span>درختواره‌های موجود در این بخش حذف نرم شده‌اند و می‌توانید آن‌ها را بازیابی یا به طور دائمی حذف نمایید.</span>
            </div>
            <button
              onClick={() => setActiveTab('active')}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition"
            >
              بازگشت به لیست اصلی
            </button>
          </div>
        )}
      </div>

      {/* ۴. جدول اصلی درختواره‌ها */}
      <div className="bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">در حال بارگذاری اطلاعات درختواره‌ها...</p>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <FolderTree size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300">
              {activeTab === 'trash' ? 'سطل بازیافت خالی است' : 'هیچ درختواره‌ای یافت نشد'}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'trash'
                ? 'در حال حاضر هیچ درختواره‌ای به سطل بازیافت انتقال نیافته است.'
                : 'برای شروع، با استفاده از دکمه «افزودن درختواره» در نوار ابزار بالای صفحه، نخستین درختواره را ایجاد کنید.'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={onAddNewTree}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shadow-sm inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                ایجاد درختواره جدید
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">ردیف</th>
                  <th className="py-3.5 px-4">عنوان و مشخصات درختواره</th>
                  <th className="py-3.5 px-4">دوره زمانی</th>
                  <th className="py-3.5 px-4">مالک / رده سازمانی</th>
                  <th className="py-3.5 px-4 text-center">تعداد گره و برگ</th>
                  <th className="py-3.5 px-4 text-center">تاریخ ایجاد</th>
                  <th className="py-3.5 px-4 text-center">وضعیت</th>
                  <th className="py-3.5 px-4 text-center w-48">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedList.map((tree, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isTreeActive = tree.isActive !== 0;

                  return (
                    <tr
                      key={tree.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group"
                    >
                      {/* ردیف */}
                      <td className="py-4 px-4 text-center text-xs text-gray-400 font-mono">
                        {rowNumber}
                      </td>

                      {/* عنوان و توضیحات */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <GitBranch size={18} />
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectTree(tree.id)}
                              className="font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 text-right transition-colors text-sm flex items-center gap-1.5"
                            >
                              <span>{tree.name}</span>
                            </button>
                            {tree.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 max-w-md">
                                {tree.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* دوره زمانی */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{tree.periodName || 'نامشخص'}</span>
                        </span>
                      </td>

                      {/* مالک و ساختار سازمانی */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={tree.orgStructure || ''}>
                            {tree.orgStructure || 'ستاد کل آجا'}
                          </span>
                        </div>
                      </td>

                      {/* تعداد گره، برگ و شاخه */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs">
                          <span className="font-bold text-blue-600 dark:text-blue-400" title="تعداد کل گره‌ها">
                            {tree.nodeCount || 0} گره
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400" title="تعداد برگ‌ها">
                            {tree.leafCount || 0} برگ
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-amber-600 dark:text-amber-400" title="تعداد شاخه‌ها">
                            {tree.branchCount || 0} شاخه
                          </span>
                        </div>
                      </td>

                      {/* تاریخ ایجاد */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          <Calendar size={13} className="text-gray-400" />
                          {formatPersianDate(tree.createdAt)}
                        </span>
                      </td>

                      {/* وضعیت */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isTreeActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            حذف نرم
                          </span>
                        )}
                      </td>

                      {/* عملیات */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isTreeActive ? (
                            <>
                              {/* مشاهده و ترسیم درختواره */}
                              <button
                                onClick={() => onSelectTree(tree.id)}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                title="مشاهده و مدیریت درختواره"
                              >
                                <Eye size={16} />
                              </button>

                              {/* ویرایش مشخصات */}
                              <button
                                onClick={() => onEditTree(tree)}
                                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                                title="ویرایش اطلاعات درختواره"
                              >
                                <Edit3 size={16} />
                              </button>

                              {/* کپی / نسخه جدید */}
                              {onCloneTree && (
                                <button
                                  onClick={() => onCloneTree(tree)}
                                  className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                  title="ایجاد نسخه جدید (کلون)"
                                >
                                  <Copy size={16} />
                                </button>
                              )}

                              {/* حذف نرم */}
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'انتقال درختواره به سطل بازیافت',
                                    message: `آیا از انتقال درختواره «${tree.name}» به سطل بازیافت اطمینان دارید؟ در هر زمان می‌توانید آن را مجدداً بازیابی کنید.`,
                                    isDanger: true,
                                    action: async () => {
                                      await onSoftDeleteTree(tree.id);
                                    },
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                title="انتقال به سطل بازیافت (حذف نرم)"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* بازیابی از سطل بازیافت */}
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'بازیابی درختواره',
                                    message: `آیا مایل به بازیابی درختواره «${tree.name}» و بازگرداندن آن به لیست فعال هستید؟`,
                                    isDanger: false,
                                    action: async () => {
                                      await onRestoreTree(tree.id);
                                    },
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold inline-flex items-center gap-1 shadow-sm"
                                title="بازیابی درختواره"
                              >
                                <RotateCcw size={14} />
                                بازیابی
                              </button>

                              {/* حذف دائم */}
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'حذف دائمی درختواره',
                                    message: `توجه: حذف دائم درختواره «${tree.name}» غیرقابل بازگشت است. آیا اطمینان کامل دارید؟`,
                                    isDanger: true,
                                    action: async () => {
                                      await onPermanentDeleteTree(tree.id);
                                    },
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-xs"
                                title="حذف دائمی و غیرقابل بازگشت"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ۵. صفحه‌بندی (Pagination) */}
        {filteredList.length > 0 && (
          <div className="p-4 bg-gray-50/60 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>نمایش</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs outline-none font-bold"
              >
                <option value={10}>۱۰</option>
                <option value={20}>۲۰</option>
                <option value={50}>۵۰</option>
              </select>
              <span>مورد در هر صفحه • مجموع: {filteredList.length} درختواره</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 transition"
              >
                <ChevronRight size={16} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            currentPage === p
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 transition"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مدال تایید عملیات حذف / بازیابی */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          if (confirmModal.action) {
            await confirmModal.action();
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.isDanger ? 'danger' : 'warning'}
        confirmText="تایید و اجرا"
        cancelText="انصراف"
      />
    </div>
  );
}
