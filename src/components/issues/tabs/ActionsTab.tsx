// src/components/issues/tabs/ActionsTab.tsx
// تب اهم اقدامات صورت گرفته، گلوگاه‌ها و اوامر

import React from 'react';

interface ActionsTabProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
}

export const ActionsTab: React.FC<ActionsTabProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ✅ اهم اقدامات صورت‌گرفته
        </label>
        <textarea
          value={formData.actionsTaken || ''}
          onChange={e => handleChange('actionsTaken', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="شرح اقدامات اجرا شده..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🚧 گلوگاه‌ها
        </label>
        <textarea
          value={formData.bottlenecks || ''}
          onChange={e => handleChange('bottlenecks', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="موانع و چالش‌های موجود..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📋 اوامر
        </label>
        <textarea
          value={formData.orders || ''}
          onChange={e => handleChange('orders', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="دستورات ویژه یا ابلاغی..."
        />
      </div>
    </div>
  );
};
