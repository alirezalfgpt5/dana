import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import api from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import toast from 'react-hot-toast';

export const DynamicMetadataManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('action-priorities');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({isOpen: false, action: null, message: ''});

  const subTabs = [
    { id: 'action-priorities', label: 'اولویت اقدام', desc: 'تعیین اولویت و اهمیت اجرای برنامه‌ها (مانند: خیلی زیاد، زیاد، متوسط).' },
    { id: 'project-levels', label: 'سطح پروژه/رویداد', desc: 'مشخص‌کننده سطح سازمانی پروژه (مانند: راهبردی، سطح ۱، سطح ۲).' },
    { id: 'approval-authorities', label: 'مرجع تصویب', desc: 'نهادها و شوراهای مسئول تایید و تصویب پروژه‌ها (مانند: شورای عالی دانش و پژوهش).' },
    { id: 'knowledge-project-types', label: 'پروژه دانشی', desc: 'دسته‌بندی انواع پروژه‌های تولید دانش (مانند: مستندسازی، تجربه‌نگاری، تاریخ‌شفاهی).' },
    { id: 'scientific-diplomacy-levels', label: 'دیپلماسی علمی', desc: 'سطح تعاملات علمی و پژوهشی (مانند: درون‌سازمانی، کشوری، بین‌سازمانی).' },
    { id: 'confidentiality-levels', label: 'سطح محرمانگی', desc: 'درجه طبقه‌بندی اسناد و پروژه‌ها (مانند: محرمانه، سری، عادی).' },
    { id: 'event-types', label: 'رویدادها', desc: 'انواع گردهمایی‌ها و نشست‌های دانشی (مانند: همایش، سمینار، میز تخصصی).' },
    { id: 'research-project-types', label: 'پروژه پژوهشی', desc: 'انواع ماموریت‌های پژوهشی (مانند: آینده‌پژوهی، نقد و مناظره، نظریه‌پردازی).' },
    { id: 'tree-node-types', label: 'نوع‌شناسی دانش', desc: 'نوع خروجی و دستاورد دانشی (مانند: نظریه، الگو، راهبرد، دانش نوظهور).' },
    { id: 'knowledge-domains', label: 'حوزه‌های دانش', desc: 'حوزه‌ها و شاخه‌های اصلی دانشی سازمان.' },
    { id: 'research-networks', label: 'شبکه همکاران', desc: 'شوراها، نهادها و کارگروه‌های همکار در نظام مسائل (مانند: شورای راهبردی، کلینیک نفع).' },
    { id: 'program-coverages', label: 'پوشش برنامه‌ای', desc: 'پوشش برنامه‌ای پژوهش‌ها (مانند: برنامه پنج ساله، ابلاغیات).' },
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/metadata/' + activeSubTab);
      setItems(data as unknown as any[]);
    } catch (e) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeSubTab]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await api.post('/api/metadata/' + activeSubTab, { name: newItemName.trim() });
      setNewItemName('');
      toast.success('با موفقیت اضافه شد');
      fetchItems();
    } catch (e) {
      toast.error('خطا در افزودن مورد جدید');
    }
  };

  const handleDeleteItem = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این مورد اطمینان دارید؟',
      action: async () => {
        try {
          await api.delete('/api/metadata/' + activeSubTab + '/' + id);
          toast.success('با موفقیت حذف شد');
          fetchItems();
        } catch (e) {
          toast.error('خطا در حذف مورد');
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === tab.id 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
          {subTabs.find(t => t.id === activeSubTab)?.label}
        </h3>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {subTabs.find(t => t.id === activeSubTab)?.desc}
        </p>
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="عنوان جدید..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-[#1a1a2e] rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={16} /> افزودن
        </button>
      </form>

      {loading ? (
        <div className="text-center py-4 text-gray-400">در حال دریافت...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Tag size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>موردی یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a2e]/50 rounded-lg border border-gray-200 dark:border-gray-800">
              <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.name}</span>
              <button 
                onClick={() => handleDeleteItem(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="تایید حذف"
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.action) {
            confirmModal.action();
          }
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
      />
    </div>
  );
};
