import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ListPlus } from 'lucide-react';
import api from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';
import toast from 'react-hot-toast';

export function DynamicFieldsManager() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({isOpen: false, action: null, message: ''});
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    fieldType: 'text',
    options: '',
    isRequired: false
  });

  const fetchFields = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/dynamic-fields/issue');
      setFields(data as unknown as any[]);
    } catch (e) {
      toast.error('خطا در دریافت فیلدها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.label) {
      toast.error('لطفا نام و عنوان را وارد کنید');
      return;
    }
    
    // Convert options string to array if select
    let optionsArr = null;
    if (formData.fieldType === 'select') {
      optionsArr = formData.options.split(',').map(o => o.trim()).filter(Boolean);
      if (optionsArr.length === 0) {
        toast.error('لطفا حداقل یک گزینه برای لیست وارد کنید');
        return;
      }
    }

    try {
      await api.post('/api/dynamic-fields', {
        entityType: 'issue',
        name: formData.name,
        label: formData.label,
        fieldType: formData.fieldType,
        options: optionsArr,
        isRequired: formData.isRequired,
        sortOrder: fields.length
      });
      toast.success('فیلد جدید با موفقیت اضافه شد');
      setShowForm(false);
      setFormData({ name: '', label: '', fieldType: 'text', options: '', isRequired: false });
      fetchFields();
    } catch (e) {
      toast.error('خطا در ذخیره فیلد');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'آیا از حذف این فیلد اطمینان دارید؟',
      action: async () => {
        try {
          await api.delete(`/api/dynamic-fields/${id}`);
          toast.success('فیلد با موفقیت حذف شد');
          fetchFields();
        } catch (e) {
          toast.error('خطا در حذف فیلد');
        }
      }
    });
  };

  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-gray-200 dark:border-[#2d2d44] p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ListPlus className="text-blue-500" />
            فیلدهای پویای نظام مسائل
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">مدیریت فیلدهای اختصاصی فرم نظام مسائل</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition-colors"
        >
          <Plus size={18} /> افزودن فیلد جدید
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 p-5 bg-gray-50 dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#2d2d44]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-200">نام فیلد (انگلیسی)</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')})} 
                placeholder="مثال: successRate"
                className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-gray-300 dark:border-[#2d2d44] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-200">عنوان نمایش (فارسی)</label>
              <input 
                type="text" 
                value={formData.label} 
                onChange={e => setFormData({...formData, label: e.target.value})} 
                placeholder="مثال: درصد موفقیت"
                className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-gray-300 dark:border-[#2d2d44] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-200">نوع فیلد</label>
              <select 
                value={formData.fieldType} 
                onChange={e => setFormData({...formData, fieldType: e.target.value})}
                className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-gray-300 dark:border-[#2d2d44] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="text">متن کوتاه</option>
                <option value="textarea">متن طولانی</option>
                <option value="number">عدد</option>
                <option value="select">لیست کشویی</option>
              </select>
            </div>
            
            {formData.fieldType === 'select' && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-200">گزینه‌ها (با کاما جدا کنید)</label>
                <input 
                  type="text" 
                  value={formData.options} 
                  onChange={e => setFormData({...formData, options: e.target.value})} 
                  placeholder="مثال: عالی, خوب, متوسط"
                  className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-gray-300 dark:border-[#2d2d44] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="isRequired" 
              checked={formData.isRequired} 
              onChange={e => setFormData({...formData, isRequired: e.target.checked})} 
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isRequired" className="text-sm font-medium text-gray-700 dark:text-gray-200">فیلد اجباری است</label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d44] rounded-lg transition-colors">انصراف</button>
            <button type="submit" className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">ذخیره فیلد</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
      ) : fields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#1a1a2e] rounded-xl border border-dashed border-gray-300 dark:border-[#2d2d44]">
          <p className="text-gray-500 dark:text-gray-400">هیچ فیلد پویایی تعریف نشده است</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-[#2d2d44]">
              <tr>
                <th className="px-4 py-3">نام سیستمی</th>
                <th className="px-4 py-3">عنوان نمایش</th>
                <th className="px-4 py-3">نوع فیلد</th>
                <th className="px-4 py-3">اجباری</th>
                <th className="px-4 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#2d2d44]">
              {fields.map(field => (
                <tr key={field.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a2e]/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{field.name}</td>
                  <td className="px-4 py-3 font-medium">{field.label}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs">
                      {field.fieldType === 'text' ? 'متن کوتاه' : field.fieldType === 'textarea' ? 'متن طولانی' : field.fieldType === 'number' ? 'عدد' : 'لیست کشویی'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {field.isRequired ? <span className="text-red-500 text-xs">بله</span> : <span className="text-gray-400 text-xs">خیر</span>}
                  </td>
                  <td className="px-4 py-3 flex justify-center">
                    <button onClick={() => handleDelete(field.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
