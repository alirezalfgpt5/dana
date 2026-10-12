import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Languages, RotateCcw, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_UI_TEXTS, DEFAULT_UI_TEXT_CATEGORY } from 'virtual:dana-ui-text-catalog';
import { getUiTextOverrides, loadUiTextOverrides, saveUiTextOverrides } from '../utils/uiText';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useUIStore } from '../store';
import { PageToolbar } from '../components/ui/PageToolbar';

const PAGE_SIZE = 25;

export function UiTextSettings() {
  const darkMode = useUIStore(state => state.darkMode);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState(() => ({ ...getUiTextOverrides() }));

  useEffect(() => {
    let cancelled = false;
    loadUiTextOverrides()
      .then(overrides => { if (!cancelled) setDrafts({ ...overrides }); })
      .catch(error => {
        console.error('Could not load custom UI text overrides:', error);
        toast.error('دریافت عنوان‌های ذخیره‌شده از پایگاه داده انجام نشد.');
      });
    return () => { cancelled = true; };
  }, []);

  const visibleTexts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fa');
    return DEFAULT_UI_TEXTS.filter(defaultText => (
      category !== ''
      && (category === 'همه بخش‌ها' || DEFAULT_UI_TEXT_CATEGORY[defaultText] === category)
      && (
        !normalizedQuery
        || defaultText.toLocaleLowerCase('fa').includes(normalizedQuery)
        || (drafts[defaultText] || '').toLocaleLowerCase('fa').includes(normalizedQuery)
      )
    ));
  }, [category, drafts, query]);
  const categories = useMemo(() => [
    'همه بخش‌ها',
    ...new Set(Object.values(DEFAULT_UI_TEXT_CATEGORY).sort((a, b) => a.localeCompare(b, 'fa'))),
  ], []);
  const totalPages = Math.max(1, Math.ceil(visibleTexts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTexts = visibleTexts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const customCount = Object.entries(drafts).filter(([defaultText, customText]) => (
    customText.trim() && customText !== defaultText
  )).length;

  const updateText = (defaultText: string, customText: string) => {
    setDrafts(current => ({ ...current, [defaultText]: customText }));
  };

  const save = async () => {
    const overrides = Object.fromEntries(
      Object.entries(drafts)
        .map(([defaultText, customText]) => [defaultText, customText.trim()] as const)
        .filter(([defaultText, customText]) => customText && customText !== defaultText),
    );
    try {
      await saveUiTextOverrides(overrides);
      setDrafts(overrides);
      toast.success('عنوان‌های سفارشی در پایگاه داده ذخیره و در برنامه اعمال شدند.');
    } catch (error) {
      console.error('Could not save custom UI text overrides:', error);
      toast.error('ذخیرهٔ عنوان‌های سفارشی انجام نشد.');
    }
  };

  const restoreDefaults = async () => {
    if (!window.confirm('همهٔ عنوان‌های سفارشی حذف و متن‌های پیش‌فرض بازیابی شوند؟')) return;
    try {
      await saveUiTextOverrides({});
      setDrafts({});
      setPage(1);
      toast.success('متن‌های پیش‌فرض بازیابی شدند.');
    } catch (error) {
      console.error('Could not restore default UI texts:', error);
      toast.error('بازیابی متن‌های پیش‌فرض انجام نشد.');
    }
  };

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <PageToolbar
        title="تنظیم ادبیات و عنوان‌های برنامه"
        subtitle="ویرایش عبارت‌های ثابت رابط کاربری؛ متن پیش‌فرض در ستون اول و عنوان سفارشی در ستون دوم"
        icon={Languages}
      />

      <section className="theme-card space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block min-w-0 flex-1">
            <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
            <input
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
              placeholder="جستجو در عنوان پیش‌فرض یا عنوان سفارشی..."
              className="input-theme w-full py-2.5 pr-10 pl-3 text-sm"
              aria-label="جستجو در عنوان‌ها"
            />
          </label>
          <div className="min-w-56">
            <SearchableSelect
              options={categories.map(item => ({ value: item, label: item }))}
              value={category}
              onChange={value => { setCategory(value ? String(value) : ''); setPage(1); }}
              placeholder="جستجو و انتخاب بخش..."
              allowClear
              theme={darkMode ? 'dark' : 'light'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {category ? `${visibleTexts.length.toLocaleString('fa-IR')} مورد · ${customCount.toLocaleString('fa-IR')} تغییر` : 'ابتدا یک بخش را انتخاب کنید'}
            </span>
            <button disabled={!category} onClick={restoreDefaults} className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <RotateCcw size={15} /> بازگشت به پیش‌فرض
            </button>
            <button disabled={!category} onClick={save} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={15} /> ذخیره و اعمال
            </button>
          </div>
        </div>

        {category ? <div className="overflow-x-auto rounded-xl border divider-main">
          <table className="w-full min-w-[44rem] border-collapse text-right">
            <thead className="surface-soft">
              <tr>
                <th className="w-1/2 px-4 py-3 text-xs font-bold text-strong">عنوان پیش‌فرض برنامه</th>
                <th className="w-1/2 px-4 py-3 text-xs font-bold text-strong">عنوان جدید (اختیاری)</th>
              </tr>
            </thead>
            <tbody>
              {pageTexts.map(defaultText => (
                <tr key={defaultText} className="border-t divider-main align-top">
                  <td className="px-4 py-3 text-sm leading-6 text-strong">{defaultText}</td>
                  <td className="px-4 py-2">
                    <input
                      value={drafts[defaultText] || ''}
                      onChange={event => updateText(defaultText, event.target.value)}
                      placeholder={defaultText}
                      maxLength={500}
                      className="input-theme w-full px-3 py-2 text-sm"
                      aria-label={`عنوان جایگزین برای ${defaultText}`}
                    />
                  </td>
                </tr>
              ))}
              {pageTexts.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    عنوانی با این عبارت پیدا نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div> : null}

        {category && <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            نمایش {visibleTexts.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE + 1).toLocaleString('fa-IR')} تا {Math.min(currentPage * PAGE_SIZE, visibleTexts.length).toLocaleString('fa-IR')} از {visibleTexts.length.toLocaleString('fa-IR')} عنوان
          </span>
          <div className="flex items-center gap-1">
            <button
              aria-label="صفحهٔ قبل"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="btn-secondary p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const pageNumber = firstPage + index;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`rounded-lg px-3 py-2 text-xs ${pageNumber === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {pageNumber.toLocaleString('fa-IR')}
                </button>
              );
            })}
            <button
              aria-label="صفحهٔ بعد"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="btn-secondary p-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="mr-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentPage.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
            </span>
          </div>
        </div>}
      </section>
    </div>
  );
}
