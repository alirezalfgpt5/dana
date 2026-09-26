// src/components/issues/tabs/GeneralTab.tsx
// تب اطلاعات کلی مسئله

import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  transition, 
  safeDateForPicker, 
  formatPickerDate 
} from './types';

interface GeneralTabProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
  researchItems: any[];
  domainNodes: any[];
  issueCategories: string[];
  dynamicConfidentialityLevels: string[];
  dynamicActionPriorities: string[];
  dynamicApprovalAuthorities: string[];
  dynamicKnowledgeTypes: string[];
  dynamicProjectLevels: string[];
  groupedTemplates: Record<string, { root: any; children: any[] }>;
  handleTemplateToggle: (templateId: string) => void;
  statusOptions: { value: string; label: string }[];
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  formData,
  handleChange,
  researchItems,
  domainNodes,
  issueCategories,
  dynamicConfidentialityLevels,
  dynamicActionPriorities,
  dynamicApprovalAuthorities,
  dynamicKnowledgeTypes,
  dynamicProjectLevels,
  groupedTemplates,
  handleTemplateToggle,
  statusOptions,
}) => {
  return (
    <div className="space-y-4">
      {formData.gapId && !formData.researchItemId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex gap-3 items-start">
          <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <strong className="font-bold block mb-1">تبدیل شکاف به مسئله و آیتم پژوهشی</strong>
            شما در حال تعریف یک مسئله جدید برای حل یک <b>شکاف دانشی</b> هستید. پس از ذخیره، سیستم به‌طور خودکار یک <b>آیتم پژوهشی</b> برای این شکاف ایجاد کرده و آن را به این مسئله متصل می‌کند.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔍 مرتبط با آیتم پژوهشی (اختیاری - بر اساس شکاف دانشی)
          </label>
          <SearchableSelect
            options={researchItems.map(r => ({ 
              value: String(r.id), 
              label: `${r.node?.title || 'نامشخص'} - ${r.treeName} (${r.status === 'proposed' ? 'پیشنهادی' : 'تایید شده'})` 
            }))}
            value={formData.researchItemId ? String(formData.researchItemId) : ''}
            onChange={val => handleChange('researchItemId', val)}
            placeholder={formData.gapId ? "یک آیتم پژوهشی به‌صورت خودکار ایجاد خواهد شد" : "انتخاب آیتم پژوهشی برای پر کردن شکاف..."}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📂 حوزه <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={(() => {
              const nodesArray = Array.isArray(domainNodes) ? domainNodes : [];
              const opts = nodesArray.map((n: any) => ({ 
                value: String(n.id), 
                label: `${n.title} (${n.treeName})` 
              }));
              if (formData.domainNodeId && formData.domain && !opts.find(o => o.value === String(formData.domainNodeId))) {
                opts.unshift({ value: String(formData.domainNodeId), label: formData.domain });
              }
              return opts;
            })()}
            value={formData.domainNodeId ? String(formData.domainNodeId) : ''}
            onChange={val => handleChange('domainNodeId', val)}
            placeholder="انتخاب حوزه..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📌 عنوان مسئله <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="عنوان عینی و شفاف..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🧭 جهت‌گیری راه‌حل
        </label>
        <textarea
          value={formData.solutionDirection || ''}
          onChange={e => handleChange('solutionDirection', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="رویکرد کلی برای حل مسئله..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏷️ دسته‌بندی مسئله
          </label>
          <SearchableSelect
            options={issueCategories.map(cat => ({ value: cat, label: cat }))}
            value={formData.category || ''}
            onChange={(val) => handleChange('category', val || '')}
            placeholder="انتخاب دسته‌بندی مسئله..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏢 دستگاه یا یگان مسئول
          </label>
          <input
            type="text"
            value={formData.responsibleUnit || ''}
            onChange={e => handleChange('responsibleUnit', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="واحد متولی اجرا..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔒 سطح محرمانگی
          </label>
          <SearchableSelect
            options={dynamicConfidentialityLevels.map(c => ({ value: c, label: c }))}
            value={formData.confidentialityLevel}
            onChange={(val) => handleChange('confidentialityLevel', val || 'عمومی')}
            placeholder="انتخاب سطح محرمانگی..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🎯 اولویت اقدام
          </label>
          <SearchableSelect
            options={dynamicActionPriorities.map(p => ({ value: p, label: p }))}
            value={formData.actionPriority}
            onChange={(val) => handleChange('actionPriority', val || 'متوسط')}
            placeholder="انتخاب اولویت..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📅 تاریخ تصویب
          </label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(formData.approvalDate)}
              onChange={(date: any) => handleChange('approvalDate', formatPickerDate(date))}
              calendar={persian}
              locale={persian_fa}
              animations={[transition()]}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏛️ مرجع تصویب
          </label>
          <SearchableSelect
            options={dynamicApprovalAuthorities.map(a => ({ value: a, label: a }))}
            value={formData.approvalAuthority}
            onChange={(val) => handleChange('approvalAuthority', val || '')}
            placeholder="انتخاب مرجع تصویب..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📚 نوع‌شناسی دانش
          </label>
          <SearchableSelect
            options={dynamicKnowledgeTypes.map(k => ({ value: k, label: k }))}
            value={formData.knowledgeType}
            onChange={(val) => handleChange('knowledgeType', val || '')}
            placeholder="انتخاب نوع دانش..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📊 سطح پروژه
          </label>
          <SearchableSelect
            options={dynamicProjectLevels.map(p => ({ value: p, label: p }))}
            value={formData.projectLevel}
            onChange={(val) => handleChange('projectLevel', val || 'سطح1')}
            placeholder="انتخاب سطح پروژه..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📋 قالب‌های مجاز
          <span className="text-xs text-gray-400 mr-1">(سینک با آیتم پژوهشی / درختواره مورد نیاز)</span>
        </label>
        <div className="space-y-3 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
          {Object.keys(groupedTemplates).length > 0 ? (
            Object.entries(groupedTemplates).map(([type, group]: [string, any]) => {
              const rootChecked = formData.templateIds?.includes(String(group.root.id)) || false;
              return (
              <div key={type} className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rootChecked}
                    onChange={() => handleTemplateToggle(String(group.root.id))}
                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-700">{type}</span>
                  <span className="text-[10px] text-gray-400 font-normal mr-auto bg-gray-100 px-1.5 py-0.5 rounded">
                    نوع قالب
                  </span>
                </label>
                {group.children.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    {group.children.map((template: any) => {
                      const isChecked = formData.templateIds?.includes(String(template.id)) || false;
                      return (
                        <label
                          key={template.id}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all
                            ${isChecked
                               ? 'bg-blue-100 border border-blue-300 text-blue-700'
                               : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTemplateToggle(String(template.id))}
                            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span>{template.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )})
          ) : (
            <span className="text-sm text-gray-400">هیچ قالبی تعریف نشده است</span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          💡 قالب‌ها با درختواره مورد نیاز سینک می‌شوند
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📌 وضعیت
        </label>
        <SearchableSelect
          options={statusOptions}
          value={formData.status}
          onChange={(val) => handleChange('status', val || 'pending')}
          placeholder="انتخاب وضعیت..."
        />
      </div>
    </div>
  );
};
