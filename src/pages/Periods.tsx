// src/pages/Periods.tsx
// صفحه مدیریت دوره‌های زمانی

import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Clock,
  CalendarDays,
  FolderOpen,
  Edit,
  Search,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  LayoutGrid,
  List
} from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
// @ts-ignore
import transition from 'react-element-popper/animations/transition';
import toast from 'react-hot-toast';

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: number;
  isComplete: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function Periods() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { fetchPeriods: fetchUIPeriods } = useUIStore();

  const fetchPeriods = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await(window.customFetch || window.fetch)('/api/periods');
      if (!res.ok) throw new Error('خطا در دریافت دوره‌ها');
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
      await fetchUIPeriods();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'خطا در دریافت دوره‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('لطفاً تمام فیلدها را پر کنید.');
      return;
    }

    setSaving(true);
    try {
      const url = editingPeriod ? `/api/periods/${editingPeriod.id}` : '/api/periods';
      const method = editingPeriod ? 'PUT' : 'POST';
      
      const payload = editingPeriod ? {
        ...formData,
        isActive: editingPeriod.isActive,
        isComplete: editingPeriod.isComplete
      } : formData;

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'خطا در ذخیره دوره');
      }

      await fetchPeriods();
      setShowModal(false);
      setEditingPeriod(null);
      setFormData({ name: '', startDate: '', endDate: '', description: '' });
      toast.success(editingPeriod ? 'دوره با موفقیت ویرایش شد' : 'دوره با موفقیت ایجاد شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این دوره اطمینان دارید؟')) return;

    try {
      const res = await(window.customFetch || window.fetch)(`/api/periods/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'خطا در حذف دوره');
      }
      await fetchPeriods();
      toast.success('دوره با موفقیت حذف شد');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (id: number, field: 'isActive' | 'isComplete', currentValue: number) => {
    try {
      const res = await(window.customFetch || window.fetch)(`/api/periods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: currentValue ? 0 : 1 })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'خطا در بروزرسانی دوره');
      }
      await fetchPeriods();
      toast.success(`وضعیت دوره با موفقیت تغییر یافت`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      description: period.description || '',
    });
    setShowModal(true);
  };

  const filteredPeriods = periods.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (period: Period) => {
    if (period.isComplete) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
          <Check size={12} />
          تکمیل شده
        </span>
      );
    }
    if (period.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
          <Clock size={12} />
          فعال
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <X size={12} />
        غیرفعال
      </span>
    );
  };

  const getStatusColor = (period: Period) => {
    if (period.isComplete) return 'border-green-200 bg-green-50';
    if (period.isActive) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  };

  const activeCount = periods.filter(p => p.isActive && !p.isComplete).length;
  const completedCount = periods.filter(p => p.isComplete).length;
  const totalCount = periods.length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
              <CalendarDays size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">مدیریت دوره‌های زمانی</h1>
              <p className="text-gray-500 text-sm mt-0.5">تعریف و مدیریت بازه‌های زمانی برای گزارش‌گیری و ثبت اطلاعات</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingPeriod(null);
            setFormData({ name: '', startDate: '', endDate: '', description: '' });
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-200/50"
        >
          <Plus size={18} />
          دوره جدید
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">کل دوره‌ها</p>
            <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">دوره‌های تکمیل شده</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">دوره‌های فعال</p>
            <p className="text-2xl font-bold text-amber-600">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در دوره‌ها..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="نمایش جدولی"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="نمایش کارتی"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={fetchPeriods}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="بروزرسانی"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {searchTerm && (
          <div className="text-xs text-gray-400 mt-2 mr-1">
            {filteredPeriods.length} نتیجه یافت شد
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200/80">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500 text-sm">در حال بارگذاری دوره‌ها...</p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200/80">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <p className="mt-4 text-red-600 text-sm font-medium">{error}</p>
          <button
            onClick={fetchPeriods}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            تلاش مجدد
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">عنوان دوره</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">تاریخ شروع</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">تاریخ پایان</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">توضیحات</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">وضعیت</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <FolderOpen size={40} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">هیچ دوره‌ای تعریف نشده است</p>
                      <p className="text-xs text-gray-400 mt-1">برای شروع، دکمه "دوره جدید" را بزنید</p>
                    </td>
                  </tr>
                ) : (
                  filteredPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-gray-800">{period.name}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm" dir="ltr">{period.startDate}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm" dir="ltr">{period.endDate}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm max-w-[150px] truncate">
                        {period.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(period)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(period)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => toggleStatus(period.id, 'isActive', period.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${period.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={period.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                          >
                            {period.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          </button>
                          <button
                            onClick={() => toggleStatus(period.id, 'isComplete', period.isComplete)}
                            className={`p-1.5 rounded-lg transition-colors ${period.isComplete ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={period.isComplete ? 'باز کردن دوره' : 'تکمیل دوره'}
                          >
                            {period.isComplete ? <Check size={16} /> : <Clock size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(period.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredPeriods.length > 0 && (
            <div className="p-3 border-t bg-gray-50/50 text-xs text-gray-400 flex justify-between">
              <span>تعداد: {filteredPeriods.length} دوره</span>
              <span>آخرین بروزرسانی: {new Date().toLocaleString('fa-IR')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeriods.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              <FolderOpen size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">هیچ دوره‌ای تعریف نشده است</p>
            </div>
          ) : (
            filteredPeriods.map((period) => (
              <div
                key={period.id}
                className={`bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md group ${getStatusColor(period)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">{period.name}</h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {period.startDate}
                      </span>
                      <span className="text-gray-300">→</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {period.endDate}
                      </span>
                    </div>
                    {period.description && (
                      <p className="text-xs text-gray-400 mt-1">{period.description}</p>
                    )}
                    <div className="mt-3">{getStatusBadge(period)}</div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(period)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(period.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal - Add/Edit Period */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {editingPeriod ? <Edit size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">
                    {editingPeriod ? 'ویرایش دوره' : 'دوره جدید'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingPeriod ? 'تغییر اطلاعات دوره' : 'تعریف یک دوره زمانی جدید'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPeriod(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  عنوان دوره <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نیمسال اول ۱۴۰۳"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  تاریخ شروع <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  animations={[transition()]}
                  inputClass="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm text-right font-sans"
                  containerClassName="w-full"
                  value={formData.startDate}
                  onChange={(date: any) => setFormData({...formData, startDate: date?.format('YYYY/MM/DD') || ''})}
                  placeholder="انتخاب تاریخ شروع"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  تاریخ پایان <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  animations={[transition()]}
                  inputClass="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm text-right font-sans"
                  containerClassName="w-full"
                  value={formData.endDate}
                  onChange={(date: any) => setFormData({...formData, endDate: date?.format('YYYY/MM/DD') || ''})}
                  placeholder="انتخاب تاریخ پایان"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  توضیحات (اختیاری)
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
                  placeholder="توضیحات تکمیلی..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPeriod(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingPeriod ? 'ذخیره تغییرات' : 'ایجاد دوره'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}