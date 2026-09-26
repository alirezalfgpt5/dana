// src/pages/Dashboard.tsx
// داشبورد مدیریت دانش — با پشتیبانی کامل از سیستم تم

import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { useTree } from '../hooks/useTree';
import { useGapAnalysis } from '../hooks/useGapAnalysis';
import { useIssues } from '../hooks/useIssues';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GitBranch, 
  Target, 
  FileText, 
  TrendingUp, 
  Activity,
  Clock, 
  RefreshCw,
  ChevronLeft,
  AlertCircle,
  Download
} from 'lucide-react';
import { format } from 'date-fns-jalali';
import toast from 'react-hot-toast';

export function Dashboard() {
  const { user } = useAuthStore();
  const { activePeriod } = useUIStore();
  const navigate = useNavigate();

  const { trees, fetchTrees } = useTree();
  const { gaps, fetchGaps, getGapStats } = useGapAnalysis();
  const { issues, fetchIssues, getIssueStats } = useIssues();

  const [activities, setActivities] = useState<any[]>([]);
  const [orgStats, setOrgStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const pId = activePeriod?.id ? Number(activePeriod.id) : undefined;
      await Promise.all([
        fetchTrees({ isActive: 1, ...(pId ? { periodId: pId } : {}) }),
        fetchGaps({ page: 1, limit: 100, ...(pId ? { periodId: pId } : {}) }),
        fetchIssues({ page: 1, limit: 100, ...(pId ? { periodId: pId } : {}) }),
       (window.customFetch || window.fetch)(`/api/reports/org-stats${pId ? `?periodId=${pId}` : ''}`).then(res => res.json()).then(data => setOrgStats(Array.isArray(data) ? data : [])).catch(console.error),
       (window.customFetch || window.fetch)('/api/audit').then(res => {
          if (!res.ok) return [];
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
          return res.text().then(() => []);
        }).then(data => setActivities(Array.isArray(data) ? data.slice(0, 8) : []))
      ]);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePeriod?.id]);

  const handleRefresh = () => {
    loadData();
    toast.success('داشبورد بروزرسانی شد');
  };

  // Stats calculation
  const gapStats = getGapStats(gaps);
  const issueStats = getIssueStats(issues);

  const stats = {
    trees: trees.length,
    required: trees.filter(t => t.type === 'required').length,
    produced: trees.filter(t => t.type === 'produced').length,
    research: trees.filter(t => t.type === 'research').length,
    gaps: gapStats.total,
    openGaps: gapStats.open,
    filledGaps: gapStats.filled,
    issues: issueStats.total,
    completedIssues: issueStats.completed,
    inProgressIssues: issueStats.inProgress,
  };

  const issueProgress = stats.issues > 0 ? Math.round((stats.completedIssues / stats.issues) * 100) : 0;
  const gapProgress = stats.gaps > 0 ? Math.round((stats.filledGaps / stats.gaps) * 100) : 0;

  const handleExport = () => {
    const esc = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const row = (...cells: any[]) => cells.map(esc).join(',');

    const nowStr = format(new Date(), 'yyyy/MM/dd HH:mm');
    const periodName = activePeriod ? activePeriod.name : 'همه دوره‌ها';
    const userName = user?.fullName || 'کاربر سیستم';
    const orgLevel = user?.organizationLevel || 'سازمان';

    const lines: string[] = [];

    // بخش ۱: سربرگ و اطلاعات گزارش
    lines.push(row('گزارش جامع آماری و مدیریتی داشبورد سامانه دانا'));
    lines.push(row('تاریخ و زمان گزارش', nowStr));
    lines.push(row('کاربر گزارش‌گیرنده', userName));
    lines.push(row('رده سازمانی', orgLevel));
    lines.push(row('دوره زمانی فعال', periodName));
    lines.push(row(''));

    // بخش ۲: خلاصه شاخص‌های کلیدی (KPIs)
    lines.push(row('=== خلاصه شاخص‌های کلیدی عملکرد (KPIs) ==='));
    lines.push(row('عنوان شاخص', 'مقدار', 'توضیحات / درصد'));
    lines.push(row('کل درختان دانش', stats.trees, 'مجموع درختان فعال در سیستم'));
    lines.push(row('درختان دانش مورد نیاز', stats.required, `${stats.trees > 0 ? Math.round((stats.required / stats.trees) * 100) : 0}% از کل درختان`));
    lines.push(row('درختان دانش موجود (تولید شده)', stats.produced, `${stats.trees > 0 ? Math.round((stats.produced / stats.trees) * 100) : 0}% از کل درختان`));
    lines.push(row('درختان پژوهشی', stats.research, `${stats.trees > 0 ? Math.round((stats.research / stats.trees) * 100) : 0}% از کل درختان`));
    lines.push(row('کل شکاف‌های شناسایی‌شده', stats.gaps, 'شکاف‌های دانشی حاصل از تحلیل'));
    lines.push(row('شکاف‌های باز (تکمیل‌نشده)', stats.openGaps, `${stats.gaps > 0 ? Math.round((stats.openGaps / stats.gaps) * 100) : 0}% از شکاف‌ها`));
    lines.push(row('شکاف‌های پوشش‌داده‌شده', stats.filledGaps, `${gapProgress}% نرخ پوشش شکاف‌ها`));
    lines.push(row('کل مسائل در نظام مسائل', stats.issues, 'تعداد کل پروژه‌ها و مسائل ثبت شده'));
    lines.push(row('مسائل تکمیل‌شده', stats.completedIssues, `${issueProgress}% نرخ تحقق مسائل`));
    lines.push(row('مسائل در حال اجرا', stats.inProgressIssues, `${stats.issues > 0 ? Math.round((stats.inProgressIssues / stats.issues) * 100) : 0}% از مسائل`));
    lines.push(row('میانگین پیشرفت مسائل', `${issueStats.avgCompletion || 0}%`, 'میانگین درصد پیشرفت وزنی کلیه مسائل'));
    lines.push(row('مجموع بودجه مورد نیاز مسائل', `${(issueStats.totalBudget || 0).toLocaleString('fa-IR')} ریال`, 'برآورد مالی کل مسائل'));
    lines.push(row(''));

    // بخش ۳: فهرست تفصیلی مسائل در داشبورد
    lines.push(row('=== فهرست تفصیلی مسائل در نظام مسائل ==='));
    lines.push(row('شناسه', 'عنوان مسئله', 'حوزه دانشی', 'اولویت اقدام', 'وضعیت', 'درصد پیشرفت', 'بودجه مورد نیاز (ریال)', 'زمان به ماه', 'واحد مسئول', 'سند مرجع'));
    if (issues && issues.length > 0) {
      issues.forEach(i => {
        const statusLabel = 
          i.status === 'completed' ? 'تکمیل شده' :
          i.status === 'in_progress' ? 'در حال اجرا' :
          i.status === 'pending' ? 'در انتظار' :
          i.status === 'on_hold' ? 'متوقف' :
          i.status === 'canceled' ? 'لغو شده' : (i.status || 'نامشخص');
        
        lines.push(row(
          i.id,
          i.title || '',
          (i as any).domain || (i as any).domainNode?.title || 'نامشخص',
          i.actionPriority || 'متوسط',
          statusLabel,
          `${i.completionPercent || 0}%`,
          (i.requiredBudget || 0).toLocaleString('fa-IR'),
          i.expectedMonths || 0,
          i.responsibleUnit || '-',
          i.referenceDocument || '-'
        ));
      });
    } else {
      lines.push(row('هیچ مسئله‌ای یافت نشد'));
    }
    lines.push(row(''));

    // بخش ۴: فهرست تحلیل شکاف‌های دانشی
    lines.push(row('=== فهرست شکاف‌های دانشی شناسایی‌شده ==='));
    lines.push(row('شناسه', 'عنوان دانش مورد نیاز', 'عنوان دانش موجود متناظر', 'سطح اولویت/بحرانیت', 'وضعیت شکاف', 'درصد تطبیق'));
    if (gaps && gaps.length > 0) {
      gaps.forEach(g => {
        const gapStatusLabel = g.status === 'filled' ? 'پوشش‌داده‌شده' : 'باز (پوشش‌نیافته)';
        const priorityLabel = 
          g.priority === 'critical' ? 'بحرانی' :
          g.priority === 'high' ? 'بالا' :
          g.priority === 'medium' ? 'متوسط' : 'کم';

        lines.push(row(
          g.id,
          g.requiredNode?.title || 'گره دانشی',
          g.producedNode?.title || 'بدون پوشش',
          priorityLabel,
          gapStatusLabel,
          g.matchScore ? `${Math.round(g.matchScore * 100)}%` : '-'
        ));
      });
    } else {
      lines.push(row('هیچ شکافی یافت نشد'));
    }
    lines.push(row(''));

    // بخش ۵: ساختار درختان دانش
    lines.push(row('=== درختان دانش فعال سامانه ==='));
    lines.push(row('شناسه', 'عنوان درخت دانش', 'نوع درخت', 'رده / پایگاه سازمانی', 'وضعیت'));
    if (trees && trees.length > 0) {
      trees.forEach(t => {
        const typeLabel = 
          t.type === 'required' ? 'دانش مورد نیاز' :
          t.type === 'produced' ? 'دانش موجود (تولید شده)' :
          t.type === 'research' ? 'دانش و پژوهش' : t.type;
        lines.push(row(
          t.id,
          t.name || '',
          typeLabel,
          (t as any).base?.name || (t as any).organizationLevel || '-',
          t.isActive ? 'فعال' : 'غیرفعال'
        ));
      });
    } else {
      lines.push(row('هیچ درختی یافت نشد'));
    }

    const csvContent = lines.join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateFileStr = format(new Date(), 'yyyyMMdd_HHmm');
    link.setAttribute('download', `dana_dashboard_report_${dateFileStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('گزارش جامع داشبورد دریافت شد');
  };

  const issueProgress = stats.issues > 0 ? Math.round((stats.completedIssues / stats.issues) * 100) : 0;
  const gapProgress = stats.gaps > 0 ? Math.round((stats.filledGaps / stats.gaps) * 100) : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header — هدر برند */}
      <div className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 theme-card p-6 rounded-2xl">
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none" 
          style={{ background: 'var(--brand-gradient)' }} 
        />
        <div className="relative flex items-center gap-4">
          <div className="p-3 brand-gradient rounded-2xl shadow-lg">
            <LayoutDashboard size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-strong">داشبورد</h2>
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>{user?.fullName || 'کاربر'}</span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-faint)' }} />
              <span>{activePeriod ? `دوره فعال: ${activePeriod.name}` : 'همه دوره‌ها'}</span>
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-3">
          <span 
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{ color: 'var(--text-faint)', backgroundColor: 'var(--surface-soft)', borderColor: 'var(--border-soft)' }}
          >
            <Clock size={14} />
            بروزرسانی: {format(lastUpdated, 'HH:mm')}
          </span>
          <button 
            onClick={handleExport}
            className="p-2.5 rounded-xl transition-colors border flex items-center gap-2 text-sm"
            style={{ color: '#059669', backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }}
            title="دانلود گزارش CSV"
          >
            <Download size={18} />
            <span className="hidden sm:inline">خروجی CSV</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="btn-ghost p-2.5"
            disabled={loading}
            title="بروزرسانی"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Actions (Shortcuts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ShortcutCard 
          title="درختواره جدید" 
          subtitle="ایجاد درختواره دانشی" 
          icon={<GitBranch size={20} />} 
          onClick={() => navigate('/trees/required')} 
        />
        <ShortcutCard 
          title="تحلیل شکاف" 
          subtitle="مقایسه و یافتن گپ‌ها" 
          icon={<Target size={20} />} 
          onClick={() => navigate('/gaps')} 
        />
        <ShortcutCard 
          title="ثبت مسئله" 
          subtitle="ایجاد و پیگیری مسئله" 
          icon={<FileText size={20} />} 
          onClick={() => navigate('/issues')} 
        />
        <ShortcutCard 
          title="گزارش‌گیری" 
          subtitle="استخراج اکسل و گراف" 
          icon={<TrendingUp size={20} />} 
          onClick={() => navigate('/outputs')} 
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="کل درختواره‌ها" value={stats.trees} subtitle={`${stats.required} مورد نیاز • ${stats.produced} تولید شده`} icon={<GitBranch size={24} />} />
        <MetricCard title="گپ‌های دانشی" value={stats.gaps} subtitle={`${stats.openGaps} شکاف باز نیازمند اقدام`} icon={<Target size={24} />} tone="#e11d48" />
        <MetricCard title="مسائل در جریان" value={stats.issues} subtitle={`${stats.completedIssues} مسئله با موفقیت حل شده`} icon={<FileText size={24} />} tone="#d97706" />
        <MetricCard title="پروژه‌های پژوهشی" value={stats.research} subtitle="استخراج شده از شکاف‌ها" icon={<Activity size={24} />} tone="#059669" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress & Active Issues */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="theme-card p-5 hover:shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-strong">پیشرفت حل مسائل</h3>
                <span className="text-xl font-black stat-value-animated" style={{ color: '#d97706' }}>{issueProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--border-soft)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${issueProgress}%`, backgroundColor: '#d97706' }} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-soft)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>مسائل باز</span>
                  <span className="font-bold text-strong">{stats.issues - stats.completedIssues}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-soft)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>حل شده</span>
                  <span className="font-bold text-green-600">{stats.completedIssues}</span>
                </div>
              </div>
            </div>

            <div className="theme-card p-5 hover:shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-strong">پوشش شکاف‌های دانشی</h3>
                <span className="text-xl font-black stat-value-animated" style={{ color: '#e11d48' }}>{gapProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--border-soft)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${gapProgress}%`, backgroundColor: '#e11d48' }} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-soft)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>گپ‌های باز</span>
                  <span className="font-bold" style={{ color: '#e11d48' }}>{stats.openGaps}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-soft)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>پوشش داده شده</span>
                  <span className="font-bold text-green-600">{stats.filledGaps}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Issues Table */}
          <div className="theme-card overflow-hidden">
            <div className="p-5 border-b divider-soft flex justify-between items-center" style={{ backgroundColor: 'var(--surface-soft)' }}>
              <h3 className="font-bold text-strong flex items-center gap-2">
                <FileText size={18} style={{ color: '#d97706' }} />
                مسائل فعال اخیر
              </h3>
              <button onClick={() => navigate('/issues')} className="text-xs font-medium flex items-center transition-colors" style={{ color: 'var(--brand-600)' }}>
                مشاهده همه <ChevronLeft size={14} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {issues.filter(i => i.status === 'in_progress' || i.status === 'pending').slice(0, 5).map(issue => (
                <div key={issue.id} className="p-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-lg mt-0.5"
                      style={issue.status === 'in_progress' 
                        ? { backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)' } 
                        : { backgroundColor: '#fef3c7', color: '#d97706' }}
                    >
                      {issue.status === 'in_progress' ? <RefreshCw size={14} /> : <Clock size={14} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-strong line-clamp-1">{issue.title || 'بدون عنوان'}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Target size={10} /> {issue.domain || 'حوزه نامشخص'}
                        </span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <TrendingUp size={10} /> اولویت: {issue.actionPriority || 'متوسط'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <span className="text-xs font-bold text-strong">{issue.completionPercent || 0}%</span>
                    <div className="w-16 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: 'var(--border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${issue.completionPercent || 0}%`, backgroundColor: 'var(--brand-500)' }} />
                    </div>
                  </div>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>هیچ مسئله‌ای در حال اجرا نیست</div>
              )}
            </div>
          
          {/* Org Stats (Aggregated) */}
          <div className="theme-card overflow-hidden">
            <div className="p-5 border-b divider-soft flex justify-between items-center" style={{ backgroundColor: 'var(--surface-soft)' }}>
              <h3 className="font-bold text-strong flex items-center gap-2">
                <Activity size={18} style={{ color: 'var(--brand-600)' }} />
                آمار یکپارچه سازمانی (نیروها)
              </h3>
            </div>
            <div className="p-5">
              {orgStats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {orgStats.map(stat => (
                    <div key={stat.baseId} className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-soft)', borderColor: 'var(--border-soft)' }}>
                      <h4 className="font-bold text-strong mb-3 pb-2 border-b divider-main">{stat.baseName}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span style={{ color: 'var(--text-muted)' }}>درختواره‌ها</span>
                          <span className="font-semibold text-strong">{stat.treesCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span style={{ color: 'var(--text-muted)' }}>شکاف‌ها</span>
                          <span className="font-semibold" style={{ color: '#e11d48' }}>{stat.gapsCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span style={{ color: 'var(--text-muted)' }}>مسائل</span>
                          <span className="font-semibold" style={{ color: '#d97706' }}>{stat.issuesCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-sm" style={{ color: 'var(--text-muted)' }}>آماری یافت نشد</div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Side Column: Gaps & Activity */}
        <div className="space-y-6">
          
          {/* Recent Gaps */}
          <div className="theme-card overflow-hidden">
            <div className="p-5 border-b divider-soft flex justify-between items-center" style={{ backgroundColor: 'var(--surface-soft)' }}>
              <h3 className="font-bold text-strong flex items-center gap-2">
                <Target size={18} style={{ color: '#e11d48' }} />
                جدیدترین شکاف‌ها
              </h3>
            </div>
            <div className="p-3">
              {gaps.filter(g => g.status === 'open').slice(0, 5).map(gap => (
                <div 
                  key={gap.id} 
                  className="p-3 mb-2 rounded-xl border flex items-start gap-3 transition-colors"
                  style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}
                >
                  <div className="p-1.5 rounded-lg border text-rose-500 mt-0.5" style={{ backgroundColor: 'var(--surface-main)', borderColor: '#fecdd3' }}>
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-strong leading-relaxed">{gap.requiredNode?.title || 'نامشخص'}</h4>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>اولویت: {gap.priority || 'متوسط'}</p>
                  </div>
                </div>
              ))}
              {gaps.filter(g => g.status === 'open').length === 0 && (
                <div className="p-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>همه شکاف‌ها پوشش داده شده‌اند 🎉</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="theme-card overflow-hidden">
            <div className="p-5 border-b divider-soft flex justify-between items-center" style={{ backgroundColor: 'var(--surface-soft)' }}>
              <h3 className="font-bold text-strong flex items-center gap-2">
                <Activity size={18} style={{ color: 'var(--brand-600)' }} />
                آخرین فعالیت‌ها
              </h3>
            </div>
            <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide">
              {activities.map((act, idx) => (
                <div key={idx} className="flex gap-3 relative">
                  {idx !== activities.length - 1 && <div className="absolute top-6 right-2 bottom-[-16px] w-px" style={{ backgroundColor: 'var(--border-soft)' }} />}
                  <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 border-2 shadow-sm z-10 ${
                    act.action === 'CREATE' ? 'bg-green-400' :
                    act.action === 'UPDATE' ? 'bg-blue-400' : 'bg-red-400'
                  }`} style={{ borderColor: 'var(--surface-main)' }} />
                  <div>
                    <p className="text-xs font-medium leading-relaxed text-strong">
                      {act.entityName} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>توسط {act.fullName || 'سیستم'}</span>
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                      {act.action === 'CREATE' ? 'ایجاد شد' : act.action === 'UPDATE' ? 'بروزرسانی شد' : 'حذف شد'} • {new Date(act.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center text-sm py-4" style={{ color: 'var(--text-faint)' }}>بدون فعالیت</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Components — مبتنی بر تم
// ============================================

function ShortcutCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="group relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border text-right transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 theme-card"
    >
      {/* افکت گرادیانی هنگام هاور */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'var(--brand-gradient)' }}
      />
      <div 
        className="relative p-2.5 rounded-xl shadow-sm transition-all duration-300 group-hover:bg-white/25 group-hover:scale-110 group-hover:text-white"
        style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)' }}
      >
        {icon}
      </div>
      <div className="relative">
        <h3 className="font-bold text-sm text-strong group-hover:text-white transition-colors">{title}</h3>
        <p className="text-[10px] mt-0.5 line-clamp-1 group-hover:text-white/80 transition-colors" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      <ChevronLeft size={14} className="opacity-0 group-hover:opacity-80 group-hover:text-white transition-all mr-auto" />
    </button>
  );
}

function MetricCard({ title, value, subtitle, icon, tone }: { title: string; value: number; subtitle: string; icon: React.ReactNode; tone?: string }) {
  const t = tone || 'var(--brand-600)';
  return (
    <div className="stat-card theme-card p-5 rounded-2xl flex flex-col justify-between card-elevated">
      <div className="flex justify-between items-start mb-4">
        <div 
          className="p-3 rounded-xl shadow-sm stat-icon transition-transform"
          style={{ backgroundColor: 'var(--brand-50)', color: t }}
        >
          {icon}
        </div>
        {/* خط تزئینی برند */}
        <div className="w-10 h-1 rounded-full opacity-40" style={{ backgroundColor: t }} />
      </div>
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <h3 className="text-2xl font-black text-strong stat-value-animated">{value}</h3>
      </div>
      <div className="mt-3 pt-3 border-t divider-soft">
        <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default Dashboard;
