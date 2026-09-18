// src/pages/Gaps/GapAnalysis.tsx
// صفحه تحلیل شکاف دانشی - نسخه ۴.۰ (ظاهر ارتقاء یافته + گزارش توضیحی تحلیل)
// منطق کسب‌وکار و فراخوانی‌های API بدون تغییر؛ فقط نمایش و تجربه کاربری بهبود یافته است.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useGapAnalysis } from '../../hooks/useGapAnalysis';
import { useTree } from '../../hooks/useTree';
import {
  Target, Search, X, Download, RefreshCw,
  CheckCircle, AlertCircle, Clock,
  Filter, HelpCircle, Zap, Edit2, Upload,
  FileText, Info, Layers, Sparkles, TrendingUp, ChevronDown, RotateCcw, ListChecks,
  Database, UserCheck, Ban, ShieldCheck, History, GitBranch as PathIcon, XCircle
} from 'lucide-react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { RelationalView } from '../../components/gaps/RelationalView';
import toast from 'react-hot-toast';
import { TreeGraphView } from '../Trees/components/TreeGraphView';
import { useNavigate } from 'react-router-dom';
import ExcelIcon from '../../components/icon/ExcelIcon';

/** برچسب فارسی سطوح درختواره */
const LEVEL_LABELS: Record<string, string> = {
  'R': 'ریشه', 'T': 'تنه', 'B': 'شاخه', 'SB': 'زیرشاخه', 'L': 'برگ', 'Q': 'پرسش',
};

const GAP_TYPE_LABELS: Record<string, string> = {
  'fuzzy': 'تطابق فازی',
  'partial': 'تطابق جزئی',
  'complete': 'کامل',
  'complete_missing': 'قالب‌ها یافت نشد',
  'manual': 'تأیید دستی',
};

export function GapAnalysis() {
  const {
    gaps,
    report,
    loading,
    pagination,
    fetchGaps,
    analyzeGaps,
    reviewGap,
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
  const [viewMode, setViewMode] = useState<'tree' | 'table' | 'relational'>('tree');
  const [relHoveredGap, setRelHoveredGap] = useState<number | null>(null);

  // ساخت داده‌های نمای ارتباطی
  const relRequiredNodes = useMemo(() => {
    const nodes = requiredTreeData?.nodes || [];
    return nodes.filter((n: any) => n.level === 'L' || n.level === 'SB').map((n: any) => {
      const gap = gaps.find((g: any) => g.requiredNodeId === n.id);
      const research = gap?.researchItem;
      return {
        id: n.id,
        title: n.title,
        level: n.level,
        levelLabel: LEVEL_LABELS[n.level] || n.level,
        gapId: gap?.id,
        gapStatus: gap?.status || 'filled',
        matchScore: gap?.matchScore || 0,
        producedNodeId: gap?.producedNodeId,
        researchItem: research,
        gap: gap,
      };
    });
  }, [requiredTreeData, gaps]);

  const relProducedNodes = useMemo(() => {
    const nodes = producedTreeData?.nodes || [];
    return nodes.filter((n: any) => n.level === 'L' || n.level === 'SB').map((n: any) => {
      const connectedGap = relRequiredNodes.find((r: any) => r.producedNodeId === n.id);
      return {
        id: n.id,
        title: n.title,
        level: n.level,
        levelLabel: LEVEL_LABELS[n.level] || n.level,
        connected: !!connectedGap,
        connectedGapId: connectedGap?.gapId,
        matchScore: connectedGap?.matchScore || 0,
      };
    });
  }, [producedTreeData, relRequiredNodes]);

  const relResearchItems = useMemo(() => {
    const items: any[] = [];
    relRequiredNodes.forEach((r: any) => {
      if (r.researchItem) {
        items.push({
          ...r.researchItem,
          requiredNodeId: r.id,
          requiredNodeTitle: r.title,
          gapStatus: r.gapStatus,
        });
      }
    });
    return items;
  }, [relRequiredNodes]);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  const [showFillModal, setShowFillModal] = useState(false);
  const [fillProducedNodeId, setFillProducedNodeId] = useState<number | null>(null);
  // 🟢 انتخاب نوع تطابق هنگام پر کردن گپ (کامل یا جزئی)
  const [fillStatusChoice, setFillStatusChoice] = useState<'filled' | 'partially_filled'>('filled');
  const [fillNote, setFillNote] = useState('');
  const [showMethodology, setShowMethodology] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showHelp, setShowHelp] = useState(false);

  // 🟢 بازنگی دستی گپ
  const [reviewModalGap, setReviewModalGap] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  // 🟢 سوابق تحلیل‌های قبلی
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [ownerPath, setOwnerPath] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    if (producedTreeId) {
      fetchProducedTree(producedTreeId);
    }
  }, [producedTreeId, fetchProducedTree]);

  useEffect(() => {
    fetchTrees();
    fetchGaps({ page: 1, limit: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        if (!producedTreeId && producedTreeId !== 0) {
          const producedId = firstGap?.producedNode?.treeId;
          setProducedTreeId(producedId || 0);
        }

        fetchRequiredTree(treeIdFromGap);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaps, requiredTreeData, loading]);

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
        setShowMethodology(true);
        // 🟢 ذخیره سوابق و مسیر مالک از پاسخ سرور
        if (result.runHistory) setRunHistory(result.runHistory);
        if (result.ownerPath) setOwnerPath(result.ownerPath);
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
      const res = await (window.customFetch || window.fetch)('/api/gaps/generate-research', {
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

  const handleFillGap = async (gapId: number, producedNodeId: number, statusChoice: 'filled' | 'partially_filled' = 'filled', note?: string) => {
    await fillGap(gapId, producedNodeId, statusChoice, note);
    setShowFillModal(false);
    setSelectedGap(null);
    setFillNote('');
    toast.success(statusChoice === 'partially_filled' ? 'گپ با تطابق جزئی ثبت شد' : 'گپ با موفقیت پر شد');
  };

  const handleDeleteGap = async (gapId: number) => {
    await deleteGap(gapId);
  };

  // 🟢 ثبت بازنگی دستی
  const handleReview = async (verdict: 'confirmed_gap' | 'not_gap' | 'adjusted', newStatus?: string) => {
    if (!reviewModalGap) return;
    await reviewGap(reviewModalGap.id, verdict, newStatus, reviewNote);
    setReviewModalGap(null);
    setReviewNote('');
    if (requiredTreeId) fetchRequiredTree(requiredTreeId);
  };

  const handleConvertToResearch = (gap: any, nodeFallback?: any) => {
    // انتقال کامل اطلاعات گره به فرم مسئله
    const nodeData = nodeFallback || gap?.requiredNode;
    navigate('/issues', {
      state: {
        createFromGap: gap?.issue ? undefined : gap,
        createFromResearch: gap?.issue ? true : undefined,
        initialData: gap?.issue,
        nodeFallback: nodeData,
        // اطلاعات تکمیلی از تحلیل شکاف
        gapContext: {
          gapId: gap?.id,
          requiredNodeId: gap?.requiredNodeId,
          producedNodeId: gap?.producedNodeId,
          gapStatus: gap?.status,
          gapType: gap?.gapType,
          matchScore: gap?.matchScore,
          gapDescription: gap?.description,
          nodeTitle: nodeData?.title,
          nodeLevel: nodeData?.level,
          nodeLevelLabel: LEVEL_LABELS[nodeData?.level] || nodeData?.level,
          requiredTreeName: requiredTreeData?.name,
          producedTreeName: producedTreeData?.name,
        }
      }
    });
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
      const res = await (window.customFetch || window.fetch)(`/api/outputs/gaps/${requiredTreeId}/excel-import`, {
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

  /** تنظیمات حلقه پوشش کلی (donut) */
  const coveragePercent = report?.weightedCoveragePercent ?? (stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0);
  const ringStyle = useMemo(() => {
    const circumference = 2 * Math.PI * 34;
    return {
      strokeDasharray: `${(coveragePercent / 100) * circumference} ${circumference}`,
    };
  }, [coveragePercent]);

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterPriority !== 'all';

  return (
    <div className="space-y-6">
      {/* ═══════════════ Header ═══════════════ */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
        <div className="absolute inset-0 bg-gradient-to-l from-rose-50/60 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-200/60">
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
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-l from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-200/60 hover:shadow-rose-300/60 hover:-translate-y-0.5'
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/60 hover:-translate-y-0.5'
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm'
              }`}
              title="خروجی اکسل"
            >
              <Download size={18} />
              <ExcelIcon color="#059669" />
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300 shadow-sm'
              }`}
              title="ورود اطلاعات از اکسل"
            >
              <Upload size={18} />
              <ExcelIcon color="#0284c7" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════ سوابق تحلیل‌های قبلی ═══════════════ */}
      {runHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
          <button
            onClick={() => setShowRunHistory(!showRunHistory)}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
              <History size={18} className="text-slate-500" />
              سوابق تحلیل شکاف ({runHistory.length} اجرای اخیر)
              {ownerPath && (
                <span className="text-[10px] font-normal text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 mr-2">
                  مالک: {ownerPath}
                </span>
              )}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showRunHistory ? 'rotate-180' : ''}`} />
          </button>
          {showRunHistory && (
            <div className="p-4 border-t border-gray-100 animate-fade-in">
              <div className="space-y-2">
                {runHistory.map((run, i) => (
                  <div key={run.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs ${
                    i === 0 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50/50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold">آخرین</span>}
                      <span className="text-gray-500">{run.createdAt?.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-600">{run.totalLeaves} نیاز</span>
                      <span className="text-emerald-600 font-medium">✔ {run.filled}</span>
                      <span className="text-amber-600 font-medium">◐ {run.partial}</span>
                      <span className="text-rose-600 font-medium">✖ {run.openCount}</span>
                      <span className="text-sky-600 font-bold">پوشش {run.coveragePercent}٪</span>
                      {run.carriedReviews > 0 && (
                        <span className="text-amber-500" title="نظرات دستی کاربر که از تحلیل قبلی حفظ شد">
                          🎧 {run.carriedReviews} نظر دستی
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                <Info size={11} />
                هر بار اجرای تحلیل، یک رکورد سابقه ثبت می‌شود. نظرات دستی شما (بازنگی‌ها) در تمام تحلیل‌های بعدی به‌صورت خودکار اعمال و حفظ می‌شوند.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ راهنما ═══════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <HelpCircle size={18} className="text-sky-500" />
            راهنمای تحلیل شکاف و وضعیت‌ها
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} />
        </button>
        {showHelp && (
          <div className="p-5 border-t border-gray-100 bg-white animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle size={15} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-700 text-sm mb-1">گپ باز (بدون پوشش)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    این وضعیت نشان می‌دهد که برای این نیاز دانشی، هنوز هیچ دارایی یا مستندی در سازمان تولید نشده است. این موارد نیازمند تعریف پروژه‌های پژوهشی جدید هستند.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0 mt-1">
                  <Clock size={15} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-700 text-sm mb-1">نیمه‌پر (تطابق جزئی)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    دارایی‌هایی برای این نیاز ثبت شده اما پوشش کاملی ندارند و فقط بخشی از نیاز را برطرف می‌کنند. نیاز به توسعه یا تکمیل مستندات فعلی وجود دارد.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle size={15} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-700 text-sm mb-1">پر شده (کامل)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                    این نیاز دانشی به طور کامل توسط دارایی‌های موجود پوشش داده شده است و در حال حاضر هیچ شکافی برای آن در سازمان وجود ندارد.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
              <strong>پوشش (Coverage):</strong> درصد کلی نیازهای دانشی که به طور کامل یا جزئی توسط دارایی‌های موجود سازمان برآورده شده‌اند.
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ انتخاب درختواره‌ها ═══════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
            <Layers size={16} />
          </div>
          <h2 className="text-sm font-bold text-gray-700">انتخاب درختواره‌ها برای تحلیل</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              درختواره مورد نیاز <span className="text-rose-500">*</span>
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
              درختواره تولیدشده <span className="text-rose-500">*</span>
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

      {/* ═══════════════ شرح تحلیل (گزارش توضیحی موتور) ═══════════════ */}
      {report && (
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-50 via-white to-white rounded-2xl shadow-sm border border-slate-200">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-sky-400 via-indigo-400 to-rose-400" />
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl shadow-md shadow-indigo-200/60">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-gray-800 text-sm">شرح تحلیل انجام‌شده</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  موتور تحلیل نسخه ۲ — {report.requiredTree} {report.producedTree !== 'بدون درختواره تولیدشده' ? `× ${report.producedTree}` : '(بدون تولیدشده)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-medium border border-indigo-100">
                <FileText size={12} />
                {report.createdAt}
              </span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showMethodology ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showMethodology && (
            <div className="border-t border-slate-100 p-5 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* جمع‌بندی + حلقه پوشش */}
                <div className="lg:col-span-2 flex flex-col items-center gap-4">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke="url(#coverageGradient)"
                        strokeWidth="9" strokeLinecap="round"
                        style={{ ...ringStyle, transition: 'stroke-dasharray 1s ease-out' }}
                      />
                      <defs>
                        <linearGradient id="coverageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-gray-800">{coveragePercent}٪</span>
                      <span className="text-[10px] text-gray-400">پوشش وزن‌دار</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed text-justify bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {report.summaryFa}
                  </p>
                </div>

                {/* گام‌های روش تحلیل */}
                <div className="lg:col-span-3">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
                    <ListChecks size={14} className="text-indigo-400" />
                    روش تحلیل (گام به گام)
                  </h4>
                  <ol className="space-y-2.5">
                    {(report.methodologyFa || []).map((step, i) => (
                      <li key={i} className="flex gap-3 items-start group">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {i + 1}
                        </span>
                        <p className="text-xs text-gray-600 leading-relaxed text-justify pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ol>

                  {/* پوشش بر اساس سطح */}
                  {report.byLevel && Object.keys(report.byLevel).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                        <TrendingUp size={13} className="text-rose-400" />
                        پوشش بر اساس سطح ساختاری
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(report.byLevel).map(([lvl, s]) => (
                          <div key={lvl} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="text-[11px] font-bold text-gray-600">{LEVEL_LABELS[lvl] || lvl}</span>
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${s.coveragePercent >= 80 ? 'bg-emerald-500' : s.coveragePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${s.coveragePercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">{s.coveragePercent}٪ ({s.total} گره)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ جستجو و فیلترها ═══════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در گپ‌ها..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all bg-gray-50/50 focus:bg-white"
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
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 min-w-[140px]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">باز (گپ)</option>
            <option value="filled">پر شده</option>
            <option value="partially_filled">نیمه‌پر</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 min-w-[140px]"
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
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              hasActiveFilters
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {hasActiveFilters ? <RotateCcw size={15} /> : <Filter size={16} />}
            پاک کردن
          </button>
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 ml-2">فیلترهای فعال:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[10px] border border-rose-100">
                جستجو: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-[10px] border border-sky-100">
                وضعیت: {filterStatus === 'open' ? 'باز' : filterStatus === 'filled' ? 'پر شده' : 'نیمه‌پر'}
                <button onClick={() => setFilterStatus('all')} className="hover:text-sky-500">
                  <X size={12} />
                </button>
              </span>
            )}
            {filterPriority !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] border border-amber-100">
                اولویت: {filterPriority === 'critical' ? 'بحرانی' : filterPriority === 'high' ? 'بالا' : filterPriority === 'medium' ? 'متوسط' : 'پایین'}
                <button onClick={() => setFilterPriority('all')} className="hover:text-amber-500">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ کارت‌های آماری ═══════════════ */}
      {gaps.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* کل گپ‌ها */}
          <div className="stat-card bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 text-center">
            <p className="text-[11px] text-gray-400 mb-1">کل گپ‌ها</p>
            <p className="text-2xl font-black text-gray-800">{stats.total}</p>
          </div>

          {/* باز */}
          <div className="stat-card bg-gradient-to-b from-rose-50 to-white rounded-2xl border border-rose-200/80 p-4 text-center">
            <p className="text-[11px] text-rose-500 mb-1 flex items-center justify-center gap-1">
              <AlertCircle size={12} /> باز
            </p>
            <p className="text-2xl font-black text-rose-600">{stats.open}</p>
          </div>

          {/* نیمه‌پر */}
          <div className="stat-card bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200/80 p-4 text-center">
            <p className="text-[11px] text-amber-600 mb-1 flex items-center justify-center gap-1">
              <Clock size={12} /> نیمه‌پر
            </p>
            <p className="text-2xl font-black text-amber-600">{stats.partial}</p>
          </div>

          {/* پر شده */}
          <div className="stat-card bg-gradient-to-b from-emerald-50 to-white rounded-2xl border border-emerald-200/80 p-4 text-center">
            <p className="text-[11px] text-emerald-600 mb-1 flex items-center justify-center gap-1">
              <CheckCircle size={12} /> پر شده
            </p>
            <p className="text-2xl font-black text-emerald-600">{stats.filled}</p>
          </div>

          {/* پوشش دانشی */}
          <div className="stat-card bg-gradient-to-b from-sky-50 to-white rounded-2xl border border-sky-200/80 p-4 text-center">
            <p className="text-[11px] text-sky-600 mb-1 flex items-center justify-center gap-1">
              <TrendingUp size={12} /> پوشش دانشی
            </p>
            <p className="text-2xl font-black text-sky-600">
              {stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0}٪
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════ نتایج ═══════════════ */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">در حال بارگذاری گپ‌ها...</p>
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-50 to-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Target size={40} className="text-rose-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">هیچ گپی یافت نشد</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {gaps.length === 0
              ? 'ابتدا تحلیل شکاف را با انتخاب درختواره‌ها و کلیک روی «اجرای تحلیل شکاف» انجام دهید.'
              : 'با فیلترهای موجود، گپی یافت نشد. فیلترها را تغییر دهید.'}
          </p>
          {gaps.length === 0 && (
            <button
              onClick={handleAnalyze}
              disabled={!requiredTreeId || producedTreeId === null}
              className="mt-4 px-6 py-2.5 bg-gradient-to-l from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg shadow-rose-200/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={16} />
              شروع تحلیل
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'tree'
                  ? 'bg-gradient-to-l from-rose-600 to-red-600 text-white shadow-md shadow-rose-200/60'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Layers size={15} />
              درختی
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-l from-rose-600 to-red-600 text-white shadow-md shadow-rose-200/60'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <ListChecks size={15} />
              جدولی
            </button>
            <button
              onClick={() => setViewMode('relational')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'relational'
                  ? 'bg-gradient-to-l from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200/60'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Database size={15} />
              ارتباطی (۳ جدول)
            </button>
          </div>

          {viewMode === 'relational' ? (
            <RelationalView
              requiredNodes={relRequiredNodes}
              producedNodes={relProducedNodes}
              researchItems={relResearchItems}
              onNodeClick={(node, type) => {
                if (type === 'required') {
                  const gap = gaps.find((g: any) => g.requiredNodeId === node.id);
                  if (gap && gap.status !== 'filled') {
                    handleConvertToResearch(gap, node);
                  } else if (gap) {
                    toast.success('این نیاز دانشی کاملاً پوشش داده شده است');
                  }
                } else if (type === 'research') {
                  const gap = gaps.find((g: any) => g.requiredNodeId === node.requiredNodeId);
                  if (gap) handleConvertToResearch(gap, node);
                }
              }}
            />
          ) : viewMode === 'tree' ? (
            <div>
              {requiredTreeData && requiredTreeData.nodes ? (
                <TreeGraphView
                  nodes={requiredTreeData.nodes.map((node: any) => {
                    const gap = gaps.find(g => g.requiredNodeId === node.id);
                    return {
                      ...node,
                      gapData: gap || null,
                      gapStatus: gap ? gap.status : 'filled',
                    };
                  })}
                  treeName={requiredTreeData.name}
                  onNodeClick={(node) => {
                    if (node.gapData && (node.gapData as any).researchItemId) {
                      handleConvertToResearch(node.gapData, node);
                    } else if (node.gapData && node.gapData.status !== 'filled') {
                      handleConvertToResearch(node.gapData, node);
                    } else if (!node.gapData && node.isGap) {
                      handleConvertToResearch(null, node);
                    } else if (node.gapData && node.gapData.status === 'filled') {
                      toast.success('این نیاز دانشی کاملاً پوشش داده شده است');
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 bg-white rounded-2xl border border-gray-200/80">
                  در حال بارگذاری درختواره...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gradient-to-l from-gray-50 to-white border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">#</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">گره مورد نیاز</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">وضعیت</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">نوع تطابق</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">امتیاز تطابق</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500">اولویت</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGaps.map((gap, index) => (
                      <tr key={gap.id} className="hover:bg-rose-50/40 transition-colors group">
                        <td className="px-4 py-3.5 text-gray-400 text-xs">{index + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-gray-800">{gap.requiredNode?.title || 'نامشخص'}</div>
                          {gap.requiredNode?.level && (
                            <span className="text-[10px] text-gray-400">
                              سطح: {LEVEL_LABELS[gap.requiredNode.level] || gap.requiredNode.level}
                            </span>
                          )}
                          {/* 🟢 مسیر ساختاری + مالک گره (مطابق ساختار آجا/نیرو/رده) */}
                          {(gap.metadata?.structuralPath || gap.metadata?.ownerPath) && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1" dir="rtl">
                              <PathIcon size={10} />
                              <span title="مسیر ساختاری درختواره (ریشه تا گره)">
                                {gap.metadata?.structuralPath}
                              </span>
                              {gap.metadata?.ownerPath && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 mr-1">
                                  {gap.metadata.ownerPath}
                                </span>
                              )}
                            </div>
                          )}
                          {/* 🟢 نشان بازنگی دستی کاربر */}
                          {gap.metadata?.manualReview && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 text-[9px]">
                              <UserCheck size={9} /> بازنگی دستی
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                            gap.status === 'filled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            gap.status === 'partially_filled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {gap.status === 'filled' ? <CheckCircle size={12} /> :
                              gap.status === 'partially_filled' ? <Clock size={12} /> :
                                <AlertCircle size={12} />}
                            {gap.status === 'filled' ? 'پر شده' :
                              gap.status === 'partially_filled' ? 'نیمه‌پر' : 'باز (گپ)'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          {GAP_TYPE_LABELS[gap.gapType || ''] || '-'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  (gap.matchScore || 0) >= 0.8 ? 'bg-emerald-500' :
                                  (gap.matchScore || 0) >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${(gap.matchScore || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {Math.round((gap.matchScore || 0) * 100)}٪
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            gap.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                              gap.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                gap.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                          }`}>
                            {gap.priority === 'critical' ? 'بحرانی' :
                              gap.priority === 'high' ? 'بالا' :
                                gap.priority === 'medium' ? 'متوسط' : 'پایین'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            {(gap as any).researchItemId ? (
                              <button
                                onClick={() => handleConvertToResearch(gap, gap.requiredNode)}
                                className="p-1.5 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                                title="مشاهده و ویرایش مسئله"
                              >
                                <Edit2 size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConvertToResearch(gap, gap.requiredNode)}
                                className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                                title="تبدیل به پژوهش (مسئله)"
                              >
                                <Target size={16} />
                              </button>
                            )}
                            {gap.status !== 'filled' && (
                              <button
                                onClick={() => {
                                  setSelectedGap(gap);
                                  setFillStatusChoice('filled');
                                  setShowFillModal(true);
                                }}
                                className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="پر کردن گپ (تطابق کامل یا جزئی)"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {/* 🟢 بازنگی دستی = نظر کاربر: این گپ نیست / گپ تأیید می‌شود / اصلاح وضعیت — ذخیره در DB و اعمال خودکار در تحلیل‌های بعدی */}
                            <button
                              onClick={() => {
                                setReviewModalGap(gap);
                                setReviewNote('');
                              }}
                              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="بازنگی (نظر من): این گپ نیست / گپ تأیید می‌شود / اصلاح وضعیت — در تحلیل‌های بعدی اعمال می‌شود"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteGap(gap.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف گپ (در سوابق بازنگی ثبت می‌شود)"
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
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-white'
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

      {/* ═══════════════ مودال بازنگی دستی گپ ═══════════════ */}
      {reviewModalGap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gradient-to-l from-amber-50 to-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-amber-100">
                  <UserCheck size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">بازنگی دستی نتیجه تحلیل</h3>
                  <p className="text-xs text-gray-500">
                    گره: {reviewModalGap.requiredNode?.title || 'نامشخص'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalGap(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                <Info size={13} className="inline ml-1 text-slate-400" />
                نظر شما ثبت و در دیتابیس ذخیره می‌شود. در تحلیل‌های بعدی، نظر شما به‌عنوان «آخرین نسخه» به‌صورت خودکار بر نتیجه موتور تحلیل اولویت دارد.
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReview('not_gap')}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex flex-col items-center gap-1.5 text-xs font-medium"
                >
                  <Ban size={18} />
                  این گپ نیست
                </button>
                <button
                  onClick={() => handleReview('confirmed_gap')}
                  className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex flex-col items-center gap-1.5 text-xs font-medium"
                >
                  <ShieldCheck size={18} />
                  گپ تأیید می‌شود
                </button>
                <button
                  onClick={() => handleReview('adjusted')}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex flex-col items-center gap-1.5 text-xs font-medium"
                >
                  <Edit2 size={18} />
                  اصلاح وضعیت
                </button>
              </div>

              {/* 🟢 انتخاب وضعیت جدید در حالت اصلاح */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReview('adjusted', 'filled')}
                  className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 transition-colors flex flex-col items-center gap-1 text-[11px] font-medium"
                >
                  <CheckCircle size={15} />
                  پوشش کامل
                </button>
                <button
                  onClick={() => handleReview('adjusted', 'partially_filled')}
                  className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/60 text-amber-700 hover:bg-amber-100 transition-colors flex flex-col items-center gap-1 text-[11px] font-medium"
                >
                  <AlertCircle size={15} />
                  پوشش جزئی
                </button>
                <button
                  onClick={() => handleReview('adjusted', 'open')}
                  className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/60 text-rose-700 hover:bg-rose-100 transition-colors flex flex-col items-center gap-1 text-[11px] font-medium"
                >
                  <XCircle size={15} />
                  گپ باز
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">توضیح نظر (اختیاری — در سابقه ثبت می‌شود)</label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 min-h-[70px] bg-gray-50/50 focus:bg-white"
                  placeholder="مثلاً: این دانش در قالب روش اجرایی شماره ۲۲ پوشش داده شده است..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ مودال پر کردن گپ ═══════════════ */}
      {showFillModal && selectedGap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gradient-to-l from-sky-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-sky-100">
                  <CheckCircle size={18} className="text-sky-600" />
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
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedGap.description && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-gray-600 leading-relaxed flex gap-2">
                  <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedGap.description}</span>
                </div>
              )}

              <p className="text-sm text-gray-600">
                برای پر کردن این گپ، گره تولیدشده معادل را انتخاب کنید:
              </p>

              {/* 🟢 نوع تطابق: کامل یا جزئی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع تطابق</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFillStatusChoice('filled')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 text-xs font-medium ${
                      fillStatusChoice === 'filled'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <CheckCircle size={16} />
                    تطابق کامل
                    <span className="text-[10px] opacity-70">دانش به‌طور کامل پوشش داده شده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillStatusChoice('partially_filled')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 text-xs font-medium ${
                      fillStatusChoice === 'partially_filled'
                        ? 'border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-100'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <AlertCircle size={16} />
                    تطابق جزئی
                    <span className="text-[10px] opacity-70">بخشی از نیاز پوشش دارد و ادامه پژوهش لازم است</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">توضیح (اختیاری — در سوابق ثبت می‌شود)</label>
                <textarea
                  value={fillNote}
                  onChange={e => setFillNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 min-h-[60px] bg-gray-50/50 focus:bg-white"
                  placeholder="مثلاً: ۷۰٪ محتوا پوشش داده شده؛ بخش سنجش عملکرد هنوز نیاز به پژوهش دارد..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  انتخاب گره تولیدشده <span className="text-rose-500">*</span>
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
                  <div className="text-sm text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-200">
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
                    setFillNote('');
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
                >
                  انصراف
                </button>
                <button
                  disabled={!fillProducedNodeId}
                  onClick={() => {
                    if (fillProducedNodeId && selectedGap) {
                      handleFillGap(selectedGap.id, fillProducedNodeId, fillStatusChoice, fillNote || undefined);
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    fillProducedNodeId
                      ? 'bg-gradient-to-l from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg shadow-sky-200/60'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
