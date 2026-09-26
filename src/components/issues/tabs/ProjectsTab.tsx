// src/components/issues/tabs/ProjectsTab.tsx
// تب پروژه‌های پژوهشی، دانشی و کلان‌پروژه

import React from 'react';
import { SearchableSelect } from '../../ui/SearchableSelect';

interface ProjectsTabProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
  dynamicResearchProjectTypes: string[];
  dynamicKnowledgeProjectTypes: string[];
  dynamicEventTypes: string[];
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  formData,
  handleChange,
  dynamicResearchProjectTypes,
  dynamicKnowledgeProjectTypes,
  dynamicEventTypes,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔬 پروژه پژوهشی
          </label>
          <SearchableSelect
            options={dynamicResearchProjectTypes.map(r => ({ value: r, label: r }))}
            value={formData.researchProjectType}
            onChange={(val) => handleChange('researchProjectType', val || '')}
            placeholder="انتخاب نوع پروژه پژوهشی..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📚 پروژه دانشی
          </label>
          <SearchableSelect
            options={dynamicKnowledgeProjectTypes.map(k => ({ value: k, label: k }))}
            value={formData.knowledgeProjectType}
            onChange={(val) => handleChange('knowledgeProjectType', val || '')}
            placeholder="انتخاب نوع پروژه دانشی..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🎪 رویدادها
        </label>
        <SearchableSelect
          options={dynamicEventTypes.map(e => ({ value: e, label: e }))}
          value={formData.events}
          onChange={(val) => handleChange('events', val || '')}
          placeholder="انتخاب رویداد..."
        />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
        <h4 className="font-medium text-gray-700 text-sm mb-3">🏗️ اطلاعات کلان‌پروژه</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">عنوان کلان‌پروژه</label>
            <input
              type="text"
              value={formData.macroProject?.title || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="عنوان..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">مدیر/مسئول</label>
            <input
              type="text"
              value={formData.macroProject?.manager || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="نام مسئول..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">شماره نامه ابلاغی</label>
            <input
              type="text"
              value={formData.macroProject?.letterNumber || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, letterNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شماره نامه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">تاریخ نامه ابلاغی</label>
            <input
              type="text"
              value={formData.macroProject?.letterDate || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, letterDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="تاریخ نامه..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">آپلود نامه ابلاغی (فایل)</label>
            <input
              type="file"
              onChange={e => handleChange('macroProject', { ...formData.macroProject, file: e.target.files?.[0] || null })}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">توضیحات تکمیلی</label>
          <textarea
            value={formData.macroProject?.description || formData.macroProject?.text || ''}
            onChange={e => handleChange('macroProject', { ...formData.macroProject, description: e.target.value, text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm min-h-[80px]"
            placeholder="توضیحات کلان‌پروژه..."
          />
        </div>
      </div>
    </div>
  );
};
