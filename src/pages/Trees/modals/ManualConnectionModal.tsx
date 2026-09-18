// src/pages/Trees/modals/ManualConnectionModal.tsx
// مودال اتصال دستی برگ درختواره تولیدشده به درختواره مورد نیاز

import React, { useState, useEffect } from 'react';
import { X, Link, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

interface ManualConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leafNode: any;
  requiredTrees: any[];
  onConnect: (data: { requiredNodeId: number; priority: string; description: string }) => Promise<void>;
}

export function ManualConnectionModal({
  isOpen,
  onClose,
  leafNode,
  requiredTrees,
  onConnect,
}: ManualConnectionModalProps) {
  const [selectedRequiredTreeId, setSelectedRequiredTreeId] = useState<string>('');
  const [selectedRequiredNodeId, setSelectedRequiredNodeId] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [description, setDescription] = useState<string>('');
  const [requiredNodes, setRequiredNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedRequiredTreeId && isOpen) {
      const fetchRequiredNodes = async () => {
        setLoading(true);
        try {
          const res = await(window.customFetch || window.fetch)(`/api/trees/${selectedRequiredTreeId}/nodes?level=L`);
          const data = await res.json();
          setRequiredNodes(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching required nodes:', error);
          toast.error('خطا در دریافت گره‌های مورد نیاز');
        } finally {
          setLoading(false);
        }
      };
      fetchRequiredNodes();
    } else {
      setRequiredNodes([]);
    }
  }, [selectedRequiredTreeId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRequiredTreeId('');
      setSelectedRequiredNodeId('');
      setPriority('medium');
      setDescription('');
      setRequiredNodes([]);
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!selectedRequiredTreeId) {
      newErrors.tree = 'لطفاً درختواره مورد نیاز را انتخاب کنید';
    }
    if (!selectedRequiredNodeId) {
      newErrors.node = 'لطفاً گره مورد نیاز را انتخاب کنید';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onConnect({
        requiredNodeId: parseInt(selectedRequiredNodeId),
        priority,
        description: description || `اتصال دستی از گره "${leafNode?.title}"`,
      });
    } catch (error) {
      // خطا در onConnect مدیریت می‌شود
    }
  };

  if (!isOpen || !leafNode) return null;

  const treeOptions = requiredTrees.map(t => ({
    value: String(t.id),
    label: t.name,
  }));

  const nodeOptions = requiredNodes.map(n => ({
    value: String(n.id),
    label: `${n.title} (${n.level})`,
  }));

  const priorityOptions = [
    { value: 'critical', label: '🔥 بحرانی' },
    { value: 'high', label: '⬆️ بالا' },
    { value: 'medium', label: '➖ متوسط' },
    { value: 'low', label: '⬇️ پایین' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Link size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">اتصال دستی به درختواره مورد نیاز</h3>
              <p className="text-xs text-gray-500">
                اتصال گره "{leafNode?.title}" به گره برگ در درختواره مورد نیاز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
            <p className="font-bold text-green-800">📌 گره تولیدشده:</p>
            <p className="text-green-700">{leafNode?.title}</p>
            <p className="text-xs text-green-600 mt-0.5">سطح: {leafNode?.level} • شناسه: {leafNode?.id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              درختواره مورد نیاز <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={treeOptions}
              value={selectedRequiredTreeId}
              onChange={(val) => {
                setSelectedRequiredTreeId(val ? String(val) : '');
                setSelectedRequiredNodeId('');
                setErrors({});
              }}
              placeholder="انتخاب درختواره مورد نیاز..."
            />
            {errors.tree && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.tree}
              </p>
            )}
          </div>

          {selectedRequiredTreeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                گره برگ مورد نیاز <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="mr-2 text-sm text-gray-400">در حال بارگذاری گره‌ها...</span>
                </div>
              ) : nodeOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={20} className="mx-auto mb-1" />
                  <p>هیچ گره برگ (L) در این درختواره یافت نشد</p>
                  <p className="text-xs text-gray-400 mt-1">ابتدا گره‌های برگ در درختواره مورد نیاز ایجاد کنید</p>
                </div>
              ) : (
                <SearchableSelect
                  options={nodeOptions}
                  value={selectedRequiredNodeId}
                  onChange={(val) => {
                    setSelectedRequiredNodeId(val ? String(val) : '');
                    setErrors({});
                  }}
                  placeholder="انتخاب گره برگ مورد نیاز..."
                />
              )}
              {errors.node && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.node}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              اولویت اتصال <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            >
              {priorityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              💡 اولویت مشخص می‌کند که این اتصال در تحلیل شکاف با چه اولویتی نمایش داده شود
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              توضیحات (اختیاری)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm min-h-[60px] resize-none"
              placeholder="توضیحاتی در مورد این اتصال دستی..."
              rows={2}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <p className="font-bold">⚠️ نکته مهم:</p>
            <p>با ایجاد اتصال دستی، این گره تولیدشده به عنوان پاسخ‌دهنده به گره مورد نیاز ثبت می‌شود و گپ مربوطه بسته می‌شود.</p>
            <p className="mt-1">اولویت تعیین‌شده در تحلیل شکاف و خروجی‌ها نمایش داده می‌شود.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 transition-all hover:scale-105 disabled:opacity-50"
            >
              <Link size={16} />
              {loading ? 'در حال اتصال...' : 'اتصال دستی'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualConnectionModal;