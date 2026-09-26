// src/components/issues/IssueFilters.tsx
// نوار فیلتر پیشرفته برای نظام مسائل - با جستجو و دراپ‌دان

import React, { useState } from 'react';
import { Search, X, Filter, Calendar } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import RawDatePicker from 'react-multi-date-picker';
import rawPersian from 'react-date-object/calendars/persian';
import rawPersianFa from 'react-date-object/locales/persian_fa';
import rawTransition from 'react-element-popper/animations/transition';

const resolveComponent = (comp: any) => {
  if (!comp) return null;
  if (comp.$$typeof || typeof comp === 'function') return comp;
  if (comp.default?.$$typeof || typeof comp.default === 'function') return comp.default;
  if (comp.default?.default?.$$typeof || typeof comp.default?.default === 'function') return comp.default.default;
  return comp.default || comp;
};

const DatePicker: any = resolveComponent(RawDatePicker);
const persian: any = (rawPersian as any)?.default || rawPersian;
const persian_fa: any = (rawPersianFa as any)?.default || rawPersianFa;
const transition: any = () => {
  try {
    const fn = (rawTransition as any)?.default || rawTransition;
    if (typeof fn === 'function') return fn();
  } catch {}
  return undefined;
};

interface IssueFiltersProps {
  filters: {
    domain?: string;
    status?: string;
    priority?: string;
    projectLevel?: string;
    knowledgeType?: string;
    category?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  onSearch: (term: string) => void;
  domains?: string[];
  statuses?: string[];
  priorities?: string[];
  projectLevels?: string[];
  knowledgeTypes?: string[];
  categories?: string[];
  loading?: boolean;
}

export function IssueFilters({
  filters,
  onFilterChange,
  onClearFilters,
  onSearch,
  domains = [],
  statuses = ['pending', 'in_progress', 'completed', 'canceled', 'on_hold'],
  priorities = ['خیلی زیاد', 'زیاد', 'متوسط'],
  projectLevels = ['راهبردی', 'سطح1', 'سطح2', 'سطح3', 'سطح4'],
  knowledgeTypes = ['نظریه', 'الگو', 'راهبرد', 'راه‌کار و توصیه', 'دانش نوظهور'],
  categories = [
    'عمومی',
    'فنی و مهندسی',
    'مدیریتی و سازمانی',
    'فرهنگی و اجتماعی',
    'علمی و پژوهشی',
    'اقتصادی و مالی',
    'حقوقی و تقنینی',
    'زیرساختی و لجستیک'
  ],
  loading = false,
}: IssueFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // گزینه‌های وضعیت با برچسب فارسی
  const statusOptions = statuses.map(s => ({
    value: s,
    label: s === 'pending' ? 'در انتظار' :
           s === 'in_progress' ? 'در حال اجرا' :
           s === 'completed' ? 'تکمیل شده' :
           s === 'canceled' ? 'لغو شده' :
           s === 'on_hold' ? 'متوقف' : s,
  }));

  const priorityOptions = priorities.map(p => ({ value: p, label: p }));
  const projectLevelOptions = projectLevels.map(p => ({ value: p, label: p }));
  const knowledgeTypeOptions = knowledgeTypes.map(k => ({ value: k, label: k }));
  const domainOptions = domains.map(d => ({ value: d, label: d }));
  const categoryOptions = categories.map(c => ({ value: c, label: c }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  // تعداد فیلترهای فعال
  const activeFiltersCount = Object.keys(filters).filter(
    key => filters[key as keyof typeof filters] && key !== 'search'
  ).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 transition-all">
      {/* ردیف اصلی: جستجو + دکمه‌ها */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* جستجو */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="جستجو در عنوان، حوزه، توضیحات..."
            className="w-full pr-10 pl-10 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50/50 focus:bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="absolute left-10 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            جستجو
          </button>
        </form>

        {/* دکمه‌ها */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              isExpanded || activeFiltersCount > 0
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Filter size={16} />
            فیلترها
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1"
            >
              <X size={14} />
              پاک کردن
            </button>
          )}

          {loading && (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* فیلترهای پیشرفته (قابل باز/بسته شدن) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* حوزه */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                حوزه
              </label>
              <SearchableSelect
                options={domainOptions}
                value={filters.domain || ''}
                onChange={(val) => onFilterChange('domain', val || '')}
                placeholder="همه حوزه‌ها"
              />
            </div>

            {/* وضعیت */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                وضعیت
              </label>
              <SearchableSelect
                options={statusOptions}
                value={filters.status || ''}
                onChange={(val) => onFilterChange('status', val || '')}
                placeholder="همه وضعیت‌ها"
              />
            </div>

            {/* اولویت */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                اولویت
              </label>
              <SearchableSelect
                options={priorityOptions}
                value={filters.priority || ''}
                onChange={(val) => onFilterChange('priority', val || '')}
                placeholder="همه اولویت‌ها"
              />
            </div>

            {/* سطح پروژه */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                سطح پروژه
              </label>
              <SearchableSelect
                options={projectLevelOptions}
                value={filters.projectLevel || ''}
                onChange={(val) => onFilterChange('projectLevel', val || '')}
                placeholder="همه سطوح"
              />
            </div>

            {/* نوع دانش */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                نوع دانش
              </label>
              <SearchableSelect
                options={knowledgeTypeOptions}
                value={filters.knowledgeType || ''}
                onChange={(val) => onFilterChange('knowledgeType', val || '')}
                placeholder="همه انواع"
              />
            </div>

            {/* دسته‌بندی مسئله */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                دسته‌بندی مسئله
              </label>
              <SearchableSelect
                options={categoryOptions}
                value={filters.category || ''}
                onChange={(val) => onFilterChange('category', val || '')}
                placeholder="همه دسته‌ها"
              />
            </div>

            {/* تاریخ از - با دیت‌پیکر شمسی */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                تاریخ از
              </label>
              <div className="relative">
                <DatePicker
                  value={filters.fromDate ? new Date(filters.fromDate) : null}
                  onChange={(date: any) => {
                    onFilterChange('fromDate', date?.toDate?.()?.toISOString() || '');
                  }}
                  calendar={persian}
                  locale={persian_fa}
                  animations={[transition()]}
                  format="YYYY/MM/DD"
                  inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-8"
                  containerClassName="w-full"
                  placeholder="از تاریخ..."
                />
                <Calendar
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                {filters.fromDate && (
                  <button
                    onClick={() => onFilterChange('fromDate', '')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* تاریخ تا - با دیت‌پیکر شمسی */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                تاریخ تا
              </label>
              <div className="relative">
                <DatePicker
                  value={filters.toDate ? new Date(filters.toDate) : null}
                  onChange={(date: any) => {
                    onFilterChange('toDate', date?.toDate?.()?.toISOString() || '');
                  }}
                  calendar={persian}
                  locale={persian_fa}
                  animations={[transition()]}
                  format="YYYY/MM/DD"
                  inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-8"
                  containerClassName="w-full"
                  placeholder="تا تاریخ..."
                />
                <Calendar
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                {filters.toDate && (
                  <button
                    onClick={() => onFilterChange('toDate', '')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* دکمه اعمال فیلترها در موبایل */}
          <div className="mt-4 flex justify-end sm:hidden">
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              اعمال فیلترها
            </button>
          </div>

          {/* نمایش فیلترهای فعال */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 ml-2">فیلترهای فعال:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (!value || key === 'search') return null;
                const label = {
                  domain: 'حوزه',
                  status: 'وضعیت',
                  priority: 'اولویت',
                  projectLevel: 'سطح پروژه',
                  knowledgeType: 'نوع دانش',
                  category: 'دسته‌بندی',
                  fromDate: 'از تاریخ',
                  toDate: 'تا تاریخ',
                }[key] || key;

                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px]"
                  >
                    {label}: {typeof value === 'string' ? value : JSON.stringify(value)}
                    <button
                      onClick={() => onFilterChange(key, '')}
                      className="hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IssueFilters;