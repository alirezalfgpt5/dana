// src/components/issues/tabs/StagesTab.tsx
// تب مقاطع و مراحل انجام (۲۰٪، ۵۰٪، ۱۰۰٪) همراه با ورودی فایل صورتجلسه و سوابق تکمیلی

import React from 'react';
import { Calendar, FileText, Upload, Trash2, Paperclip } from 'lucide-react';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  safeDateForPicker, 
  formatPickerDate,
  StageData 
} from './types';
import { formatNumber, parseNumberInput } from '../../../utils/numberFormat';

interface StageSectionProps {
  title: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  stageData: StageData;
  setStageData: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (field: string, file: File | null) => void;
}

const StageSection: React.FC<StageSectionProps> = ({
  title,
  badge,
  badgeColor,
  borderColor,
  bgColor,
  stageData,
  setStageData,
  handleFileUpload,
}) => {
  return (
    <div className={`border ${borderColor} rounded-xl p-4 ${bgColor} space-y-3`}>
      <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
        <span className={`${badgeColor} px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
          {badge}
        </span>
        <span className="text-xs text-gray-500">{title}</span>
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📄 پروپوزال / شرح مرحله</label>
          <input
            type="text"
            value={stageData?.proposal || ''}
            onChange={e => setStageData({ ...stageData, proposal: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            placeholder="عنوان یا شرح گزارش مرحله..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل گزارش مرحله</label>
          <input
            type="file"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setStageData({ ...stageData, file });
              if (file) handleFileUpload(`${badge} - گزارش`, file);
            }}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {stageData?.file && (
            <span className="text-[11px] text-blue-700 mt-1 block truncate">
              فایل انتخابی: {stageData.file.name || 'فایل گزارش'}
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(stageData?.defenseDate)}
              onChange={(date: any) => setStageData({ ...stageData, defenseDate: formatPickerDate(date) })}
              calendar={persian}
              locale={persian_fa}
              portal
              zIndex={10000}
              format="YYYY/MM/DD"
              inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📋 شماره صورتجلسه</label>
          <input
            type="text"
            value={stageData?.minutes || ''}
            onChange={e => setStageData({ ...stageData, minutes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            placeholder="شماره صورتجلسه..."
          />
        </div>

        {/* ورودی فایل صورتجلسه (حل اولویت ۵) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📄 فایل صورتجلسه دفاع (Minutes)</label>
          <input
            type="file"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setStageData({ ...stageData, minutesFile: file });
              if (file) handleFileUpload(`${badge} - صورتجلسه`, file);
            }}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
          {stageData?.minutesFile && (
            <span className="text-[11px] text-purple-700 mt-1 block truncate">
              صورتجلسه: {stageData.minutesFile.name || 'فایل صورتجلسه'}
            </span>
          )}
        </div>

        {/* ورودی فایل‌های سوابق تکمیلی (حل اولویت ۵) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📚 فایل‌های سوابق و مستندات تکمیلی</label>
          <input
            type="file"
            multiple
            onChange={e => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setStageData({ ...stageData, recordsFiles: files });
              files.forEach(f => handleFileUpload(`${badge} - سوابق`, f));
            }}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          {Array.isArray(stageData?.recordsFiles) && stageData.recordsFiles.length > 0 && (
            <span className="text-[11px] text-gray-600 mt-1 block">
              تعداد {stageData.recordsFiles.length} فایل سابقه انتخاب شد
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی (ریال)</label>
          <input
            type="text"
            inputMode="numeric"
            value={stageData?.paidAmount !== undefined && stageData?.paidAmount !== null ? formatNumber(stageData.paidAmount) : ''}
            onChange={e => setStageData({ ...stageData, paidAmount: parseNumberInput(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            placeholder="۰"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(stageData?.paymentDate)}
              onChange={(date: any) => setStageData({ ...stageData, paymentDate: formatPickerDate(date) })}
              calendar={persian}
              locale={persian_fa}
              portal
              zIndex={10000}
              format="YYYY/MM/DD"
              inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface StagesTabProps {
  stage20Data: StageData;
  setStage20Data: React.Dispatch<React.SetStateAction<any>>;
  stage50Data: StageData;
  setStage50Data: React.Dispatch<React.SetStateAction<any>>;
  stage100Data: StageData;
  setStage100Data: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (field: string, file: File | null) => void;
}

export const StagesTab: React.FC<StagesTabProps> = ({
  stage20Data,
  setStage20Data,
  stage50Data,
  setStage50Data,
  stage100Data,
  setStage100Data,
  handleFileUpload,
}) => {
  return (
    <div className="space-y-5">
      <StageSection
        title="تعریف، تدوین و دفاع پروپوزال"
        badge="📌 مقطع ۲۰٪"
        badgeColor="bg-blue-100 text-blue-800"
        borderColor="border-blue-200"
        bgColor="bg-blue-50/20"
        stageData={stage20Data}
        setStageData={setStage20Data}
        handleFileUpload={handleFileUpload}
      />

      <StageSection
        title="گزارش پیشرفت میانی، آزمایش‌ها و آزمون"
        badge="📌 مقطع ۵۰٪"
        badgeColor="bg-amber-100 text-amber-800"
        borderColor="border-amber-200"
        bgColor="bg-amber-50/20"
        stageData={stage50Data}
        setStageData={setStage50Data}
        handleFileUpload={handleFileUpload}
      />

      <StageSection
        title="دفاع نهایی، تحویل‌گیری محصول و دستاورد"
        badge="📌 مقطع ۱۰۰٪"
        badgeColor="bg-emerald-100 text-emerald-800"
        borderColor="border-emerald-200"
        bgColor="bg-emerald-50/20"
        stageData={stage100Data}
        setStageData={setStage100Data}
        handleFileUpload={handleFileUpload}
      />
    </div>
  );
};

export default StagesTab;
