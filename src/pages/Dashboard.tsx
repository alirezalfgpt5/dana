// src/pages/Dashboard.tsx
// داشبورد مدیریت دانش با طراحی مدرن و داده‌های داینامیک

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
      await Promise.all([
        fetchTrees({ isActive: 1 }),
        fetchGaps({ page: 1, limit: 100 }),
        fetchIssues({ page: 1, limit: 100 }),
       (window.customFetch || window.fetch)('/api/reports/org-stats').then(res => res.json()).then(data => setOrgStats(Array.isArray(data) ? data : [])).catch(console.error),
       (window.customFetch || window.fetch)('/api/audit').then(res => {
          if (!res.ok) return [];
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
          return res.text().then(() => []); // Ignore HTML
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
  }, []);

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

  const handleExport = () => {
    const csvContent = [
      ['Title', 'Value'],
      ['Total Trees', stats.trees],
      ['Required Trees', stats.required],
      ['Produced Trees', stats.produced],
      ['Research Trees', stats.research],
      ['Total Gaps', stats.gaps],
      ['Open Gaps', stats.openGaps],
      ['Filled Gaps', stats.filledGaps],
      ['Total Issues', stats.issues],
      ['Completed Issues', stats.completedIssues],
      ['In Progress Issues', stats.inProgressIssues],
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'dashboard_stats.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('گزارش آماری دریافت شد');
  };

  const issueProgress = stats.issues > 0 ? Math.round((stats.completedIssues / stats.issues) * 100) : 0;
  const gapProgress = stats.gaps > 0 ? Math.round((stats.filledGaps / stats.gaps) * 100) : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-l from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200/60">
            <LayoutDashboard size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-l from-gray-800 to-gray-600 bg-clip-text text-transparent">داشبورد مدیریت دانش</h2>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
              <span>{user?.fullName || 'کاربر'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>{activePeriod ? `دوره فعال: ${activePeriod.name}` : 'همه دوره‌ها'}</span>
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <Clock size={14} />
            بروزرسانی: {format(lastUpdated, 'HH:mm')}
          </span>
          <button 
            onClick={handleExport}
            className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 rounded-xl transition-colors border border-green-100 flex items-center gap-2 text-sm"
            title="دانلود گزارش CSV"
          >
            <Download size={18} />
            <span className="hidden sm:inline">خروجی CSV</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-colors border border-blue-100"
            disabled={loading}
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
          color="blue" 
          onClick={() => navigate('/trees/required')} 
        />
        <ShortcutCard 
          title="تحلیل شکاف" 
          subtitle="مقایسه و یافتن گپ‌ها" 
          icon={<Target size={20} />} 
          color="red" 
          onClick={() => navigate('/gaps')} 
        />
        <ShortcutCard 
          title="ثبت مسئله" 
          subtitle="ایجاد و پیگیری مسئله" 
          icon={<FileText size={20} />} 
          color="purple" 
          onClick={() => navigate('/issues')} 
        />
        <ShortcutCard 
          title="گزارش‌گیری" 
          subtitle="استخراج اکسل و گراف" 
          icon={<TrendingUp size={20} />} 
          color="green" 
          onClick={() => navigate('/outputs')} 
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="کل درختواره‌ها" value={stats.trees} subtitle={`${stats.required} مورد نیاز • ${stats.produced} تولید شده`} icon={<GitBranch size={24} />} color="indigo" />
        <MetricCard title="گپ‌های دانشی" value={stats.gaps} subtitle={`${stats.openGaps} شکاف باز نیازمند اقدام`} icon={<Target size={24} />} color="rose" />
        <MetricCard title="مسائل در جریان" value={stats.issues} subtitle={`${stats.completedIssues} مسئله با موفقیت حل شده`} icon={<FileText size={24} />} color="amber" />
        <MetricCard title="پروژه‌های پژوهشی" value={stats.research} subtitle="استخراج شده از شکاف‌ها" icon={<Activity size={24} />} color="emerald" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress & Active Issues */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">پیشرفت حل مسائل</h3>
                <span className="text-xl font-black text-amber-500">{issueProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${issueProgress}%` }} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500">مسائل باز</span>
                  <span className="font-bold text-gray-700">{stats.issues - stats.completedIssues}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500">حل شده</span>
                  <span className="font-bold text-green-600">{stats.completedIssues}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">پوشش شکاف‌های دانشی</h3>
                <span className="text-xl font-black text-rose-500">{gapProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${gapProgress}%` }} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500">گپ‌های باز</span>
                  <span className="font-bold text-rose-600">{stats.openGaps}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500">پوشش داده شده</span>
                  <span className="font-bold text-green-600">{stats.filledGaps}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Issues Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                مسائل فعال اخیر
              </h3>
              <button onClick={() => navigate('/issues')} className="text-xs text-blue-600 font-medium flex items-center hover:text-blue-700 transition-colors">
                مشاهده همه <ChevronLeft size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {issues.filter(i => i.status === 'in_progress' || i.status === 'pending').slice(0, 5).map(issue => (
                <div key={issue.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${issue.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                      {issue.status === 'in_progress' ? <RefreshCw size={14} /> : <Clock size={14} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">{issue.title || 'بدون عنوان'}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Target size={10} /> {issue.domain || 'حوزه نامشخص'}
                        </span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <TrendingUp size={10} /> اولویت: {issue.actionPriority || 'متوسط'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-700">{issue.completionPercent || 0}%</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${issue.completionPercent || 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">هیچ مسئله‌ای در حال اجرا نیست</div>
              )}
            </div>
          
          {/* Org Stats (Aggregated) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                آمار یکپارچه سازمانی (نیروها)
              </h3>
            </div>
            <div className="p-5">
              {orgStats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {orgStats.map(stat => (
                    <div key={stat.baseId} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">{stat.baseName}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">درختواره‌ها</span>
                          <span className="font-semibold text-gray-700">{stat.treesCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">شکاف‌ها</span>
                          <span className="font-semibold text-rose-600">{stat.gapsCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">مسائل</span>
                          <span className="font-semibold text-amber-600">{stat.issuesCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500 text-sm">آماری یافت نشد</div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Side Column: Gaps & Activity */}
        <div className="space-y-6">
          
          {/* Recent Gaps */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Target size={18} className="text-rose-500" />
                جدیدترین شکاف‌ها
              </h3>
            </div>
            <div className="p-3">
              {gaps.filter(g => g.status === 'open').slice(0, 5).map(gap => (
                <div key={gap.id} className="p-3 mb-2 bg-rose-50/50 rounded-xl border border-rose-100 flex items-start gap-3 transition-colors hover:bg-rose-50">
                  <div className="p-1.5 bg-white rounded-lg border border-rose-100 text-rose-500 mt-0.5">
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 leading-relaxed">{gap.requiredNode?.title || 'نامشخص'}</h4>
                    <p className="text-[10px] text-gray-500 mt-1">اولویت: {gap.priority || 'متوسط'}</p>
                  </div>
                </div>
              ))}
              {gaps.filter(g => g.status === 'open').length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">همه شکاف‌ها پوشش داده شده‌اند 🎉</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-blue-500" />
                آخرین فعالیت‌ها
              </h3>
            </div>
            <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide">
              {activities.map((act, idx) => (
                <div key={idx} className="flex gap-3 relative">
                  {idx !== activities.length - 1 && <div className="absolute top-6 right-2 bottom-[-16px] w-px bg-gray-100"></div>}
                  <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 border-2 border-white shadow-sm z-10 ${
                    act.action === 'CREATE' ? 'bg-green-400' :
                    act.action === 'UPDATE' ? 'bg-blue-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">
                      {act.entityName} <span className="text-gray-400 font-normal">توسط {act.fullName || 'سیستم'}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {act.action === 'CREATE' ? 'ایجاد شد' : act.action === 'UPDATE' ? 'بروزرسانی شد' : 'حذف شد'} • {new Date(act.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">بدون فعالیت</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function ShortcutCard({ title, subtitle, icon, color, onClick }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:border-blue-600 hover:text-white',
    red: 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:border-rose-600 hover:text-white',
    purple: 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white',
  };

  return (
    <button 
      onClick={onClick}
      className={`group flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 text-right ${colors[color]}`}
    >
      <div className="p-2.5 bg-white/70 rounded-xl backdrop-blur-sm shadow-sm group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{subtitle}</p>
      </div>
      <ChevronLeft size={14} className="opacity-0 group-hover:opacity-70 transition-opacity mr-auto" />
    </button>
  );
}

function MetricCard({ title, value, subtitle, icon, color }: any) {
  const config: Record<string, { iconCls: string; glow: string; ring: string }> = {
    indigo: { iconCls: 'bg-indigo-100 text-indigo-600', glow: 'shadow-indigo-100', ring: 'border-indigo-100' },
    rose: { iconCls: 'bg-rose-100 text-rose-600', glow: 'shadow-rose-100', ring: 'border-rose-100' },
    amber: { iconCls: 'bg-amber-100 text-amber-600', glow: 'shadow-amber-100', ring: 'border-amber-100' },
    emerald: { iconCls: 'bg-emerald-100 text-emerald-600', glow: 'shadow-emerald-100', ring: 'border-emerald-100' },
  };
  const c = config[color] || config.indigo;

  return (
    <div className={`stat-card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between card-elevated`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl shadow-sm ${c.iconCls}`}>
          {icon}
        </div>
        {/* خط تزئینی */}
        <div className={`w-10 h-1 rounded-full ${c.iconCls.split(' ')[0]} opacity-40`} />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-black text-gray-800 stat-value-animated">{value}</h3>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50">
        <p className="text-[10px] text-gray-400 font-medium truncate">{subtitle}</p>
      </div>
    </div>
  );
}

export default Dashboard;