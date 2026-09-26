// src/components/issues/tabs/CollaborationTab.tsx
// تب همکاری‌ها و دیپلماسی علمی

import React from 'react';
import { SearchableSelect } from '../../ui/SearchableSelect';

interface CollaborationTabProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
  dynamicScientificDiplomacyLevels: string[];
}

export const CollaborationTab: React.FC<CollaborationTabProps> = ({
  formData,
  handleChange,
  dynamicScientificDiplomacyLevels,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🌐 دیپلماسی علمی
        </label>
        <SearchableSelect
          options={dynamicScientificDiplomacyLevels.map(s => ({ value: s, label: s }))}
          value={formData.scientificDiplomacy}
          onChange={(val) => handleChange('scientificDiplomacy', val || '')}
          placeholder="انتخاب سطح دیپلماسی علمی..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🤝 همکاری با کجاها
        </label>
        <input
          type="text"
          value={formData.collaborators || ''}
          onChange={e => handleChange('collaborators', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام دستگاه‌ها یا نهادهای همکار..."
        />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
        <h4 className="font-medium text-gray-700 text-sm mb-3">🌐 جزئیات شبکه همکاران</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">همکاران داخلی</label>
            <input
              type="text"
              value={formData.collaborationNetwork?.internal || ''}
              onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, internal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شوراها و دبیرخانه‌های داخلی..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">همکاران خارجی/بین‌المللی</label>
            <input
              type="text"
              value={formData.collaborationNetwork?.external || ''}
              onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, external: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="نهادهای بین‌المللی..."
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">توضیحات شبکه</label>
          <textarea
            value={formData.collaborationNetwork?.description || formData.collaborationNetwork?.text || ''}
            onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, description: e.target.value, text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm min-h-[80px]"
            placeholder="توضیحات نحوه همکاری..."
          />
        </div>
      </div>
    </div>
  );
};
