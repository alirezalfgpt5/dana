// src/pages/AuditLog.tsx
// صفحه نمایش لاگ‌های حسابرسی

import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, X, ChevronDown, ChevronUp,
  User, Calendar, Activity, FileText, Trash2, Edit, Plus,
  RefreshCw, AlertCircle, CheckCircle, Clock, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns-jalali';

interface AuditLogEntry {
  id: number;
  action: string;
  entityName: string;
  entityId: number;
  changes: string;
  timestamp: string;
  username: string | null;
  fullName: string | null;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await(window.customFetch || window.fetch)('/api/audit');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('خطا در دریافت لاگ‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/audit/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus size={14} className="text-emerald-500" />;
      case 'UPDATE': return <Edit size={14} className="text-blue-500" />;
      case 'DELETE': return <Trash2 size={14} className="text-rose-500" />;
      default: return <Activity size={14} className="text-gray-500" />;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'CREATE': return 'ایجاد';
      case 'UPDATE': return 'ویرایش';
      case 'DELETE': return 'حذف';
      default: return action;
    }
  };

  const getEntityIcon = (entityName: string) => {
    if (entityName.includes('درختواره')) return <FileText size={14} className="text-blue-500" />;
    if (entityName.includes('کاربر')) return <User size={14} className="text-purple-500" />;
    if (entityName.includes('دوره')) return <Calendar size={14} className="text-amber-500" />;
    return <Activity size={14} className="text-gray-500" />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'yyyy/MM/dd HH:mm:ss');
    } catch { return dateStr; }
  };

  const uniqueEntities = [...new Set(logs.map(log => log.entityName))];

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      log.fullName?.toLowerCase().includes(term) ||
      log.username?.toLowerCase().includes(term) ||
      log.entityName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.changes.toLowerCase().includes(term)
    );
  }).filter(log => filterAction === 'all' || log.action === filterAction)
    .filter(log => filterEntity === 'all' || log.entityName === filterEntity);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200/50">
              <History size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تاریخچه تغییرات سیستم</h1>
              <p className="text-gray-500 text-sm mt-0.5">ردگیری تمامی عملیات‌های انجام شده توسط کاربران</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} disabled={loading || logs.length === 0} className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileText size={16} /> خروجی PDF
          </button>
          <button onClick={fetchLogs} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-200/50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> بروزرسانی
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg"><Activity size={20} className="text-indigo-600" /></div>
          <div><p className="text-xs text-gray-400">کل عملیات‌ها</p><p className="text-2xl font-bold text-gray-800">{stats.total}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><Plus size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-gray-400">ایجاد</p><p className="text-2xl font-bold text-emerald-600">{stats.creates}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><Edit size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-400">ویرایش</p><p className="text-2xl font-bold text-blue-600">{stats.updates}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg"><Trash2 size={20} className="text-rose-600" /></div>
          <div><p className="text-xs text-gray-400">حذف</p><p className="text-2xl font-bold text-rose-600">{stats.deletes}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="جستجو..." className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-gray-50/50 focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
          </div>
          <select className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="all">همه عملیات‌ها</option>
            <option value="CREATE">➕ ایجاد</option>
            <option value="UPDATE">✏️ ویرایش</option>
            <option value="DELETE">🗑️ حذف</option>
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
            <option value="all">همه ماژول‌ها</option>
            {uniqueEntities.map(entity => <option key={entity} value={entity}>{entity}</option>)}
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterAction('all'); setFilterEntity('all'); setCurrentPage(1); }} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm flex items-center gap-2 whitespace-nowrap">
            <Filter size={16} /> پاک کردن فیلترها
          </button>
        </div>
        {searchTerm && <div className="text-xs text-gray-400 mt-2 mr-1">{filteredLogs.length} نتیجه یافت شد</div>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gradient-to-r from-gray-50 to-white border-b">
              <tr>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 text-center w-10">#</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 min-w-[160px]">تاریخ و زمان</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 min-w-[120px]">کاربر</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 text-center w-[100px]">عملیات</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 min-w-[150px]">ماژول / فرم</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 min-w-[200px]">جزئیات تغییرات</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-gray-600 text-center w-12">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><RefreshCw size={28} className="animate-spin mx-auto mb-3 text-gray-300" /><p className="text-sm">در حال دریافت اطلاعات...</p></td></tr>
              ) : paginatedLogs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><History size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-medium text-gray-500">تاریخچه‌ای یافت نشد</p></td></tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const isExpanded = expandedRows.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs font-medium">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap flex items-center gap-1.5"><Calendar size={12} className="text-gray-400 flex-shrink-0" />{formatDate(log.timestamp)}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{(log.fullName || log.username || 'س')?.charAt(0)}</div><span className="font-medium text-gray-800 text-sm">{log.fullName || log.username || 'سیستم'}</span></div></td>
                        <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>{getActionIcon(log.action)}{getActionName(log.action)}</span></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5">{getEntityIcon(log.entityName)}<span className="text-gray-700 text-sm">{log.entityName}</span><span className="text-gray-400 text-[10px]">(ID: {log.entityId})</span></div></td>
                        <td className="px-4 py-3"><div className="max-w-xs truncate text-gray-500 text-xs font-mono bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{log.changes || '-'}</div></td>
                        <td className="px-4 py-3 text-center"><button onClick={() => toggleRow(log.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-indigo-50/30">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700"><FileText size={14} />جزئیات کامل تغییرات</div>
                              <div className="bg-white p-3 rounded-lg border border-indigo-200 text-sm text-gray-700 font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto">{log.changes || 'هیچ جزئیاتی ثبت نشده است'}</div>
                              <div className="flex items-center gap-4 text-xs text-gray-400"><span>شناسه: {log.id}</span><span className="w-px h-3 bg-gray-300"></span><span>موجودیت: {log.entityName}</span><span className="w-px h-3 bg-gray-300"></span><span>شناسه موجودیت: {log.entityId}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredLogs.length > 0 && (
          <div className="p-4 border-t bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400 flex items-center gap-4"><span>تعداد: {filteredLogs.length} رکورد</span><span className="w-px h-4 bg-gray-300"></span><span>صفحه {currentPage} از {totalPages || 1}</span></div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="صفحه اول"><ChevronDown size={16} className="rotate-90" /></button>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="صفحه قبل"><ChevronDown size={16} className="rotate-180" /></button>
              <span className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg">{currentPage}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="صفحه بعد"><ChevronDown size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="صفحه آخر"><ChevronDown size={16} className="-rotate-90" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}