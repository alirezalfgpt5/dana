// src/components/BaseDataSelect.tsx
// کامپوننت انتخاب داده‌های پایه با قابلیت افزودن آیتم جدید

import React, { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { useBaseData } from '../hooks/useBaseData';
import { SearchableSelect } from './ui/SearchableSelect';
import toast from 'react-hot-toast';

interface BaseDataSelectProps {
  category: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function BaseDataSelect({
  category,
  value,
  onChange,
  placeholder,
  className,
  disabled,
  required,
}: BaseDataSelectProps) {
  const { data, loading, refetch } = useBaseData(category);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newItem.trim()) {
      toast.error('لطفاً عنوان جدید را وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      const res = await(window.customFetch || window.fetch)('/api/base-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          value: newItem.trim(),
          label: newItem.trim(),
        }),
      });

      if (res.ok) {
        toast.success('گزینه جدید با موفقیت اضافه شد');
        setNewItem('');
        setIsAdding(false);
        await refetch();
        onChange(newItem.trim());
      } else {
        const error = await res.json();
        toast.error(error.error || 'خطا در افزودن گزینه');
      }
    } catch (err) {
      toast.error('خطا در اتصال به سرور');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewItem('');
  };

  // تبدیل داده‌ها به فرمت مورد نیاز SearchableSelect
  const options = data.map((item: any) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <div className={`flex gap-2 items-start ${className || ''}`}>
      <div className="flex-1">
        {isAdding ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              placeholder="عنوان جدید..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newItem.trim()}
              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <SearchableSelect
            options={options}
            value={value}
            onChange={onChange as any}
            placeholder={loading ? 'در حال بارگذاری...' : placeholder}
            disabled={disabled}
          />
        )}
      </div>

      {!isAdding && !disabled && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0"
          title="افزودن گزینه جدید"
        >
          <Plus size={18} />
        </button>
      )}

      {required && (
        <span className="text-red-500 text-sm mr-1">*</span>
      )}
    </div>
  );
}