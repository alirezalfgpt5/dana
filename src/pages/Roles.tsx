import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { Shield, Plus, Edit2, Trash2, CheckSquare, Square, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MENU_CONFIG } from '../config/menuConfig'; // We'll extract flattened routes from here or hardcode it

// For simplicity, we define a list of permissions:
const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'trees/required', label: 'درختواره مورد نیاز' },
  { id: 'trees/produced', label: 'درختواره تولیدشده' },
  { id: 'gaps', label: 'تحلیل شکاف' },
  { id: 'research', label: 'درختواره پژوهشی' },
  { id: 'issues', label: 'نظام مسائل' },
  { id: 'outputs', label: 'خروجی‌ها' },
  { id: 'search', label: 'جستجوی عمیق' },
  { id: 'dynamic-reports', label: 'گزارش‌ساز پویا' },
  { id: 'files', label: 'مدیریت فایل‌ها' },
  { id: 'users', label: 'مدیریت کاربران' },
  { id: 'roles', label: 'نقش‌ها و دسترسی‌ها' },
  { id: 'settings', label: 'تنظیمات عمومی' },
  { id: 'org-structure', label: 'ساختار سازمانی' },
  { id: 'periods', label: 'دوره‌های زمانی' },
  { id: 'audit', label: 'تاریخچه تغییرات' },
  { id: 'definitions', label: 'تعاریف' },
  { id: 'templates', label: 'مدیریت قالب‌ها' }
];

export function RolesManagement() {
  const { user } = useAuthStore();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    permissions: [] as string[]
  });

  const fetchRoles = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/roles', {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (e) {
      toast.error('خطا در دریافت نقش‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.label) {
      toast.error('لطفاً نام و عنوان نقش را وارد کنید');
      return;
    }
    
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      
      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ذخیره نقش');
      
      toast.success(editingRole ? 'نقش به‌روزرسانی شد' : 'نقش با موفقیت ایجاد شد');
      setShowModal(false);
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف این نقش اطمینان دارید؟')) return;
    try {
      const res = await(window.customFetch || window.fetch)(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف نقش');
      toast.success('نقش با موفقیت حذف شد');
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const togglePermission = (id: string) => {
    if (formData.permissions.includes('all')) return; // superadmin protection
    
    setFormData(prev => {
      const newPerms = prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id];
      return { ...prev, permissions: newPerms };
    });
  };

  const openModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      let perms = [];
      try {
        perms = JSON.parse(role.permissions || '[]');
      } catch (e) {}
      setFormData({ name: role.name, label: role.label, permissions: perms });
    } else {
      setEditingRole(null);
      setFormData({ name: '', label: '', permissions: [] });
    }
    setShowModal(true);
  };

  if (user?.role !== 'superadmin' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500">شما دسترسی به این بخش را ندارید</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-purple-500" />
            نقش‌ها و دسترسی‌ها
          </h1>
          <p className="text-gray-500 text-sm mt-1">مدیریت نقش‌های سیستم و سطوح دسترسی کاربران</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-purple-200/50"
        >
          <Plus size={18} />
          نقش جدید
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#2d2d44] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 dark:bg-[#1e1e2f] text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">عنوان نقش</th>
                <th className="px-6 py-4">شناسه سیستم (نام)</th>
                <th className="px-6 py-4">تعداد دسترسی‌ها</th>
                <th className="px-6 py-4 text-center">نوع</th>
                <th className="px-6 py-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d44]">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">در حال بارگذاری...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">هیچ نقشی یافت نشد</td></tr>
              ) : roles.map((role) => {
                let perms = [];
                try { perms = JSON.parse(role.permissions || '[]'); } catch (e) {}
                
                return (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-[#1e1e2f] transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{role.label}</td>
                    <td className="px-6 py-4 text-gray-500 dir-ltr text-left font-mono">{role.name}</td>
                    <td className="px-6 py-4">
                      {perms.includes('all') ? (
                        <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded-md text-xs">دسترسی کامل</span>
                      ) : (
                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-xs">{perms.length} دسترسی</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {role.isSystem ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">سیستمی</span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">سفارشی</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openModal(role)} className="text-gray-400 hover:text-blue-600 transition-colors" title="ویرایش">
                          <Edit2 size={16} />
                        </button>
                        {!role.isSystem && (
                          <button onClick={() => handleDelete(role.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="حذف">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#2d2d44]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {editingRole ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-purple-500" />}
                {editingRole ? 'ویرایش نقش' : 'نقش جدید'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">عنوان نقش (فارسی)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 dark:bg-[#1e1e2f] text-gray-900 dark:text-white"
                    placeholder="مثال: کارشناس ارشد"
                    value={formData.label}
                    onChange={e => setFormData({...formData, label: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">شناسه انگلیسی (یکتا)</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystem}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-[#2d2d44] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 dark:bg-[#1e1e2f] text-gray-900 dark:text-white disabled:opacity-50"
                    placeholder="مثال: senior_expert"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">دسترسی‌ها</label>
                {formData.permissions.includes('all') ? (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800 text-sm">
                    این نقش (مدیر کل) دسترسی کامل به تمام بخش‌های سیستم دارد و قابل تغییر نیست.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_PERMISSIONS.map(perm => {
                      const isSelected = formData.permissions.includes(perm.id);
                      return (
                        <div 
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-400' : 'bg-gray-50 dark:bg-[#1e1e2f] border-gray-200 dark:border-[#2d2d44] hover:bg-gray-100'}`}
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-400" />}
                          <span className="text-sm font-medium">{perm.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 dark:border-[#2d2d44] flex justify-end gap-3 bg-gray-50 dark:bg-[#1e1e2f] rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
              >
                انصراف
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 font-medium"
              >
                <Save size={18} />
                ذخیره نقش
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}