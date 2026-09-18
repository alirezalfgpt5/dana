// src/pages/Research/ResearchTree.tsx
// صفحه مدیریت درختواره پژوهشی - نسخه ۳.۰

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTree } from '../../hooks/useTree';
import { useGapAnalysis } from '../../hooks/useGapAnalysis';
import { 
  Database, Search, X, Download, RefreshCw,
  CheckCircle, AlertCircle, Clock, 
  Filter, Target, HelpCircle, Trash2, Edit2, Settings
} from 'lucide-react';

import { api } from '../../services/api';
import ExcelIcon from '../../components/icon/ExcelIcon';
import { AdvancedQueryBuilder, FilterGroup } from '../../components/ui/AdvancedQueryBuilder';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TreeGraphView } from '../Trees/components/TreeGraphView';
import toast from 'react-hot-toast';

export function ResearchTree() {
  const navigate = useNavigate();
  const { trees, fetchTrees, fetchTree, tree, loading, deleteTree } = useTree();
  const { gaps, fetchGaps } = useGapAnalysis();

  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [filterTimeFrame, setFilterTimeFrame] = useState<string>('all');
  
  const [showHelp, setShowHelp] = useState(false);

  const [editingResearchItem, setEditingResearchItem] = useState<any>(null);
  const [researchFormData, setResearchFormData] = useState<any>({});
  const [savingResearch, setSavingResearch] = useState(false);
  const [programCoveragesOptions, setProgramCoveragesOptions] = useState<any[]>([]);

  useEffect(() => {
    fetchTrees();
    api.get('/api/metadata/program-coverages').then((res: any) => setProgramCoveragesOptions(res || [])).catch(console.error);
  }, []);

  const handleDeleteTree = () => {
    if (!selectedTreeId) return;
    
    toast((t) => (
      <div className="flex flex-col gap-2" dir="rtl">
        <span className="font-medium text-gray-800 text-sm">آیا از حذف این درختواره پژوهشی اطمینان دارید؟</span>
        <div className="flex justify-end gap-2 mt-3">
          <button 
            className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            انصراف
          </button>
          <button 
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
            onClick={async () => {
              toast.dismiss(t.id);
              const success = await deleteTree(selectedTreeId);
              if (success) {
                setSelectedTreeId(null);
                fetchTrees();
              }
            }}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    ), { duration: Infinity, id: 'delete-tree-toast' });
  };

  
  useEffect(() => {
    if (selectedTreeId) {
      fetchTree(selectedTreeId);
      fetchGaps({ 
         treeId: selectedTreeId,
         search: searchTerm || undefined,
         priority: filterPriority !== 'all' ? filterPriority : undefined,
         advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined
      });
    }
  }, [selectedTreeId, searchTerm, filterPriority, advancedFilter]);


  const researchTrees = trees.filter(t => t.type === 'research');

  // فیلتر کردن گپ‌ها
  const filteredGaps = gaps;

  // آمار
  const stats = {
    total: gaps.length,
    open: gaps.filter(g => g.status === 'open').length,
    filled: gaps.filter(g => g.status === 'filled').length,
    partial: gaps.filter(g => g.status === 'partially_filled').length,
    byPriority: gaps.reduce((acc: any, gap) => {
      const priority = gap.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}),
  };

  // تبدیل آیتم پژوهشی به مسئله
  const handleConvertToIssue = (gap: any) => {
    const researchItem = gap.researchItem || null;
    
    if (!researchItem) {
      toast((t) => (
        <div className="flex flex-col gap-2" dir="rtl">
          <span className="font-medium text-gray-800 text-sm">این گپ فاقد آیتم پژوهشی است. برای تولید آن به بخش تحلیل شکاف بروید.</span>
          <div className="flex justify-end gap-2 mt-3">
            <button 
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              onClick={() => toast.dismiss(t.id)}
            >
              انصراف
            </button>
            <button 
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/gaps');
              }}
            >
              انتقال به تحلیل شکاف
            </button>
          </div>
        </div>
      ), { duration: 6000, id: 'missing-research-item' });
      return;
    }

    navigate('/issues', {
      state: {
        createFromResearch: true,
        initialData: gap.issue ? gap.issue : {
          domain: gap.requiredNode?.title || '',
          domainNodeId: gap.requiredNodeId || gap.requiredNode?.id || '',
          title: gap.requiredNode?.title || '',
          actionPriority: researchItem?.priority || gap.priority || 'متوسط',
          knowledgeType: researchItem?.importance === 'راهبردی' ? 'راهبرد' : 'نظریه',
          gapId: gap.id,
          researchItemId: researchItem.id
        }
      }
    });
  };

  const handleEditResearchItem = (gap: any) => {
    if (!gap.researchItem) {
      toast.error('این گپ فاقد آیتم پژوهشی است.');
      return;
    }
    setEditingResearchItem(gap);
    setResearchFormData({
      importance: gap.researchItem.importance || 'عملیاتی',
      timeFrame: gap.researchItem.timeFrame || 'میان‌مدت',
      combatImpact: gap.researchItem.combatImpact || 5,
      costBenefit: gap.researchItem.costBenefit || 5,
      isPartOfSevenYearPlan: gap.researchItem.isPartOfSevenYearPlan === 1,
      isPartOfAnnualPlan: gap.researchItem.isPartOfAnnualPlan === 1,
      isPartOfDirectives: gap.researchItem.isPartOfDirectives === 1,
      isPartOfWarExperience: gap.researchItem.isPartOfWarExperience === 1,
      programCoverages: gap.researchItem.programCoverages || [],
      priority: gap.researchItem.priority || gap.priority || 'medium',
    });
  };

  const handleSaveResearchItem = async () => {
    if (!editingResearchItem || !editingResearchItem.researchItem) return;
    setSavingResearch(true);
    try {
      await api.put(`/api/research/${editingResearchItem.researchItem.id}`, researchFormData);
      toast.success('اطلاعات پژوهش با موفقیت به‌روزرسانی شد');
      setEditingResearchItem(null);
      // Refresh data
      if (selectedTreeId) {
        fetchGaps({ 
           treeId: selectedTreeId,
           search: searchTerm || undefined,
           priority: filterPriority !== 'all' ? filterPriority : undefined,
           advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره‌سازی اطلاعات پژوهش');
    } finally {
      setSavingResearch(false);
    }
  };

  const handleExport = async () => {
    if (!selectedTreeId) {
      toast.error('لطفاً یک درختواره انتخاب کنید');
      return;
    }

    try {
      const response = await(window.customFetch || window.fetch)(`/api/outputs/research/${selectedTreeId}/excel`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی اکسل');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `پژوهش_${tree?.name || selectedTreeId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('📥 فایل اکسل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || '❌ خطا در دانلود فایل اکسل');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-200/50">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🔬 درختواره پژوهشی</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-gray-500 text-sm">موضوعات نیازمند تولید دانش - برگرفته از گپ‌های دانشی</p>
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
          {selectedTreeId && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                 

                
                className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                title="به‌روزرسانی"
                >
                  <ExcelIcon size={20} color="green" />
              </button>
              <button
                onClick={() => {
                  fetchGaps({ treeId: selectedTreeId });
                  if (selectedTreeId) fetchTree(selectedTreeId);
                }}
                className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                title="به‌روزرسانی"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleDeleteTree}
                className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="حذف درختواره"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* راهنما */}
      {showHelp && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>هر گپ باز = یک موضوع پژوهشی</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>۹ ستون تحلیلی برای اولویت‌بندی</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">➡️</span>
              <span>هر پژوهش می‌تواند به مسئله تبدیل شود</span>
            </div>
          </div>
        </div>
      )}

      {/* Tree Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              🧬 انتخاب درختواره پژوهشی
            </label>
            <SearchableSelect
              options={researchTrees.map(t => ({
                value: String(t.id),
                label: t.name,
              }))}
              value={selectedTreeId ? String(selectedTreeId) : ''}
              onChange={(val) => setSelectedTreeId(val ? parseInt(val as string) : null)}
              placeholder="انتخاب درختواره پژوهشی..."
            />
          </div>
        </div>

       {tree && (
  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
    {/* کل گپ‌ها */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 text-center">
      <p className="text-xs text-gray-400">📊 کل گپ‌ها</p>
      <p className="text-xl font-bold text-gray-800">{stats.total}</p>
    </div>

    {/* گپ باز */}
    <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
      <p className="text-xs text-red-600">🔴 گپ باز</p>
      <p className="text-xl font-bold text-red-600">{stats.open}</p>
    </div>

    {/* نیمه‌پر */}
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
      <p className="text-xs text-amber-600">🟡 نیمه‌پر</p>
      <p className="text-xl font-bold text-amber-600">{stats.partial}</p>
    </div>

    {/* پر شده */}
    <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
      <p className="text-xs text-green-600">🟢 پر شده</p>
      <p className="text-xl font-bold text-green-600">{stats.filled}</p>
    </div>

    {/* پوشش دانشی (اختیاری) */}
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
      <p className="text-xs text-blue-600">📈 پوشش دانشی</p>
      <p className="text-xl font-bold text-blue-600">
        {stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0}%
      </p>
    </div>
  </div>
)} 
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 جستجو در گپ‌های پژوهشی..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all bg-gray-50/50 focus:bg-white"
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
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
          >
            <option value="all">🎯 همه اولویت‌ها</option>
            <option value="critical">🔥 بحرانی</option>
            <option value="high">⬆️ بالا</option>
            <option value="medium">➖ متوسط</option>
            <option value="low">⬇️ پایین</option>
          </select>
          <select
            value={filterImportance}
            onChange={e => setFilterImportance(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
          >
            <option value="all">📊 همه اهمیت‌ها</option>
            <option value="راهبردی">🏛️ راهبردی</option>
            <option value="عملیاتی">⚙️ عملیاتی</option>
            <option value="تاکتیکی">🎯 تاکتیکی</option>
          </select>
          <select
            value={filterTimeFrame}
            onChange={e => setFilterTimeFrame(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
          >
            <option value="all">📅 همه بازه‌ها</option>
            <option value="کوتاه‌مدت">⏱️ کوتاه‌مدت</option>
            <option value="میان‌مدت">⏳ میان‌مدت</option>
            <option value="بلندمدت">🗓️ بلندمدت</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterPriority('all');
              setFilterImportance('all');
              setFilterTimeFrame('all');
            }}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            🧹 پاک کردن
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">⏳ در حال بارگذاری گپ‌های پژوهشی...</p>
        </div>
      ) : !selectedTreeId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50 m-6 rounded-2xl border border-gray-200 border-dashed p-12">
          <Target size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">یک درختواره پژوهشی را انتخاب کنید</p>
          <p className="text-sm mt-2">برای مشاهده و تحلیل شکاف‌های دانشی، ابتدا یک درختواره پژوهشی را از منوی بالا انتخاب کنید</p>
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">🔬 هیچ گپ پژوهشی یافت نشد</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {gaps.length === 0 
              ? '📋 ابتدا تحلیل شکاف را روی درختواره‌های مورد نیاز و تولیدشده انجام دهید.'
              : '🔍 با فیلترهای موجود، گپی یافت نشد. فیلترها را تغییر دهید.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              نمای جدولی
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'tree' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              نمای درختی
            </button>
          </div>

          {viewMode === 'tree' ? (
            <div>
              {tree && tree.nodes ? (
                <TreeGraphView nodes={tree.nodes} treeName={tree.name || 'درختواره پژوهشی'} />
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
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">📌 گره مورد نیاز</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">📊 سطح</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">🔵 وضعیت</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">🎯 اولویت</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">🏛️ اهمیت</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600">⏳ بازه زمانی</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 text-center">⚡ عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGaps.map((gap, index) => (
                  <tr key={gap.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">
                      {gap.requiredNode?.title || 'نامشخص'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {gap.requiredNode?.level || '-'}
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
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (gap.researchItem?.priority || gap.priority) === 'critical' ? 'bg-red-100 text-red-700' :
                        (gap.researchItem?.priority || gap.priority) === 'high' ? 'bg-orange-100 text-orange-700' :
                        (gap.researchItem?.priority || gap.priority) === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {(gap.researchItem?.priority || gap.priority) === 'critical' ? '🔥 بحرانی' :
                         (gap.researchItem?.priority || gap.priority) === 'high' ? '⬆️ بالا' :
                         (gap.researchItem?.priority || gap.priority) === 'medium' ? '➖ متوسط' : '⬇️ پایین'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {gap.researchItem?.importance === 'راهبردی' ? '🏛️ راهبردی' :
                       gap.researchItem?.importance === 'عملیاتی' ? '⚙️ عملیاتی' :
                       gap.researchItem?.importance === 'تاکتیکی' ? '🎯 تاکتیکی' : gap.researchItem?.importance || 'عملیاتی'}
                    </td>

                    <td className="px-4 py-3.5 text-gray-600">
                      {gap.researchItem?.timeFrame === 'کوتاه‌مدت' ? '⏱️ کوتاه‌مدت' :
                       gap.researchItem?.timeFrame === 'میان‌مدت' ? '⏳ میان‌مدت' :
                       gap.researchItem?.timeFrame === 'بلندمدت' ? '🗓️ بلندمدت' : gap.researchItem?.timeFrame || 'میان‌مدت'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {gap.researchItem && (
                          <button
                            onClick={() => handleEditResearchItem(gap)}
                            className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="ویرایش پژوهش"
                          >
                            <Settings size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleConvertToIssue(gap)}
                          className={`p-1.5 rounded-lg transition-colors ${gap.issue ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50' : 'text-purple-500 hover:text-purple-700 hover:bg-purple-50'}`}
                          title={gap.issue ? "ویرایش مسئله" : "تبدیل به مسئله"}
                        >
                          {gap.issue ? <Edit2 size={16} /> : <Target size={16} />}
                        </button>
                        {gap.status === 'filled' && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={14} />
                            تکمیل
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Stats */}
          <div className="p-4 border-t bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              📊 نمایش {filteredGaps.length} گپ پژوهشی
            </span>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                🔴 باز: {stats.open}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                🟡 نیمه‌پر: {stats.partial}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                🟢 پر شده: {stats.filled}
              </span>
            </div>
          </div>
        </div>
        )}
        </div>
      )}

      {/* Edit Research Item Modal */}
      {editingResearchItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Settings size={20} className="text-purple-600" />
                ویرایش اطلاعات پژوهش: {editingResearchItem.requiredNode?.title}
              </h3>
              <button 
                onClick={() => setEditingResearchItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">اهمیت</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.importance}
                    onChange={e => setResearchFormData({...researchFormData, importance: e.target.value})}
                  >
                    <option value="راهبردی">راهبردی</option>
                    <option value="عملیاتی">عملیاتی</option>
                    <option value="تاکتیکی">تاکتیکی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">بازه زمانی</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.timeFrame}
                    onChange={e => setResearchFormData({...researchFormData, timeFrame: e.target.value})}
                  >
                    <option value="کوتاه‌مدت">کوتاه‌مدت</option>
                    <option value="میان‌مدت">میان‌مدت</option>
                    <option value="بلندمدت">بلندمدت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">اولویت</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.priority}
                    onChange={e => setResearchFormData({...researchFormData, priority: e.target.value})}
                  >
                    <option value="critical">بحرانی</option>
                    <option value="high">بالا</option>
                    <option value="medium">متوسط</option>
                    <option value="low">پایین</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">اثر در رزم (۱ تا ۱۰)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.combatImpact}
                    onChange={e => setResearchFormData({...researchFormData, combatImpact: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">هزینه-فایده (۱ تا ۱۰)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.costBenefit}
                    onChange={e => setResearchFormData({...researchFormData, costBenefit: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="col-span-1 md:col-span-2 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">پوشش برنامه‌ای (تعاریف پایه)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {programCoveragesOptions.length > 0 ? (
                      programCoveragesOptions.map((pc: any) => (
                        <label key={pc.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input 
                            type="checkbox" 
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                            checked={researchFormData.programCoverages?.includes(pc.id)}
                            onChange={e => {
                              const checked = e.target.checked;
                              let newCov = [...(researchFormData.programCoverages || [])];
                              if (checked) {
                                newCov.push(pc.id);
                              } else {
                                newCov = newCov.filter((id: number) => id !== pc.id);
                              }
                              setResearchFormData({...researchFormData, programCoverages: newCov});
                            }}
                          />
                          {pc.name}
                        </label>
                      ))
                    ) : (
                      <div className="col-span-full text-xs text-gray-400">هیچ مورد پوشش برنامه‌ای در تعاریف سیستم ثبت نشده است.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setEditingResearchItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveResearchItem}
                disabled={savingResearch}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {savingResearch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    در حال ذخیره...
                  </>
                ) : (
                  'ذخیره اطلاعات'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ResearchTree;