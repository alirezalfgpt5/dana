// src/pages/Research/ResearchTree.tsx
// صفحه مدیریت درختواره پژوهشی - با صفحه ایندکس، حذف نرم، ریکاوری و نوار ابزار استاندارد

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTree } from '../../hooks/useTree';
import { 
  Database, Search, X, Download, RefreshCw,
  CheckCircle, AlertCircle, Clock, 
  Filter, Target, HelpCircle, Trash2, Edit2, Settings, Building2,
  ChevronRight, Eye, Layers, FileSpreadsheet, Plus, Table
} from 'lucide-react';

import { api } from '../../services/api';
import { AdvancedQueryBuilder, FilterGroup, FieldDefinition } from '../../components/ui/AdvancedQueryBuilder';
import { TreeGraphView } from '../Trees/components/TreeGraphView';
import { getTreeOrgText } from '../../utils/orgHelper';
import toast from 'react-hot-toast';
import { useUIStore } from '../../store';
import { TreeIndexPage } from '../../components/trees/TreeIndexPage';
import { PageToolbar } from '../../components/ui/PageToolbar';
import { useUserPreference } from '../../utils/userPreferences';
import { TreeModal } from '../Trees/modals/TreeModal';
import { useTreeData } from '../Trees/hooks/useTreeData';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const matchesResearchFilter = (filter: FilterGroup | null, row: any): boolean => {
  if (!filter) return true;
  const matchesRule = (rule: FilterGroup | { field: string; op: string; value: string | string[] }) => {
    if ('rules' in rule) return matchesResearchFilter(rule, row);
    const actual = String(row[rule.field] ?? '').toLocaleLowerCase();
    const values = (Array.isArray(rule.value) ? rule.value : [rule.value]).map(value => String(value).toLocaleLowerCase());
    if (rule.op === 'neq') return !values.includes(actual);
    if (rule.op === 'like') return values.some(value => actual.includes(value));
    if (rule.op === 'in') return values.includes(actual);
    return values.includes(actual);
  };
  return filter.condition === 'AND'
    ? filter.rules.every(matchesRule)
    : filter.rules.some(matchesRule);
};

export function ResearchTree() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const treeIdParam = searchParams.get('treeId');
  const selectedTreeId = treeIdParam ? parseInt(treeIdParam) : null;

  const { 
    trees, 
    fetchTrees, 
    fetchTree, 
    tree, 
    loading, 
    error: treeError,
    deleteTree, 
    restoreTree, 
    createTree, 
    updateTree 
  } = useTree();
  const { periods, bases, units, orgLevels, fetchPeriods, fetchOrgData } = useTreeData();

  const [viewMode, setViewMode] = useUserPreference<'table' | 'tree'>('research:viewMode', 'table');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [filterTimeFrame, setFilterTimeFrame] = useState<string>('all');
  
  const researchFilterFields: FieldDefinition[] = [
    {
      name: 'priority',
      label: 'اولویت',
      type: 'select',
      options: [
        { label: 'بحرانی', value: 'critical' },
        { label: 'بالا', value: 'high' },
        { label: 'متوسط', value: 'medium' },
        { label: 'پایین', value: 'low' },
      ],
    },
    {
      name: 'status',
      label: 'وضعیت شکاف',
      type: 'select',
      options: [
        { label: 'باز (شکاف دانشی)', value: 'open' },
        { label: 'تکمیل شده', value: 'filled' },
        { label: 'نیمه‌پر', value: 'partially_filled' },
      ],
    },
    {
      name: 'gapType',
      label: 'نوع شکاف',
      type: 'text',
    },
  ];

  const [showHelp, setShowHelp] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [isEditingTree, setIsEditingTree] = useState(false);
  const [editingTreeId, setEditingTreeId] = useState<number | null>(null);
  const [treeFormData, setTreeFormData] = useState({ 
    name: '', 
    description: '', 
    periodId: '', 
    organizationLevel: '', 
    baseId: '', 
    unitId: '' 
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null,
  });

  const [editingResearchItem, setEditingResearchItem] = useState<any>(null);
  const [researchFormData, setResearchFormData] = useState<any>({});
  const [savingResearch, setSavingResearch] = useState(false);
  const [repairingResearchTree, setRepairingResearchTree] = useState(false);
  const [programCoveragesOptions, setProgramCoveragesOptions] = useState<any[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<string[]>(['critical', 'high', 'medium', 'low']);
  const [importanceOptions, setImportanceOptions] = useState<string[]>(['راهبردی', 'عملیاتی', 'تاکتیکی']);

  useEffect(() => {
    fetchTrees({ type: 'research' });
    fetchPeriods();
    fetchOrgData();
    api.get('/api/metadata/program-coverages').then((res: any) => setProgramCoveragesOptions(res || [])).catch(console.error);
    api.get('/api/metadata/action-priorities').then((res: any) => {
      if (Array.isArray(res) && res.length > 0) {
        setPriorityOptions(res.map((r: any) => r.name || r));
      }
    }).catch(console.error);
    api.get('/api/metadata/project-levels').then((res: any) => {
      if (Array.isArray(res) && res.length > 0) {
        setImportanceOptions(res.map((r: any) => r.name || r));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedTreeId) {
      fetchTree(selectedTreeId).then((loaded: any) => {
        if (loaded?.name) {
          useUIStore.setState((state) => ({
            trees: state.trees.some((t) => t.id === loaded.id)
              ? state.trees.map((t) => (t.id === loaded.id ? loaded : t))
              : [...state.trees, loaded],
          }));
        }
      });
    }
  }, [selectedTreeId]);

  // باز کردن خودکار فرم ویرایش در صورت وجود پارامتر edit در آدرس
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && tree && !showTreeModal) {
      handleEditTreeClick(tree);
    }
  }, [searchParams, tree]);

  const handleCreateResearchTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeFormData.name.trim()) {
      toast.error('نام درختواره الزامی است');
      return;
    }
    if (!treeFormData.periodId) {
      toast.error('دوره زمانی الزامی است');
      return;
    }

    try {
      if (isEditingTree && editingTreeId) {
        await updateTree(editingTreeId, {
          name: treeFormData.name,
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: treeFormData.baseId ? parseInt(treeFormData.baseId) : undefined,
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        toast.success('درختواره با موفقیت ویرایش شد');
      } else {
        const newTree = await createTree({
          name: treeFormData.name,
          type: 'research',
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: treeFormData.baseId ? parseInt(treeFormData.baseId) : undefined,
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        toast.success('درختواره پژوهشی با موفقیت ایجاد شد');
        if (newTree && newTree.id) {
          setSearchParams({ treeId: String(newTree.id) });
        }
      }
      setShowTreeModal(false);
      setIsEditingTree(false);
      setEditingTreeId(null);
      await fetchTrees({ type: 'research' });
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره درختواره');
    }
  };

  const handleEditTreeClick = (targetTree?: any) => {
    const currentTarget = targetTree || tree;
    if (!currentTarget) {
      toast.error('درختواره‌ای انتخاب نشده است');
      return;
    }
    const tData = (currentTarget as any).tree || currentTarget;
    setTreeFormData({
      name: tData.name || '',
      description: tData.description || '',
      periodId: tData.periodId ? String(tData.periodId) : '',
      organizationLevel: tData.organizationLevel || '',
      baseId: tData.baseId ? String(tData.baseId) : '',
      unitId: tData.unitId ? String(tData.unitId) : ''
    });
    setEditingTreeId(tData.id);
    setIsEditingTree(true);
    setShowTreeModal(true);
  };

  const handleDeleteTree = () => {
    if (!selectedTreeId) return;
    setConfirmModal({
      isOpen: true,
      title: 'انتقال درختواره پژوهشی به سطل بازیافت',
      message: `آیا از انتقال درختواره پژوهشی «${selectedTree?.name || ''}» به سطل بازیافت اطمینان دارید؟`,
      action: async () => {
        const success = await deleteTree(selectedTreeId, false);
        if (success) {
          setSearchParams({});
        }
      }
    });
  };

  const researchTrees = trees.filter(t => t.type === 'research');
  const selectedTree = Number(tree?.id) === selectedTreeId ? tree as any : null;
  const treeNodes = Array.isArray(selectedTree?.nodes) ? selectedTree.nodes : [];
  const researchItems = Array.isArray(selectedTree?.research) ? selectedTree.research : [];
  const treeGaps = Array.isArray(selectedTree?.gaps) ? selectedTree.gaps : [];
  const filteredGaps: any[] = treeNodes
    .map((node: any) => {
      const researchItem = researchItems.find((item: any) => Number(item.nodeId) === Number(node.id));
      const gap = researchItem
        ? treeGaps.find((item: any) => Number(item.id) === Number(researchItem.gapId))
        : treeGaps.find((item: any) => Number(item.requiredNodeId) === Number(node.id));
      return {
        ...gap,
        id: researchItem?.id ?? node.id,
        title: node.title || 'بدون عنوان',
        description: node.description,
        requiredNode: node,
        status: gap?.status || 'open',
        priority: researchItem?.priority || node.priority || gap?.priority,
        researchItem: researchItem || null,
      };
    })
    .filter((row: any) => {
      const query = searchTerm.trim().toLocaleLowerCase();
      if (query && ![row.title, row.description, row.priority, row.researchItem?.responsibleUnit]
        .some(value => String(value || '').toLocaleLowerCase().includes(query))) return false;
      if (filterPriority !== 'all' && row.priority !== filterPriority) return false;
      if (filterImportance !== 'all' && row.researchItem?.importance !== filterImportance) return false;
      if (filterTimeFrame !== 'all' && row.researchItem?.timeFrame !== filterTimeFrame) return false;
      return matchesResearchFilter(advancedFilter, row);
    });

  // آمار
  const stats = {
    total: filteredGaps.length,
    open: filteredGaps.filter((g: any) => g.status === 'open').length,
    filled: filteredGaps.filter((g: any) => g.status === 'filled').length,
    partial: filteredGaps.filter((g: any) => g.status === 'partially_filled').length,
    byPriority: filteredGaps.reduce((acc: any, gap: any) => {
      const priority = gap.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}),
  };

  // تبدیل آیتم پژوهشی به مسئله
  const handleConvertToIssue = (gap: any) => {
    const researchItem = gap.researchItem || null;
    if (!researchItem) {
      toast.error('این گپ فاقد آیتم پژوهشی است. برای تولید آن به بخش تحلیل شکاف بروید.');
      return;
    }
    navigate(`/issues?fromResearch=${researchItem.id}`);
  };

  // ذخیره فرم آیتم پژوهشی
  const handleSaveResearchItem = async () => {
    if (!editingResearchItem) return;
    try {
      setSavingResearch(true);
      await api.put(`/api/research/${editingResearchItem.id}`, researchFormData);
      toast.success('اطلاعات پژوهش با موفقیت ذخیره شد');
      setEditingResearchItem(null);
      if (selectedTreeId) fetchTree(selectedTreeId);
    } catch (e: any) {
      toast.error(e.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setSavingResearch(false);
    }
  };

  const handleExport = async () => {
    if (!selectedTreeId || researchItems.length === 0) return;
    try {
      const response = await window.customFetch(`/api/outputs/research/${selectedTreeId}/excel`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `خطا در دریافت فایل (${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `درختواره_پژوهشی_${selectedTreeId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Research tree Excel export failed:', error);
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت فایل اکسل');
    }
  };

  const handleRepairResearchTree = async () => {
    if (!selectedTreeId) return;
    setRepairingResearchTree(true);
    try {
      const response = await window.customFetch('/api/gaps/generate-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchTreeId: selectedTreeId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'بازیابی موضوع‌های پژوهشی ناموفق بود');

      if (result.success) {
        toast.success(result.message || 'موضوع‌های پژوهشی بازیابی شدند');
      } else {
        toast(result.message || 'گپی برای تولید موضوع پژوهشی پیدا نشد', { icon: 'ℹ️' });
      }
      await fetchTree(selectedTreeId);
      await fetchTrees({ type: 'research' });
    } catch (error) {
      console.error('Failed to repair the selected research tree:', error);
      toast.error(error instanceof Error ? error.message : 'بازیابی موضوع‌های پژوهشی ناموفق بود');
    } finally {
      setRepairingResearchTree(false);
    }
  };

  // =========================================================================
  // گام اول: در صورت عدم انتخاب درختواره، صفحه ایندکس باز می‌شود
  // =========================================================================
  if (!selectedTreeId) {
    return (
      <div className="space-y-6" dir="rtl">
        <TreeIndexPage
          title="🔬 درختواره‌های دانشی پژوهشی"
          subtitle="موضوعات نیازمند تولید دانش و اولویت‌بندی پروژه‌ها بر پایه گپ‌های دانشی"
          treeType="research"
          icon={Database}
          iconGradient="from-purple-600 to-indigo-600"
          trees={researchTrees}
          periods={periods}
          bases={bases}
          loading={loading}
          onRefresh={async () => {
            await fetchTrees({ type: 'research' });
          }}
          onSelectTree={(id) => setSearchParams({ treeId: String(id) })}
          onAddNewTree={() => {
            setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' });
            setIsEditingTree(false);
            setEditingTreeId(null);
            setShowTreeModal(true);
          }}
          onEditTree={(t) => {
            setSearchParams({ treeId: String(t.id), edit: 'true' });
            handleEditTreeClick(t);
          }}
          onSoftDeleteTree={async (id) => {
            return await deleteTree(id, false);
          }}
          onRestoreTree={async (id) => {
            return await restoreTree(id);
          }}
          onPermanentDeleteTree={async (id) => {
            return await deleteTree(id, true);
          }}
        />

        {/* مدال ایجاد / ویرایش درختواره پژوهشی */}
        <TreeModal 
          isOpen={showTreeModal} 
          onClose={() => { 
            setShowTreeModal(false); 
            setIsEditingTree(false);
            setEditingTreeId(null);
          }} 
          isEditing={isEditingTree} 
          onSubmit={handleCreateResearchTree}
          formData={treeFormData} 
          setFormData={setTreeFormData} 
          periods={periods} 
          bases={bases} 
          units={units} 
          orgLevels={orgLevels} 
        />
      </div>
    );
  }

  // =========================================================================
  // گام دوم: صفحه نمایش و مدیریت درختواره پژوهشی با نوار ابزار استاندارد
  // =========================================================================
  const viewToolbarActions = [
    {
      id: 'back',
      label: 'بازگشت به فهرست',
      icon: ChevronRight,
      variant: 'secondary' as const,
      onClick: () => setSearchParams({}),
      title: 'بازگشت به فهرست درختواره‌ها',
    },
    {
      id: 'view-mode',
      label: viewMode === 'table' ? 'نمای درختی' : 'نمای جدول',
      icon: viewMode === 'table' ? Layers : Table,
      variant: 'indigo' as const,
      onClick: () => setViewMode(viewMode === 'table' ? 'tree' : 'table'),
      title: 'تغییر شیوه نمایش بین جدول و گراف',
    },
    {
      id: 'export',
      label: 'خروجی اکسل',
      icon: Download,
      variant: 'success' as const,
      onClick: handleExport,
      disabled: researchItems.length === 0,
      title: researchItems.length ? 'دریافت خروجی اکسل از موارد پژوهشی' : 'در این درختواره مورد پژوهشی برای خروجی وجود ندارد',
    },
    {
      id: 'refresh',
      label: 'بروزرسانی',
      icon: RefreshCw,
      variant: 'secondary' as const,
      onClick: () => {
        if (selectedTreeId) {
          fetchTree(selectedTreeId);
          toast.success('اطلاعات بروزرسانی شد');
        }
      },
      title: 'بارگذاری مجدد اطلاعات',
    },
    {
      id: 'edit',
      label: 'ویرایش مشخصات',
      icon: Edit2,
      variant: 'warning' as const,
      onClick: () => handleEditTreeClick(selectedTree),
      disabled: !selectedTree,
      title: 'ویرایش مشخصات درختواره پژوهشی',
    },
    {
      id: 'delete',
      label: 'حذف درختواره',
      icon: Trash2,
      variant: 'danger' as const,
      onClick: handleDeleteTree,
      title: 'انتقال درختواره به سطل بازیافت',
    },
    {
      id: 'help',
      label: 'راهنما',
      icon: HelpCircle,
      variant: 'ghost' as const,
      onClick: () => setShowHelp(value => !value),
      title: 'راهنمای تحلیل پژوهش',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* نوار ابزار اختصاصی بالای صفحه با آیکون در بالا و عنوان در زیر */}
      <PageToolbar
        title={selectedTree?.name || 'درختواره پژوهشی'}
        subtitle={selectedTree ? `ساختار سازمانی: ${getTreeOrgText(selectedTree)} • دوره: ${selectedTree.periodName || 'نامشخص'}` : 'در حال بارگذاری...'}
        icon={Database}
        iconColor="from-purple-600 to-indigo-600"
        actions={viewToolbarActions}
        actionsClassName="flex-nowrap overflow-x-auto pb-1"
        pdfEnabled={!loading && treeNodes.length > 0}
      />
      {!selectedTree && !loading && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>{treeError || 'درختواره پژوهشی انتخاب‌شده پیدا نشد یا داده‌ای برای نمایش ندارد.'}</span>
          <button
            type="button"
            onClick={() => void fetchTree(selectedTreeId)}
            className="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 font-medium hover:bg-amber-200"
          >
            تلاش دوباره
          </button>
        </div>
      )}
      {selectedTree && !loading && treeNodes.length === 0 && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
          <span>برای این درختواره هنوز گرهی ثبت نشده است. اگر در تحلیل شکاف گپ باز یا نیمه‌پر دارید، بازیابی را اجرا کنید؛ گپ‌های تکمیل‌شده به موضوع پژوهشی تبدیل نمی‌شوند.</span>
          <button
            type="button"
            onClick={() => void handleRepairResearchTree()}
            disabled={repairingResearchTree || loading}
            className="shrink-0 rounded-lg bg-sky-700 px-3 py-2 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {repairingResearchTree ? 'در حال بازیابی...' : 'بازیابی موضوع‌ها از گپ‌ها'}
          </button>
        </div>
      )}

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

      {/* Stats Cards */}
      <div data-pdf-content data-pdf-has-data={treeNodes.length > 0} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">مجموع شکاف‌های پژوهشی</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Target size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">شکاف‌های فعال (باز)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.open}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">پوشش داده شده</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.filled}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-600">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">اولویت بحرانی</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.byPriority['critical'] || 0}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Controls & Advanced Query Builder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-96 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="جستجو در موضوعات، اولویت‌ها و متولیان..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={filterPriority} 
              onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">همه اولویت‌ها</option>
              <option value="critical">بحرانی</option>
              <option value="high">بالا</option>
              <option value="medium">متوسط</option>
              <option value="low">پایین</option>
            </select>
          </div>
        </div>

        {/* فیلترساز پیشرفته چندسطحی */}
        <AdvancedQueryBuilder 
          fields={researchFilterFields}
          initialFilter={advancedFilter || undefined}
          onChange={(filter) => setAdvancedFilter(filter)}
        />
      </div>

      {/* Visualization / Content */}
      {viewMode === 'tree' ? (
        <div data-pdf-content data-pdf-chart data-pdf-has-data={treeNodes.length > 0} className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 min-h-[500px]">
          <TreeGraphView nodes={treeNodes} treeName={selectedTree?.name || 'درختواره پژوهشی'} />
        </div>
      ) : (
        <div data-pdf-content data-pdf-has-data={filteredGaps.length > 0} className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500">
                  <th className="p-3.5">عنوان شکاف و موضوع پژوهشی</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">اولویت اقدام</th>
                  <th className="p-3.5">سطح اهمیت</th>
                  <th className="p-3.5">افق زمانی</th>
                  <th className="p-3.5">هزینه/فایده</th>
                  <th className="p-3.5">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredGaps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      هیچ موضوع پژوهشی منطبق با فیلترها یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredGaps.map((gap: any) => (
                    <tr key={gap.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="p-3.5">
                        <div className="font-medium text-gray-800">{(gap as any).title || gap.requiredNode?.title}</div>
                        {gap.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{gap.description}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          gap.status === 'filled' ? 'bg-green-100 text-green-700' :
                          gap.status === 'partially_filled' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {gap.status === 'filled' ? 'تکمیل شده' : gap.status === 'partially_filled' ? 'تا حدی پوشش‌داده' : 'باز'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-xs font-medium text-gray-600">
                          {gap.priority || 'نامشخص'}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-gray-600">{gap.researchItem?.importance || '-'}</td>
                      <td className="p-3.5 text-xs text-gray-600">{gap.researchItem?.timeFrame || '-'}</td>
                      <td className="p-3.5 text-xs text-gray-600">{gap.researchItem?.costBenefit || '-'}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!gap.researchItem) return;
                              setEditingResearchItem(gap.researchItem);
                              setResearchFormData(gap.researchItem);
                            }}
                            disabled={!gap.researchItem}
                            title={gap.researchItem ? 'ویرایش ابعاد پژوهشی' : 'برای این گره، اطلاعات پژوهشی ثبت نشده است'}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleConvertToIssue(gap)}
                            disabled={!gap.researchItem}
                            title={gap.researchItem ? 'تبدیل موضوع پژوهشی به مسئله' : 'برای این گره، اطلاعات پژوهشی ثبت نشده است'}
                            className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          >
                            تبدیل به مسئله
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
      )}

      {/* مدال ایجاد / ویرایش درختواره پژوهشی */}
      <TreeModal 
        isOpen={showTreeModal} 
        onClose={() => { 
          setShowTreeModal(false); 
          setIsEditingTree(false);
          setEditingTreeId(null);
        }} 
        isEditing={isEditingTree} 
        onSubmit={handleCreateResearchTree}
        formData={treeFormData} 
        setFormData={setTreeFormData} 
        periods={periods} 
        bases={bases} 
        units={units} 
        orgLevels={orgLevels} 
      />

      {/* مدال تایید حذف */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={async () => {
          if (confirmModal.action) {
            await confirmModal.action();
          }
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="تایید و انتقال به سطل بازیافت"
        cancelText="انصراف"
      />

      {/* Modal ویرایش ابعاد پژوهشی */}
      {editingResearchItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-800 text-base">تکمیل ابعاد تحلیلی و مدیریتی پژوهش</h3>
              <button 
                onClick={() => setEditingResearchItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">سطح اهمیت پروژه</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.importanceLevel || ''}
                    onChange={e => setResearchFormData({...researchFormData, importanceLevel: e.target.value})}
                  >
                    <option value="">انتخاب کنید...</option>
                    {importanceOptions.map((imp: string) => (
                      <option key={imp} value={imp}>{imp}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اولویت اقدام</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.actionPriority || ''}
                    onChange={e => setResearchFormData({...researchFormData, actionPriority: e.target.value})}
                  >
                    <option value="">انتخاب کنید...</option>
                    {priorityOptions.map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">افق زمانی اجرا</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.timeFrame || ''}
                    onChange={e => setResearchFormData({...researchFormData, timeFrame: e.target.value})}
                  >
                    <option value="">انتخاب کنید...</option>
                    <option value="کوتاه‌مدت">کوتاه‌مدت (کمتر از ۶ ماه)</option>
                    <option value="میان‌مدت">میان‌مدت (۶ الی ۲۴ ماه)</option>
                    <option value="بلند‌مدت">بلند‌مدت (بیش از ۲ سال)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">نسبت هزینه/فایده (۱ تا ۱۰)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    value={researchFormData.costBenefit || ''}
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
                {savingResearch ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResearchTree;
