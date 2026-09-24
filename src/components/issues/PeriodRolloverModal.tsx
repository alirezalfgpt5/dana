// src/components/issues/PeriodRolloverModal.tsx
// مدال مدیریت انتقال بین‌دوره‌ای و ورود اطلاعات دوره‌های جدید (سی‌دی و فایل)

import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  ArrowLeftRight, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Copy,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PeriodRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: any[];
  activePeriod: any;
  onCarryOver: (sourcePeriodId: number, targetPeriodId: number, mode: string) => Promise<any>;
  onBatchImport: (targetPeriodId: number, issuesList: any[], updateExisting: boolean) => Promise<any>;
  onRefresh: () => void;
}

export function PeriodRolloverModal({
  isOpen,
  onClose,
  periods,
  activePeriod,
  onCarryOver,
  onBatchImport,
  onRefresh
}: PeriodRolloverModalProps) {
  const [activeTab, setActiveTab] = useState<'carryOver' | 'import'>('carryOver');
  const [loading, setLoading] = useState(false);

  // فرم انتقال دوره
  const [sourcePeriodId, setSourcePeriodId] = useState<string>(activePeriod?.id ? String(activePeriod.id) : (periods[0]?.id ? String(periods[0].id) : ''));
  const [targetPeriodId, setTargetPeriodId] = useState<string>('');
  const [carryOverMode, setCarryOverMode] = useState<'open_only' | 'all'>('open_only');

  // فرم ورود اطلاعات سی‌دی / فایل
  const [importPeriodId, setImportPeriodId] = useState<string>(activePeriod?.id ? String(activePeriod.id) : (periods[0]?.id ? String(periods[0].id) : ''));
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleCarryOverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePeriodId || !targetPeriodId) {
      toast.error('لطفاً هم دوره مبدأ و هم دوره مقصد را مشخص فرمایید');
      return;
    }
    if (sourcePeriodId === targetPeriodId) {
      toast.error('دوره مبدأ و دوره مقصد نمی‌توانند یکسان باشند');
      return;
    }

    setLoading(true);
    try {
      await onCarryOver(parseInt(sourcePeriodId), parseInt(targetPeriodId), carryOverMode);
      onRefresh();
      onClose();
    } catch (err: any) {
      // خطا در هوک مدیریت شده
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // تلاش برای پارس به عنوان JSON یا خطوط CSV
        if (file.name.endsWith('.json')) {
          setJsonInput(content);
          toast.success('فایل JSON با موفقیت بارگذاری شد');
        } else {
          // تبدیل سطرهای متنی / CSV به لیست ساده
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          const parsed = lines.slice(1).map(l => {
            const parts = l.split(',');
            return {
              title: parts[0]?.replace(/"/g, '').trim(),
              completionPercent: parseInt(parts[1]?.replace(/"/g, '').trim()) || 0,
              status: parts[2]?.replace(/"/g, '').trim() || 'in_progress',
            };
          }).filter(item => !!item.title);
          setJsonInput(JSON.stringify(parsed, null, 2));
          toast.success(`تعداد ${parsed.length} رکورد از فایل استخراج شد`);
        }
      } catch (err) {
        toast.error('خطا در خواندن فایل');
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPeriodId) {
      toast.error('لطفاً دوره زمانی مقصد را انتخاب کنید');
      return;
    }
    if (!jsonInput.trim()) {
      toast.error('لطفاً اطلاعات مسائل (فایل یا متن JSON) را وارد کنید');
      return;
    }

    let parsedList: any[] = [];
    try {
      parsedList = JSON.parse(jsonInput);
      if (!Array.isArray(parsedList)) {
        toast.error('فرمت داده‌ها باید یک آرایه از مسائل باشد');
        return;
      }
    } catch (err) {
      toast.error('فرمت متن JSON نامعتبر است');
      return;
    }

    setLoading(true);
    try {
      await onBatchImport(parseInt(importPeriodId), parsedList, updateExisting);
      onRefresh();
      onClose();
    } catch (err: any) {
      // مدیریت در هوک
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ArrowLeftRight size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">مدیریت دوره‌ای و به‌روزرسانی مسائل (سی‌دی جدید)</h3>
              <p className="text-xs text-purple-100 mt-0.5">انتقال، فریز سوابق تاریخی و اعمال اطلاعات دوره‌های جدید</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('carryOver')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'carryOver'
                ? 'bg-white text-purple-700 border-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          >
            <Copy size={16} />
            انتقال مسائل باز به دوره جدید (Carry-Over)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'import'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          >
            <UploadCloud size={16} />
            ورود اطلاعات سی‌دی / فایل به دوره
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'carryOver' ? (
            <form onSubmit={handleCarryOverSubmit} className="space-y-5">
              <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
                <Info size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>چرا انتقال دوره‌ای؟</strong> با شروع یک دوره جدید، مسائل ناتمام دوره قبل بدون دستکاری در سابقه گذشته، به عنوان رکوردهای مستقل به دوره جدید کپی می‌شوند. بدین ترتیب اطلاعات دوره گذشته دست‌نخورده باقی می‌ماند و هر زمان به آن دوره برگردید آمار قبلی را می‌بینید.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    ۱. دوره مبدأ (اطلاعات فعلی)
                  </label>
                  <select
                    value={sourcePeriodId}
                    onChange={(e) => setSourcePeriodId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">انتخاب دوره مبدأ...</option>
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.id === activePeriod?.id ? '(دوره فعال فعلی)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    ۲. دوره مقصد (دوره زمانی جدید)
                  </label>
                  <select
                    value={targetPeriodId}
                    onChange={(e) => setTargetPeriodId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">انتخاب دوره جدید مقصد...</option>
                    {periods.filter(p => String(p.id) !== sourcePeriodId).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  ۳. دامنه انتقال مسائل
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="carryOverMode"
                      value="open_only"
                      checked={carryOverMode === 'open_only'}
                      onChange={() => setCarryOverMode('open_only')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-800">فقط مسائل در جریان و باز (پیشنهادی)</span>
                      <p className="text-xs text-gray-500 mt-0.5">مسائل تکمیل‌شده در دوره گذشته به عنوان دستاورد باقی می‌مانند و فقط پروژه‌های در حال اجرا و در انتظار کپی می‌شوند.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="carryOverMode"
                      value="all"
                      checked={carryOverMode === 'all'}
                      onChange={() => setCarryOverMode('all')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-800">تمام مسائل (شامل تکمیل‌شده‌ها)</span>
                      <p className="text-xs text-gray-500 mt-0.5">کلیه مسائل دوره قبل به دوره جدید به عنوان نسخه مستقل منتقل می‌شوند.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading || !sourcePeriodId || !targetPeriodId}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'در حال انتقال و ایجاد نسخه...' : 'تایید و انتقال به دوره جدید'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleImportSubmit} className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>ورود اطلاعات از سی‌دی یا فایل جدید:</strong> اگر برای دوره جدید فایل اطلاعاتی آورده‌اید، می‌توانید مسائل را بارگذاری کنید. در صورتی که گزینه‌ی به‌روزرسانی فعال باشد، اطلاعات مسائلی که عنوان یکسان دارند (مانند درصد پیشرفت جدید و بودجه) در همین دوره به‌روزرسانی خواهند شد.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  دوره زمانی هدف برای اعمال داده‌ها
                </label>
                <select
                  value={importPeriodId}
                  onChange={(e) => setImportPeriodId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === activePeriod?.id ? '(دوره فعال جاری)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  بارگذاری فایل اطلاعاتی (JSON / CSV از سی‌دی)
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-gray-50/50 relative">
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={28} className="mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs text-gray-600 font-medium">
                    {fileName ? `فایل انتخاب شده: ${fileName}` : 'برای انتخاب فایل کلیک کنید یا فایل را به اینجا بکشید'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">فرمت‌های مجاز: JSON یا CSV با ستون‌های title, completionPercent, status</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  یا متن داده‌های JSON را در این بخش قرار دهید:
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[\n  {\n    "title": "طراحی الگوریتم توزیع هوشمند",\n    "completionPercent": 75,\n    "status": "in_progress"\n  }\n]`}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    در صورت وجود مسئله با عنوان یکسان در این دوره، درصد پیشرفت و مشخصات آن به‌روزرسانی شود.
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading || !importPeriodId || !jsonInput.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-medium shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'در حال اعمال به‌روزرسانی...' : 'اعمال اطلاعات سی‌دی در دوره'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
