// src/pages/Gaps/GapAnalysis.tsx
// صفحه تحلیل شکاف دانشی - نسخه ۳.۰

import { useState, useEffect, useRef } from 'react';
import { useGapAnalysis } from '../../hooks/useGapAnalysis';
import { useTree } from '../../hooks/useTree';
import { 
  Target, Search, X, Download, RefreshCw,
  CheckCircle, AlertCircle, Clock,
  Filter, HelpCircle, Zap, Edit2, Upload
} from 'lucide-react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { TreeGraphView } from '../Trees/components/TreeGraphView';
import { useNavigate } from 'react-router-dom';
import ExcelIcon from '../../components/icon/ExcelIcon';

export function GapAnalysis() {
  const {
    gaps,
    report,
    loading,
    pagination,
    fetchGaps,
    analyzeGaps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fillGap,
    deleteGap,
    getGapStats,
  } = useGapAnalysis();

  const { trees, fetchTrees } = useTree();

  const [requiredTreeId, setRequiredTreeId] = useState<number | null>(null);
  const [producedTreeId, setProducedTreeId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const { tree: requiredTreeData, fetchTree: fetchRequiredTree } = useTree();
  const { tree: producedTreeData, fetchTree: fetchProducedTree } = useTree();
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [selectedGap, setSelectedGap] = useState<any>(null);
  const [showFillModal, setShowFillModal] = useState(false);
  const [fillProducedNodeId, setFillProducedNodeId] = useState<number | null>(null);

  useEffect(() => {
    if (producedTreeId) {
      fetchProducedTree(producedTreeId);
    }
  }, [producedTreeId, fetchProducedTree]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showHelp, setShowHelp] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTrees();
    fetchGaps({ page: 1, limit: 20 });
  }, []);

  // اگر کاربر به صفحه برگشت و گپ‌هایی وجود داشت، درختواره مربوطه را بارگذاری می‌کنیم
  useEffect(() => {
    if (gaps.length > 0 && !requiredTreeData && !loading) {
      const firstGap = gaps[0];
      const treeIdFromGap = firstGap?.requiredNode?.treeId;
      
      if (treeIdFromGap) {
        if (treeIdFromGap !== requiredTreeId) {
          setRequiredTreeId(treeIdFromGap);
        }
        
        // تنظیم درختواره تولید شده اگر وجود داشته باشد
        if (!producedTreeId && producedTreeId !== 0) {
           const producedId = firstGap?.producedNode?.treeId;
           setProducedTreeId(producedId || 0);
        }
        
        fetchRequiredTree(treeIdFromGap);
      }
    }
  }, [gaps, requiredTreeData, loading, requiredTreeId, producedTreeId, fetchRequiredTree]);

  const requiredTrees = trees.filter(t => t.type === 'required');
  const producedTrees = trees.filter(t => t.type === 'produced');

  const producedTreeOptions = [
    { value: '0', label: 'بدون درختواره تولید شده (ندارد)' },
    ...producedTrees.map(t => ({
      value: String(t.id),
      label: t.name,
    }))
  ];

  const handleAnalyze = async () => {
    if (!requiredTreeId || producedTreeId === null) {
      toast.error('لطفاً هر دو درختواره را انتخاب کنید (یا گزینه "ندارد" را برای درختواره تولیدشده انتخاب کنید)');
      return;
    }

    try {
      const result = await analyzeGaps(requiredTreeId, producedTreeId);
      if (result) {
        setShowStats(true);
        // toast.success(`تحلیل شکاف با موفقیت انجام شد. ${result.totalGaps} گپ شناسایی شد.`); // Handled in hook
        fetchRequiredTree(requiredTreeId); // Fetch the tree nodes for visualization
      }
    } catch (error: any) {
      if (error.message?.includes('no such table') || error.message?.includes('SQLITE_ERROR')) {
        toast.error('هنوز هیچ داده‌ای در سیستم ثبت نشده است. ابتدا درختواره‌ها را ایجاد کنید.');
      } else {
        toast.error(error.message || 'خطا در تحلیل شکاف');
      }
    }
  };

  const handleGenerateResearchTree = async () => {
    if (!requiredTreeId) return;
    setGenerating(true);
    try {
      const res = await(window.customFetch || window.fetch)('/api/gaps/generate-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredTreeId, producedTreeId: producedTreeId || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تولید درختواره پژوهشی');
      toast.success(data.message || 'درختواره پژوهشی با موفقیت تولید شد');
      fetchGaps({ treeId: requiredTreeId });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleFillGap = async (gapId: number, producedNodeId: number) => {
    await fillGap(gapId, producedNodeId);
    setShowFillModal(false);
    setSelectedGap(null);
    toast.success('گپ با موفقیت پر شد');
  };

  const handleDeleteGap = async (gapId: number) => {
    await deleteGap(gapId);
  };

  const handleConvertToResearch = (gap: any, nodeFallback?: any) => {
    navigate('/issues', { state: { 
      createFromGap: gap?.issue ? undefined : gap,
      createFromResearch: gap?.issue ? true : undefined,
      initialData: gap?.issue,
      nodeFallback 
    } });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!requiredTreeId) {
      toast.error('لطفاً ابتدا درختواره مورد نیاز را انتخاب کنید');
      return;
    }
    try {
      window.open(`/api/outputs/gaps/${requiredTreeId}/excel`, '_blank');
      toast.success('گزارش اکسل در حال دانلود است');
    } catch (error) {
      toast.error('خطا در دریافت گزارش اکسل');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requiredTreeId) {
      toast.error('لطفاً ابتدا درختواره مورد نیاز را انتخاب کنید');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loadToast = toast.loading('در حال بروزرسانی گپ‌ها...');
    try {
      const res = await(window.customFetch || window.fetch)(`/api/outputs/gaps/${requiredTreeId}/excel-import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در آپلود اکسل');
      toast.success(data.message || 'بروزرسانی با موفقیت انجام شد', { id: loadToast });
      fetchGaps({ treeId: requiredTreeId });
      fetchRequiredTree(requiredTreeId);
    } catch (err: any) {
      toast.error(err.message, { id: loadToast });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // فیلتر کردن گپ‌ها
  const filteredGaps = gaps.filter(gap => {
    const matchSearch = gap.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        gap.requiredNode?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || gap.status === filterStatus;
    const matchPriority = filterPriority === 'all' || gap.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // آمار
  const stats = getGapStats(gaps);

  // تعداد گپ‌های باز
  const openGaps = gaps.filter(g => g.status === 'open').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-200/50">
              <Target size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تحلیل شکاف دانشی</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-gray-500 text-sm">
                  مقایسه درختواره مورد نیاز و تولیدشده - شناسایی گپ‌های دانشی
                </p>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <HelpCircle size={14} />
                  راهنما
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyze}
            disabled={!requiredTreeId || producedTreeId === null || loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              !requiredTreeId || producedTreeId === null || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-200/50'
            }`}
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Zap size={18} />
            )}
            {loading ? 'در حال تحلیل...' : 'اجرای تحلیل شکاف'}
          </button>
          
          <button
            onClick={handleGenerateResearchTree}
            disabled={!report || generating}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              !report || generating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50'
            }`}
          >
            {generating ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Target size={18} />
            )}
            تولید درختواره پژوهشی
          </button>

          <button
            onClick={() => window.print()}
            disabled={gaps.length === 0}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              gaps.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50'
            }`}
          >
            <Download size={18} />
            PDF
          </button>
          <button
            onClick={handleExport}
            disabled={gaps.length === 0}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              gaps.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200/50'
            }`}
            title="خروجی اکسل"
          >
            <Download size={18} />
            <ExcelIcon color="#ffff" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!requiredTreeId}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              !requiredTreeId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50'
            }`}
            title="ورود اطلاعات از اکسل"
          >
            <Upload size={18} />
            <ExcelIcon color="#ffff" />
          </button>
        </div>
      </div>

      {/* راهنما */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <HelpCircle size={18} className="text-blue-500" />
            راهنمای تحلیل شکاف و وضعیت‌ها
          </div>
          <span className="text-gray-400 text-xs">
            {showHelp ? 'بستن راهنما' : 'مشاهده راهنما'}
          </span>
        </button>
        {showHelp && (
          <div className="p-5 border-t border-gray-100 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-red-700 text-sm mb-1">گپ باز (بدون پوشش)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    این وضعیت نشان می‌دهد که برای این نیاز دانشی، هنوز هیچ دارایی یا مستندی در سازمان تولید نشده است. این موارد نیازمند تعریف پروژه‌های پژوهشی جدید هستند.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0 mt-1">
                  <Clock size={14} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-700 text-sm mb-1">نیمه‌پر (تطابق جزئی)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    دارایی‌هایی برای این نیاز ثبت شده اما پوشش کاملی ندارند و فقط بخشی از نیاز را برطرف می‌کنند. نیاز به توسعه یا تکمیل مستندات فعلی وجود دارد.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle size={14} className="text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-green-700 text-sm mb-1">پر شده (کامل)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    این نیاز دانشی به طور کامل توسط دارایی‌های موجود پوشش داده شده است و در حال حاضر هیچ شکافی برای آن در سازمان وجود ندارد.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <strong>پوشش (Coverage):</strong> درصد کلی نیازهای دانشی که به طور کامل یا جزئی توسط دارایی‌های موجود سازمان برآورده شده‌اند.
            </div>
          </div>
        )}
      </div>

      {/* Tree Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              درختواره مورد نیاز <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 mr-1">(مرجع تصویب)</span>
            </label>
            <SearchableSelect
              options={requiredTrees.map(t => ({
                value: String(t.id),
                label: t.name,
              }))}
              value={requiredTreeId ? String(requiredTreeId) : ''}
              onChange={(val) => setRequiredTreeId(val ? parseInt(val as string) : null)}
              placeholder="انتخاب درختواره مورد نیاز..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              درختواره تولیدشده <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 mr-1">(دارایی‌های موجود)</span>
            </label>
            <SearchableSelect
              options={producedTreeOptions}
              value={producedTreeId !== null ? String(producedTreeId) : ''}
              onChange={(val) => setProducedTreeId(val !== '' ? parseInt(val as string) : null)}
              placeholder="انتخاب درختواره تولیدشده..."
            />
          </div>
        </div>
      </div>

      {/* Unified Stats Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در گپ‌ها..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all bg-gray-50/50 focus:bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500 min-w-[140px]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">باز (گپ)</option>
            <option value="filled">پر شده</option>
            <option value="partially_filled">نیمه‌پر</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500 min-w-[140px]"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="high">بالا</option>
            <option value="medium">متوسط</option>
            <option value="low">پایین</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
              setFilterPriority('all');
            }}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            پاک کردن
          </button>
        </div>
        {(searchTerm || filterStatus !== 'all' || filterPriority !== 'all') && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 ml-2">فیلترهای فعال:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[10px]">
                جستجو: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px]">
                وضعیت: {filterStatus}
                <button onClick={() => setFilterStatus('all')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {filterPriority !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px]">
                اولویت: {filterPriority}
                <button onClick={() => setFilterPriority('all')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Unified Stats Overview - عین TreeStats */}
{gaps.length > 0 && (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
    {/* کل گپ‌ها */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 text-center">
      <p className="text-xs text-gray-400">کل گپ‌ها</p>
      <p className="text-xl font-bold text-gray-800">{stats.total}</p>
    </div>

    {/* باز (نیاز به اقدام) */}
    <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
      <p className="text-xs text-red-600">باز</p>
      <p className="text-xl font-bold text-red-600">{stats.open}</p>
    </div>

    {/* نیمه‌پر */}
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
      <p className="text-xs text-amber-600">نیمه‌پر</p>
      <p className="text-xl font-bold text-amber-600">{stats.partial}</p>
    </div>

    {/* پر شده (کامل) */}
    <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
      <p className="text-xs text-green-600">پر شده</p>
      <p className="text-xl font-bold text-green-600">{stats.filled}</p>
    </div>

    {/* پوشش دانشی */}
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
      <p className="text-xs text-blue-600">پوشش دانشی</p>
      <p className="text-xl font-bold text-blue-600">
        {stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0}%
      </p>
    </div>
  </div>
)}

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">در حال بارگذاری گپ‌ها...</p>
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">هیچ گپی یافت نشد</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {gaps.length === 0 
              ? 'ابتدا تحلیل شکاف را با انتخاب درختواره‌ها و کلیک روی "اجرای تحلیل شکاف" انجام دهید.'
              : 'با فیلترهای موجود، گپی یافت نشد. فیلترها را تغییر دهید.'}
          </p>
          {gaps.length === 0 && (
            <button
              onClick={handleAnalyze}
              disabled={!requiredTreeId || !producedTreeId}
              className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={16} />
              شروع تحلیل
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'tree' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              نمای درختی
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              نمای جدولی
            </button>
          </div>

          {viewMode === 'tree' ? (
            <div>
              {requiredTreeData && requiredTreeData.nodes ? (
                <TreeGraphView 
                  nodes={requiredTreeData.nodes.map((node: any) => {
                    const gap = gaps.find(g => g.requiredNodeId === node.id);
                    return {
                      ...node,
                      gapData: gap || null,
                      gapStatus: gap ? gap.status : 'filled', // 'open', 'partially_filled', 'filled'
                    };
                  })} 
                  treeName={requiredTreeData.name} 
                  onNodeClick={(node) => {
                     if (node.gapData && (node.gapData as any).researchItemId) {
                         handleConvertToResearch(node.gapData, node);
                     } else if (node.gapData && node.gapData.status !== 'filled') {
                         handleConvertToResearch(node.gapData, node);
                     } else if (!node.gapData && node.isGap) {
                         // Missing from paginated gaps, but it is a gap!
                         handleConvertToResearch(null, node);
                     } else if (node.gapData && node.gapData.status === 'filled') {
                         toast.success('این نیاز دانشی کاملاً پوشش داده شده است');
                     }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">در حال بارگذاری درختواره...</div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">گره مورد نیاز</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">وضعیت</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">نوع</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">امتیاز تطابق</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">اولویت</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGaps.map((gap, index) => (
                  <tr key={gap.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">
                      {gap.requiredNode?.title || 'نامشخص'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                        gap.status === 'filled' ? 'bg-green-100 text-green-700 border-green-200' :
                        gap.status === 'partially_filled' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {gap.status === 'filled' ? <CheckCircle size={12} /> :
                         gap.status === 'partially_filled' ? <Clock size={12} /> :
                         <AlertCircle size={12} />}
                        {gap.status === 'filled' ? 'پر شده' :
                         gap.status === 'partially_filled' ? 'نیمه‌پر' : 'باز (گپ)'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {gap.gapType === 'fuzzy' ? 'تطابق فازی' :
                       gap.gapType === 'partial' ? 'تطابق جزئی' :
                       gap.gapType === 'complete' ? 'کامل' : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (gap.matchScore || 0) >= 0.8 ? 'bg-green-500' :
                              (gap.matchScore || 0) >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(gap.matchScore || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((gap.matchScore || 0) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        gap.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        gap.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {gap.priority === 'critical' ? 'بحرانی' :
                         gap.priority === 'high' ? 'بالا' :
                         gap.priority === 'medium' ? 'متوسط' : 'پایین'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        {gap.status !== 'filled' && (
                          <>
                            {(gap as any).researchItemId ? (
                              <button
                                onClick={() => handleConvertToResearch(gap, gap.requiredNode)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="مشاهده و ویرایش مسئله"
                              >
                                <Edit2 size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConvertToResearch(gap, gap.requiredNode)}
                                className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                title="تبدیل به پژوهش (مسئله)"
                              >
                                <Target size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedGap(gap);
                                setShowFillModal(true);
                              }}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="پر کردن گپ"
                            >
                              <CheckCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteGap(gap.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف گپ"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                نمایش {filteredGaps.length} از {pagination.total} گپ
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchGaps({ page, limit: pagination.limit })}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        page === pagination.page
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          )}
        </>
      )}

      {/* Fill Gap Modal */}
      {showFillModal && selectedGap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">پر کردن گپ</h3>
                  <p className="text-xs text-gray-500">
                    گره: {selectedGap.requiredNode?.title || 'نامشخص'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowFillModal(false);
                  setSelectedGap(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                برای پر کردن این گپ، گره تولیدشده معادل را انتخاب کنید:
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                💡 نکته: گره‌های تولیدشده موجود در درختواره تولیدشده را بررسی کنید
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  انتخاب گره تولیدشده <span className="text-red-500">*</span>
                </label>
                {producedTreeId && producedTreeData?.nodes ? (
                  <SearchableSelect
                    options={producedTreeData.nodes.map((n: any) => ({
                      value: String(n.id),
                      label: n.title,
                    }))}
                    value={fillProducedNodeId ? String(fillProducedNodeId) : ''}
                    onChange={(val) => setFillProducedNodeId(val ? parseInt(val as string) : null)}
                    placeholder="جستجو و انتخاب گره تولیدشده..."
                  />
                ) : (
                  <div className="text-sm text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">
                    ابتدا یک درختواره تولیدشده انتخاب کنید.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFillModal(false);
                    setSelectedGap(null);
                    setFillProducedNodeId(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
                >
                  انصراف
                </button>
                <button
                  disabled={!fillProducedNodeId}
                  onClick={() => {
                    if (fillProducedNodeId && selectedGap) {
                      handleFillGap(selectedGap.id, fillProducedNodeId);
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    fillProducedNodeId
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200/50'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle size={16} />
                  پر کردن گپ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GapAnalysis;