// src/pages/Issues/IssueSystem.tsx
// صفحه مدیریت نظام مسائل - نسخه ۳.۰

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useIssues } from '../../hooks/useIssues';
import { useTree } from '../../hooks/useTree';
import { useUIStore } from '../../store';
import { PeriodRolloverModal } from '../../components/issues/PeriodRolloverModal';
import { IssueFormTabs } from '../../components/issues/IssueFormTabs';
import { 
  FileText, Plus, RefreshCw, Search, X,
  CheckCircle, AlertCircle, Clock,
  Filter, Edit, Trash2, ChevronDown,
  ChevronUp, Coins, Eye, Building2,
  HelpCircle, TrendingUp, Calendar, ArrowLeftRight, Download, RotateCcw
} from 'lucide-react';
import api from '../../services/api';
import { AdvancedQueryBuilder, FilterGroup } from '../../components/ui/AdvancedQueryBuilder';
import { format } from 'date-fns-jalali';
import { KanbanBoard } from '../../components/issues/KanbanBoard';
import { IssueDetailsModal } from '../../components/issues/IssueDetailsModal';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import toast from 'react-hot-toast';

export function IssueSystem() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePeriod, periods } = useUIStore();
  
  const {
    issues,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectedIssue,
    loading,
    pagination,
    fetchIssues,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchIssue,
    createIssue,
    updateIssue,
    changeStatus,
    deleteIssue,
    getIssueStats,
    uploadAttachment,
    carryOverIssues,
    batchImportIssues,
  } = useIssues();

  const { templates, fetchTemplates } = useTree();

  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [viewingIssue, setViewingIssue] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showFilters, setShowFilters] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFrameFilter, setTimeFrameFilter] = useState('all');
  const [filterByPeriod, setFilterByPeriod] = useState<boolean>(true);
  const [showRolloverModal, setShowRolloverModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('grid');

  const loadIssuesData = (page = 1) => {
    fetchIssues({
      page,
      limit: pagination.limit || 20,
      periodId: filterByPeriod && activePeriod ? activePeriod.id : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      timeFrame: timeFrameFilter !== 'all' ? timeFrameFilter : undefined,
      search: searchTerm || undefined,
      advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined
    });
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('در حال آماده‌سازی گزارش جامع اکسل...', { id: 'excel-toast' });
      const res = await api.get('/api/reports/issues/excel', { responseType: 'blob' });
      const blob = res instanceof Blob 
        ? res 
        : new Blob([res as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `گزارش_وضعیت_نظام_مسائل_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('فایل اکسل با موفقیت دانلود شد', { id: 'excel-toast' });
    } catch (e) {
      console.error('Error downloading Excel report:', e);
      toast.error('خطا در دریافت فایل اکسل', { id: 'excel-toast' });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setSearchTerm(q);
    }
    loadIssuesData(1);
  }, [location.search, activePeriod?.id, filterByPeriod, timeFrameFilter, statusFilter, priorityFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle initialization from routing state (e.g. from Gap Analysis or Research Tree)
  useEffect(() => {
    if (location.state && location.state.createFromGap) {
      const gap = location.state.createFromGap;
      const fallback = location.state.nodeFallback;
      setEditingIssue(location.state.initialData || {
        domainNodeId: gap?.requiredNodeId || gap?.requiredNode?.id || fallback?.id || '',
        domain: gap?.requiredNode?.title || gap?.requiredNode?.name || fallback?.title || fallback?.name || '',
        title: gap?.requiredNode?.title || gap?.requiredNode?.name || fallback?.title || fallback?.name || '',
        actionPriority: gap?.priority === 'critical' ? 'بالا' : 'متوسط',
        knowledgeType: 'نظریه',
        gapId: gap?.id || null
      });
      setShowForm(true);
      // Clean up the state so it doesn't re-trigger on reload
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state && location.state.createFromResearch) {
      setEditingIssue(location.state.initialData);
      setShowForm(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const stats = getIssueStats(issues);

  const handleEdit = async (issue: any) => {
    setEditingIssue(issue);
    setShowForm(true);
    try {
      const fullIssue = await fetchIssue(issue.id);
      if (fullIssue) {
        setEditingIssue(fullIssue);
      }
    } catch {
      // استفاده از داده‌های موجود در صورت بروز خطا
    }
  };

  const handleSave = async (data: any) => {
    try {
      const issuePayload = {
        ...data,
        periodId: data.periodId || (editingIssue?.periodId) || (activePeriod?.id) || null,
      };
      let saved;
      if (editingIssue && editingIssue.id) {
        saved = await updateIssue(editingIssue.id, issuePayload);
        toast.success('✅ مسئله با موفقیت ویرایش شد');
      } else {
        saved = await createIssue(issuePayload);
        toast.success('✅ مسئله با موفقیت ایجاد شد');
      }
      setShowForm(false);
      setEditingIssue(null);
      loadIssuesData(pagination.page);
      return saved;
    } catch (error) {
      // خطا قبلاً در هوک مدیریت شده
    }
  };

  const handleRefresh = () => {
    loadIssuesData(pagination.page);
    toast.success('فهرست مسائل بروزرسانی شد');
  };

  
  const filterFields: any[] = [
    { name: 'title', label: 'عنوان', type: 'text' },
    { name: 'domain', label: 'حوزه', type: 'text' },
    { name: 'status', label: 'وضعیت', type: 'select', options: [
      { label: 'در انتظار', value: 'pending' },
      { label: 'در حال انجام', value: 'in_progress' },
      { label: 'تکمیل شده', value: 'completed' },
      { label: 'لغو شده', value: 'canceled' },
      { label: 'متوقف شده', value: 'on_hold' }
    ] },
    { name: 'actionPriority', label: 'اولویت', type: 'select', options: [
      { label: 'بسیار بالا', value: 'بسیار بالا' },
      { label: 'بالا', value: 'بالا' },
      { label: 'متوسط', value: 'متوسط' },
      { label: 'پایین', value: 'پایین' }
    ] },
    { name: 'projectLevel', label: 'سطح پروژه', type: 'text' }
  ];

  const handleStatusChange = async (issueId: number, status: string) => {
    await changeStatus(issueId, status);
    toast.success(`📌 وضعیت مسئله به "${getStatusLabel(status)}" تغییر یافت`);
  };

  const handleDelete = async (issueId: number) => {
    if (confirm('⚠️ آیا از حذف این مسئله اطمینان دارید؟')) {
      await deleteIssue(issueId);
      toast.success('🗑️ مسئله با موفقیت حذف شد');
    }
  };

  // فیلتر کردن
  const filteredIssues = issues;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'در انتظار',
      in_progress: 'در حال اجرا',
      completed: 'تکمیل شده',
      canceled: 'لغو شده',
      on_hold: 'متوقف'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: '⏳ در انتظار', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      in_progress: { label: '🔄 در حال اجرا', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
      completed: { label: '✅ تکمیل شده', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      canceled: { label: '❌ لغو شده', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
      on_hold: { label: '⏸️ متوقف', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
    };
    return config[status] || config.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, string> = {
      'خیلی زیاد': '🔥 bg-red-100 text-red-700',
      'زیاد': '⬆️ bg-orange-100 text-orange-700',
      'متوسط': '➖ bg-yellow-100 text-yellow-700',
      'کم': '⬇️ bg-gray-100 text-gray-600',
    };
    return config[priority] || config['متوسط'];
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <IssueFormTabs
          initialData={editingIssue}
          onSave={handleSave}
          onUploadAttachment={uploadAttachment}
          onCancel={() => {
            setShowForm(false);
            setEditingIssue(null);
          }}
          templates={templates}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-200/50">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🎯 نظام مسائل</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <p className="text-gray-500 text-sm">مدیریت، پیگیری و به‌روزرسانی مسائل دانشی و پژوهشی</p>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Calendar size={13} />
                  <span>دوره: {activePeriod ? activePeriod.name : 'همه دوره‌ها'}</span>
                </div>
                {activePeriod && (
                  <button
                    onClick={() => setFilterByPeriod(!filterByPeriod)}
                    className={`text-xs px-2.5 py-0.5 rounded-md border transition-all ${
                      filterByPeriod 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {filterByPeriod ? 'فقط این دوره (فیلتر فعال)' : 'نمایش همه دوره‌ها'}
                  </button>
                )}
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <HelpCircle size={14} />
                  راهنما
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* دکمه دانلود گزارش اکسل */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-xs"
            title="دانلود خروجی فرمت‌بندی شده اکسل از وضعیت تمامی مسائل"
          >
            <Download size={17} />
            <span>گزارش اکسل</span>
          </button>

          {/* دکمه عملیات انتقال و ورود اطلاعات دوره‌ای */}
          <button
            onClick={() => setShowRolloverModal(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-xs"
            title="انتقال مسائل بین‌دوره‌ای، فریز سوابق و ورود اطلاعات سی‌دی"
          >
            <ArrowLeftRight size={17} className="text-indigo-600" />
            <span>عملیات دوره‌ای / سی‌دی</span>
          </button>

          <button
            onClick={() => {
              setEditingIssue(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-200/50"
          >
            <Plus size={18} />
             ثبت مسئله جدید
          </button>
          <button
            onClick={handleRefresh}
            className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              فهرست
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              شبکه کارت‌ها
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              تابلوی وضعیت
            </button>
          </div>

        </div>
      </div>

      {/* راهنما */}
      {showHelp && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>هر مسئله = یک موضوع پژوهشی</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>۴۰+ فیلد برای ثبت کامل اطلاعات</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>پیگیری پیشرفت و بودجه</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">📎</span>
              <span>امکان آپلود فایل پیوست</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Progress Bar */}
      {issues.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-700">وضعیت مسائل صفحه جاری (نمودار پیشرفت)</h3>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{formatNumber(stats.total)} مسئله</span>
          </div>
          <div className="flex h-4 bg-gray-100 rounded-full overflow-hidden">
            <div style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} className="bg-green-500 flex items-center justify-center text-[10px] text-white font-bold transition-all">{stats.completed > 0 && formatNumber(stats.completed)}</div>
            <div style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }} className="bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold transition-all">{stats.inProgress > 0 && formatNumber(stats.inProgress)}</div>
            <div style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }} className="bg-yellow-500 flex items-center justify-center text-[10px] text-white font-bold transition-all">{stats.pending > 0 && formatNumber(stats.pending)}</div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> تکمیل شده</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> در جریان</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /> در انتظار</div>
          </div>
        </div>
      )}

      {/* Stats Cards - با چیدمان واکنش‌گرا و گسترش خودکار باکس اعتبارات بدون سرریز */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 sm:p-4 flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-purple-50 rounded-lg shrink-0">
            <FileText size={20} className="text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">کل مسائل</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{formatNumber(stats.total)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-3 sm:p-4 flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-yellow-50 rounded-lg shrink-0">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">در انتظار</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{formatNumber(stats.pending)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-3 sm:p-4 flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-blue-50 rounded-lg shrink-0">
            <RefreshCw size={20} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">در حال اجرا</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatNumber(stats.inProgress)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-3 sm:p-4 flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-green-50 rounded-lg shrink-0">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">تکمیل شده</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{formatNumber(stats.completed)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-3 sm:p-4 flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-lg shrink-0">
            <TrendingUp size={20} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">میانگین پیشرفت</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-600">{formatNumber(stats.avgCompletion)}٪</p>
          </div>
        </div>
        {/* باکس جمع اعتبارات — با گسترش منعطف و خودکار، بدون سرریز در تمام اندازه‌های صفحه */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-3 sm:p-4 flex items-center gap-3 col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-2 min-w-[210px] max-w-full transition-all">
          <div className="p-2.5 sm:p-3 bg-amber-50 rounded-lg shrink-0">
            <Coins size={22} className="text-amber-600" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs text-gray-500 font-medium truncate">جمع اعتبارات</p>
              <span className="text-[10px] text-amber-700 font-bold px-1.5 py-0.5 bg-amber-100/80 rounded shrink-0">
                ریال
              </span>
            </div>
            <div className="flex items-baseline flex-wrap gap-1 mt-0.5 min-w-0 max-w-full">
              <span
                className="text-sm sm:text-base md:text-lg xl:text-xl font-black text-amber-600 tracking-tight break-all tabular-nums leading-tight select-all block"
                title={`${formatCurrency(stats.totalBudget, true)} (${formatNumber(stats.totalBudget)} ریال)`}
              >
                {formatNumber(stats.totalBudget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar - کامپکت، منعطف و بدون سرریز در تمام ابعاد نمایشگر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* بخش جستجو با ابعاد منعطف و جلوگیری از سرریز */}
          <div className="relative flex-1 min-w-[220px] max-w-full">
            <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="جستجو در عنوان، حوزه، شرح نیاز..."
              className="w-full pr-10 pl-9 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50/50 focus:bg-white text-gray-800 placeholder-gray-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="پاک کردن جستجو"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* فیلترها و دکمه پاک‌سازی با چیدمان منعطف grid/flex */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 items-center w-full lg:w-auto shrink-0">
            {/* وضعیت */}
            <div className="min-w-0">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 truncate"
              >
                <option value="all">📌 همه وضعیت‌ها</option>
                <option value="pending">⏳ در انتظار</option>
                <option value="in_progress">🔄 در حال اجرا</option>
                <option value="completed">✅ تکمیل شده</option>
                <option value="canceled">❌ لغو شده</option>
                <option value="on_hold">⏸️ متوقف</option>
              </select>
            </div>

            {/* اولویت */}
            <div className="min-w-0">
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 truncate"
              >
                <option value="all">🎯 همه اولویت‌ها</option>
                <option value="خیلی زیاد">🔥 خیلی زیاد</option>
                <option value="زیاد">⬆️ زیاد</option>
                <option value="متوسط">➖ متوسط</option>
                <option value="کم">⬇️ کم</option>
              </select>
            </div>

            {/* دسته‌بندی */}
            <div className="min-w-0">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 truncate"
              >
                <option value="all">🏷️ همه دسته‌ها</option>
                <option value="عمومی">عمومی</option>
                <option value="فنی و مهندسی">فنی و مهندسی</option>
                <option value="مدیریتی و سازمانی">مدیریتی و سازمانی</option>
                <option value="فرهنگی و اجتماعی">فرهنگی و اجتماعی</option>
                <option value="علمی و پژوهشی">علمی و پژوهشی</option>
                <option value="اقتصادی و مالی">اقتصادی و مالی</option>
                <option value="حقوقی و تقنینی">حقوقی و تقنینی</option>
                <option value="زیرساختی و لجستیک">زیرساختی و لجستیک</option>
              </select>
            </div>

            {/* زمان‌بندی */}
            <div className="min-w-0">
              <select
                value={timeFrameFilter}
                onChange={e => setTimeFrameFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 truncate"
              >
                <option value="all">⏳ زمان‌بندی</option>
                <option value="کوتاه‌مدت">کوتاه‌مدت</option>
                <option value="میان‌مدت">میان‌مدت</option>
                <option value="بلندمدت">بلندمدت</option>
              </select>
            </div>

            {/* پاک‌سازی فیلترها */}
            <div className="col-span-2 sm:col-span-1 md:col-span-1 min-w-0">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                  setTimeFrameFilter('all');
                }}
                className="w-full px-2.5 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                title="پاک کردن تمام فیلترها"
              >
                <RotateCcw size={13} />
                <span>حذف فیلتر</span>
              </button>
            </div>
          </div>
        </div>

        {/* فیلترهای فعال */}
        {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 ml-2">🔍 فیلترهای فعال:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px]">
                جستجو: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px]">
                وضعیت: {getStatusLabel(statusFilter)}
                <button onClick={() => setStatusFilter('all')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px]">
                اولویت: {priorityFilter}
                <button onClick={() => setPriorityFilter('all')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px]">
                دسته‌بندی: {categoryFilter}
                <button onClick={() => setCategoryFilter('all')} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">⏳ در حال بارگذاری مسائل...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">📋 هیچ مسئله‌ای یافت نشد</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {issues.length === 0 
              ? '📝 هنوز هیچ مسئله‌ای ثبت نشده است. با کلیک روی "ثبت مسئله جدید" شروع کنید.'
              : '🔍 با فیلترهای موجود، مسئله‌ای یافت نشد. فیلترها را تغییر دهید.'}
          </p>
          {issues.length === 0 && (
            <button
              onClick={() => { setEditingIssue(null); setShowForm(true); }}
              className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg shadow-purple-200/50"
            >
              <Plus size={16} />
               ثبت مسئله جدید
            </button>
          )}
        </div>
      
      ) : viewMode === 'kanban' ? (
        <KanbanBoard 
          issues={filteredIssues}
          onIssueUpdate={(id: number, status: string) => { handleRefresh(); }}
          onEditClick={handleEdit}
          onDeleteClick={handleDelete}
        />
      ) : viewMode === 'list' ? (

        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const status = getStatusBadge(issue.status);
            const StatusIcon = status.icon;
            const isExpanded = expandedIssue === issue.id;

            const safeJson = (data: any, defaultVal: any = null) => {
              if (!data) return defaultVal;
              if (typeof data === 'string') {
                try { return JSON.parse(data); } catch { return defaultVal; }
              }
              return data;
            };

            const needStatement = safeJson(issue.needStatement);
            const contract = safeJson(issue.contract);
            const executiveContract = safeJson(issue.executiveContract);
            const stage20 = safeJson(issue.stage20);
            const stage50 = safeJson(issue.stage50);
            const stage100 = safeJson(issue.stage100);
            const application = safeJson(issue.application);
            const teamMembers = safeJson(issue.issueResolutionTeam, []);

            return (
              <div
                key={issue.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(issue.actionPriority || 'متوسط')}`}>
                        {issue.actionPriority || 'متوسط'}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                        📂 {issue.domain}
                      </span>
                      {issue.responsibleUnit && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                          🏢 {issue.responsibleUnit}
                        </span>
                      )}
                      {issue.templates && issue.templates.length > 0 && (
                        <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                          📋 {issue.templates.length} قالب
                        </span>
                      )}
                      {issue.category && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                          🏷️ {issue.category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm mt-1.5">{issue.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span>📊 پیشرفت: {formatNumber(issue.completionPercent || 0)}٪</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (issue.completionPercent || 0) >= 80 ? 'bg-green-500' :
                              (issue.completionPercent || 0) >= 50 ? 'bg-blue-500' :
                              (issue.completionPercent || 0) >= 20 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${issue.completionPercent || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-px h-3 bg-gray-300" />
                      <span>💰 {formatCurrency(issue.requiredBudget || 0)} ریال</span>
                      <span className="w-px h-3 bg-gray-300" />
                      <span>📅 {issue.approvalDate ? format(new Date(issue.approvalDate), 'yyyy/MM/dd') : '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setViewingIssue(issue)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="👁️ مشاهده تمامی فیلدها"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(issue.id, issue.status === 'completed' ? 'pending' : 'completed')}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="تغییر وضعیت"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(issue)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="✏️ ویرایش"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(issue.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="🗑️ حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/60 space-y-4">
                    {/* اطلاعات پایه و راه‌حل */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-gray-400 mb-0.5">🧭 جهت‌گیری راه‌حل</p>
                        <p className="font-semibold text-gray-800">{issue.solutionDirection || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">🏢 دستگاه مسئول</p>
                        <p className="font-semibold text-gray-800">{issue.responsibleUnit || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">📚 نوع دانش و سطح پروژه</p>
                        <p className="font-semibold text-gray-800">{issue.knowledgeType || '-'} | {issue.projectLevel || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">🏛️ مرجع تصویب</p>
                        <p className="font-semibold text-gray-800">{issue.approvalAuthority || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">🔒 سطح محرمانگی</p>
                        <p className="font-semibold text-gray-800">{issue.confidentialityLevel || 'عمومی'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">🤝 همکاران و دیپلماسی</p>
                        <p className="font-semibold text-gray-800">{issue.collaborators || '-'} ({issue.scientificDiplomacy || 'درون‌سازمانی'})</p>
                      </div>
                    </div>

                    {/* بودجه‌ها و زمان */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                        <span className="text-emerald-800 block text-[11px]">بودجه مورد نیاز:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(issue.requiredBudget || 0)} ریال</span>
                      </div>
                      <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-blue-800 block text-[11px]">بودجه مصوب:</span>
                        <span className="font-bold text-blue-700">{formatCurrency(issue.approvedBudget || 0)} ریال</span>
                      </div>
                      <div className="bg-purple-50/70 p-2.5 rounded-lg border border-purple-100">
                        <span className="text-purple-800 block text-[11px]">بودجه تخصیص‌یافته:</span>
                        <span className="font-bold text-purple-700">{formatCurrency(issue.assignedBudget || 0)} ریال</span>
                      </div>
                      <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-100">
                        <span className="text-amber-800 block text-[11px]">مدت زمان پیش‌بینی‌شده:</span>
                        <span className="font-bold text-amber-700">{issue.expectedMonths || 0} ماه</span>
                      </div>
                    </div>

                    {/* بیانیه نیاز در صورت وجود */}
                    {needStatement && (
                      <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                        <span className="font-bold text-purple-800 block">📄 بیانیه نیاز:</span>
                        <p className="text-gray-700"><span className="text-gray-400">متقاضی:</span> {needStatement.user || '-'} | <span className="text-gray-400">بودجه پیشنهادی:</span> {formatCurrency(needStatement.suggestedBudget)} ریال</p>
                        {needStatement.problem && <p className="text-gray-600 bg-gray-50 p-2 rounded-lg">{needStatement.problem}</p>}
                      </div>
                    )}

                    {/* قرارداد و شورای اجرایی */}
                    {(contract || executiveContract) && (
                      <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs space-y-1.5">
                        <span className="font-bold text-indigo-800 block">📑 اطلاعات قرارداد و شورای اجرایی:</span>
                        {contract && (
                          <p className="text-gray-700">
                            شماره: <span className="font-semibold">{contract.number || '-'}</span> | مجری: <span className="font-semibold">{contract.executor || '-'}</span> | مبلغ: <span className="font-semibold text-emerald-700">{formatCurrency(contract.amount)} ریال</span>
                          </p>
                        )}
                        {executiveContract?.minutes && (
                          <p className="text-gray-600 bg-gray-50 p-2 rounded-lg">مصوبه شورای اجرایی: {executiveContract.minutes}</p>
                        )}
                      </div>
                    )}

                    {/* اقدامات و گلوگاه‌ها */}
                    {(issue.actionsTaken || issue.bottlenecks || issue.orders) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {issue.actionsTaken && (
                          <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                            <span className="text-green-700 font-bold block mb-1">✅ اقدامات:</span>
                            <p className="text-gray-700 line-clamp-3">{issue.actionsTaken}</p>
                          </div>
                        )}
                        {issue.bottlenecks && (
                          <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                            <span className="text-red-700 font-bold block mb-1">🚧 گلوگاه‌ها:</span>
                            <p className="text-gray-700 line-clamp-3">{issue.bottlenecks}</p>
                          </div>
                        )}
                        {issue.orders && (
                          <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                            <span className="text-blue-700 font-bold block mb-1">📋 تدابیر:</span>
                            <p className="text-gray-700 line-clamp-3">{issue.orders}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* کارگروه و قالب‌ها */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 text-xs">
                      {teamMembers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">👥 کارگروه ({teamMembers.length} نفر):</span>
                          {teamMembers.slice(0, 3).map((m: any, idx: number) => (
                            <span key={idx} className="bg-white border px-2 py-0.5 rounded-full text-[11px] text-gray-700">
                              {m.name} ({m.rank || 'عضو'})
                            </span>
                          ))}
                          {teamMembers.length > 3 && <span className="text-gray-400 text-[10px]">+{teamMembers.length - 3} نفر دیگر</span>}
                        </div>
                      )}

                      <button
                        onClick={() => setViewingIssue(issue)}
                        className="text-xs text-purple-700 hover:text-purple-900 font-medium underline mr-auto"
                      >
                        👁️ مشاهده و چاپ تمامی فیلدها در پنجره اختصاصی
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIssues.map((issue) => {
            const status = getStatusBadge(issue.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={issue.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(issue.actionPriority || 'متوسط')}`}>
                      {issue.actionPriority || 'متوسط'}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1.5 leading-snug">
                    {issue.title}
                  </h4>

                  <div className="space-y-1 mb-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1 text-slate-600 truncate">
                      <span>📂</span>
                      <span className="truncate">{issue.domain}</span>
                    </div>
                    {issue.responsibleUnit && (
                      <div className="flex items-center gap-1 text-blue-700 truncate">
                        <Building2 size={13} className="shrink-0" />
                        <span className="truncate">{issue.responsibleUnit}</span>
                      </div>
                    )}
                  </div>

                  {issue.projectLevel && (
                    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {issue.projectLevel}
                      </span>
                      {issue.knowledgeType && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          {issue.knowledgeType}
                        </span>
                      )}
                      {issue.templates && issue.templates.length > 0 && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                          📋 {issue.templates.length}
                        </span>
                      )}
                      {issue.category && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">
                          🏷️ {issue.category}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mb-2">
                    <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                      <span>پیشرفت</span>
                      <span className="font-bold text-gray-700">{formatNumber(issue.completionPercent || 0)}٪</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (issue.completionPercent || 0) >= 80 ? 'bg-green-500' :
                          (issue.completionPercent || 0) >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${issue.completionPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    💰 {formatCurrency(issue.requiredBudget || 0)} ریال
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingIssue(issue)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="مشاهده تمامی جزئیات"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleEdit(issue)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ویرایش"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(issue.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredIssues.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
          <span className="text-xs text-gray-400">
            📊 نمایش {filteredIssues.length} از {pagination.total} مسئله
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => fetchIssues({ page, limit: pagination.limit })}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    page === pagination.page
                      ? 'bg-purple-600 text-white'
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

      {/* پنجره اختصاصی مشاهده جامع کلیه فیلدها */}
      {viewingIssue && (
        <IssueDetailsModal
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onEdit={handleEdit}
        />
      )}

      {/* Period Rollover & CD Batch Import Modal */}
      <PeriodRolloverModal
        isOpen={showRolloverModal}
        onClose={() => setShowRolloverModal(false)}
        periods={periods}
        activePeriod={activePeriod}
        onCarryOver={carryOverIssues}
        onBatchImport={batchImportIssues}
        onRefresh={() => loadIssuesData(1)}
      />
    </div>
  );
}

export default IssueSystem;