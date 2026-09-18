// src/pages/Users.tsx
// مدیریت کامل کاربران - با سطح سازمانی و درجه

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import {
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Users as UsersIcon,
  X,
  Save,
  Search,
  RefreshCw,
  Phone,
  UserCheck,
  Crown,
  User as UserIcon2,
  ChevronDown,
  Building2,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../components/ui/SearchableSelect';

const DEFAULT_RANKS = [
  'سرباز', 'گروهبان', 'استوار', 'ستوان', 'سروان', 'سرگرد',
  'سرهنگ دوم', 'سرهنگ', 'سرتیپ دوم', 'سرتیپ', 'سرلشکر',
  'کارمند', 'مهندس', 'سایر'
];

const EMPTY_FORM = {
  username: '',
  password: '',
  fullName: '',
  role: 'user',
  baseId: '',
  unitId: '',
  phone: '',
  rank: '',
  organizationLevel: '',
};

export function UsersManagement() {
  const { user } = useAuthStore();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [orgLevels, setOrgLevels] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [customRank, setCustomRank] = useState('');
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // بارگذاری داده‌ها
  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchUsers();
      fetchOrg();
      fetchOrgLevels();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await(window.customFetch || window.fetch)('/api/users');
      if (!res.ok) throw new Error('خطا در دریافت لیست کاربران');
      const data = await res.json();
      setUsersList(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrg = async () => {
    try {
      const [basesRes, unitsRes] = await Promise.all([
       (window.customFetch || window.fetch)('/api/org/bases'),
       (window.customFetch || window.fetch)('/api/org/units')
      ]);
      const basesData = await basesRes.json();
      const unitsData = await unitsRes.json();
      setBases(Array.isArray(basesData) ? basesData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrgLevels = async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/metadata/org-levels');
      if (res.ok) {
        const data = await res.json();
        setOrgLevels(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // حذف کاربر
  const handleDeleteUser = async (id: number) => {
    const userToDelete = usersList.find((u: any) => u.id === id);
    if (!confirm(`آیا از حذف کاربر "${userToDelete?.fullName}" اطمینان دارید؟`)) return;
    try {
      const res = await(window.customFetch || window.fetch)(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('کاربر با موفقیت حذف شد');
        await fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در حذف کاربر');
      }
    } catch (error) {
      toast.error('خطا در اتصال به سرور');
    }
  };

  // مدیریت فرم
  const handleEditUserClick = (u: any) => {
    setEditingUserId(u.id);
    setFormData({
      username: u.username || '',
      password: '',
      fullName: u.fullName || '',
      role: u.role || 'user',
      baseId: u.baseId ? String(u.baseId) : '',
      unitId: u.unitId ? String(u.unitId) : '',
      phone: u.phone || '',
      rank: u.rank || '',
      organizationLevel: u.organizationLevel || '',
    });
    setShowModal(true);
  };

  const handleAddNewUser = () => {
    setEditingUserId(null);
    setFormData({ ...EMPTY_FORM });
    setShowRankDropdown(false);
    setCustomRank('');
    setShowModal(true);
  };

  const handleRankSelect = (rank: string) => {
    setFormData({ ...formData, rank });
    setShowRankDropdown(false);
    setCustomRank('');
  };

  const handleCustomRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRank(e.target.value);
    setFormData({ ...formData, rank: e.target.value });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ ...EMPTY_FORM });
    setShowRankDropdown(false);
  };

  // ذخیره کاربر
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!formData.fullName.trim()) {
        toast.error('نام و نام خانوادگی الزامی است');
        setSaving(false);
        return;
      }
      if (!formData.username.trim()) {
        toast.error('نام کاربری الزامی است');
        setSaving(false);
        return;
      }
      if (!editingUserId && !formData.password.trim()) {
        toast.error('رمز عبور الزامی است');
        setSaving(false);
        return;
      }

      const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
      const method = editingUserId ? 'PUT' : 'POST';

      const payload: any = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        role: formData.role,
        phone: formData.phone || null,
        rank: formData.rank || null,
        organizationLevel: formData.organizationLevel || null,
      };

      if (formData.baseId) payload.baseId = parseInt(formData.baseId);
      else payload.baseId = null;

      if (formData.unitId) payload.unitId = parseInt(formData.unitId);
      else payload.unitId = null;

      if (formData.password.trim()) payload.password = formData.password.trim();

      const res = await(window.customFetch || window.fetch)(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(editingUserId ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت ایجاد شد');
        handleCloseModal();
        await fetchUsers();
      } else {
        let errorMsg = responseData.error || responseData.message || 'خطا در ذخیره کاربر';
        if (res.status === 409) errorMsg = 'این نام کاربری قبلاً ثبت شده است';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('خطا در اتصال به سرور');
    } finally {
      setSaving(false);
    }
  };

  // فیلترها
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesLevel = filterLevel === 'all' || u.organizationLevel === filterLevel;
    return matchesSearch && matchesRole && matchesLevel;
  });

  // توابع کمکی
  const getUnitDisplayName = (unitId: number | null) => {
    if (!unitId) return '-';
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '-';
    const base = bases.find(b => b.id === unit.baseId);
    return base ? `${base.name} / ${unit.name}` : unit.name;
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500'];
    const index = (name || 'کاربر').length % colors.length;
    return colors[index];
  };

  const getRoleBadge = (role: string) => {
    if (role === 'superadmin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Crown size={12} className="text-amber-500" />
          مدیر کل
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        <UserIcon2 size={12} />
        کاربر
      </span>
    );
  };

  const getLevelLabel = (level?: string | null) => {
    if (!level) return '-';
    const labels: Record<string, string> = { 'آجا': 'آجا', 'نیرو': 'نیرو', 'رده': 'رده' };
    return labels[level] || level;
  };

  // بررسی دسترسی
  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Shield size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-700">عدم دسترسی</h2>
        <p className="text-gray-400 mt-2">فقط مدیر کل به این بخش دسترسی دارد.</p>
      </div>
    );
  }

  const levelOptions = orgLevels.map(l => ({ value: l.name, label: l.name }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-200/50">
              <UsersIcon size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">مدیریت کاربران</h2>
              <p className="text-gray-500 text-sm mt-0.5">مدیریت کاربران سیستم و تعیین دسترسی‌ها</p>
            </div>
          </div>
        </div>
        <button onClick={handleAddNewUser} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-200/50">
          <UserPlus size={18} /> افزودن کاربر جدید
        </button>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><UsersIcon size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-400">کل کاربران</p><p className="text-2xl font-bold text-gray-800">{usersList.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><Crown size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-400">مدیران کل</p><p className="text-2xl font-bold text-amber-600">{usersList.filter(u => u.role === 'superadmin').length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg"><UserCheck size={20} className="text-green-600" /></div>
          <div><p className="text-xs text-gray-400">کاربران عادی</p><p className="text-2xl font-bold text-green-600">{usersList.filter(u => u.role === 'user').length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg"><Building2 size={20} className="text-purple-600" /></div>
          <div><p className="text-xs text-gray-400">سطوح سازمانی</p><p className="text-2xl font-bold text-purple-600">{orgLevels.length}</p></div>
        </div>
      </div>

      {/* فیلترها */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="جستجو در نام، نام کاربری، تلفن، درجه..." className="w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all bg-gray-50/50 focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
          </div>
          <select className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[140px]" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">همه نقش‌ها</option><option value="superadmin">مدیر کل</option><option value="user">کاربر</option>
          </select>
          <div className="min-w-[180px]">
            <SearchableSelect options={[{ value: 'all', label: 'همه سطوح' }, ...levelOptions]} value={filterLevel} onChange={(val) => setFilterLevel(String(val) || 'all')} placeholder="انتخاب سطح سازمانی..." />
          </div>
          <button onClick={() => { setSearchTerm(''); setFilterRole('all'); setFilterLevel('all'); toast.success('فیلترها پاک شدند'); }} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm flex items-center gap-2"><Filter size={16} /> پاک کردن</button>
        </div>
        {searchTerm && <div className="text-xs text-gray-400 mt-2 mr-1">{filteredUsers.length} نتیجه یافت شد</div>}
      </div>

      {/* جدول کاربران */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gradient-to-r from-gray-50 to-white border-b">
              <tr>
                <th className="px-4 py-3.5 font-semibold text-gray-600 text-center w-12">#</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600">نام و نام خانوادگی</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600">نام کاربری</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600">درجه / سمت</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600">سطح سازمانی</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600">یگان</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 text-center">نقش</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><RefreshCw size={28} className="animate-spin mx-auto mb-3 text-gray-300" /><p className="text-sm">در حال بارگذاری کاربران...</p></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><UsersIcon size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-medium text-gray-500">هیچ کاربری یافت نشد</p></td></tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(u.fullName || 'کاربر')}`}>{(u.fullName || '?').charAt(0)}</div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{u.fullName || 'نامشخص'}</span>
                          {u.phone && <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={11} />{u.phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm" dir="ltr">{u.username || '-'}</td>
                    <td className="px-4 py-3">{u.rank ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">{u.rank}</span> : <span className="text-gray-400 text-xs">-</span>}</td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-600">{getLevelLabel(u.organizationLevel)}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.unitId ? getUnitDisplayName(u.unitId) : '-'}</td>
                    <td className="px-4 py-3 text-center">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleEditUserClick(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="ویرایش کاربر"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" title="حذف کاربر"><Trash2 size={16} /></button>
                        {u.id === user?.id && <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">خودتان</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-gray-50/50 text-xs text-gray-400 flex justify-between">
          <span>تعداد کاربران: {filteredUsers.length}</span>
          <span>آخرین بروزرسانی: {new Date().toLocaleString('fa-IR')}</span>
        </div>
      </div>

      {/* مودال افزودن/ویرایش کاربر */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">{editingUserId ? <Edit size={18} className="text-purple-600" /> : <UserPlus size={18} className="text-purple-600" />}</div>
                <div><h3 className="font-bold text-gray-800">{editingUserId ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</h3><p className="text-xs text-gray-500">{editingUserId ? 'تغییر اطلاعات کاربر' : 'ثبت کاربر جدید در سیستم'}</p></div>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4" autoComplete="off">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm" placeholder="نام و نام خانوادگی" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نام کاربری <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm" dir="ltr" placeholder="نام کاربری" autoComplete="new-password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{editingUserId ? 'رمز عبور (اختیاری)' : 'رمز عبور'} {!editingUserId && <span className="text-red-500">*</span>}</label>
                  <input required={!editingUserId} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm" dir="ltr" placeholder={editingUserId ? 'برای عدم تغییر خالی بگذارید' : 'رمز عبور'} autoComplete="new-password" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">درجه / سمت</label>
                  <div className="relative">
                    <input type="text" value={formData.rank} onChange={(e) => { setFormData({ ...formData, rank: e.target.value }); setCustomRank(e.target.value); }} placeholder="درجه را وارد یا انتخاب کنید..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm pl-8" autoComplete="off" />
                    <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowRankDropdown(!showRankDropdown)}><ChevronDown size={18} /></button>
                  </div>
                  {showRankDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {DEFAULT_RANKS.map((rank) => (
                        <button key={rank} type="button" className="w-full text-right px-3 py-2 hover:bg-purple-50 text-sm transition-colors flex items-center justify-between" onClick={() => handleRankSelect(rank)}>
                          <span>{rank}</span>{formData.rank === rank && <span className="text-purple-600">✓</span>}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 px-3 py-2">
                        <input type="text" placeholder="درجه سفارشی..." value={customRank} onChange={handleCustomRankChange} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none" onClick={(e) => e.stopPropagation()} autoComplete="off" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">سطح سازمانی</label>
                  <SearchableSelect options={levelOptions} value={formData.organizationLevel} onChange={(val) => setFormData({ ...formData, organizationLevel: val ? String(val) : '' })} placeholder="انتخاب سطح سازمانی..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">پایگاه</label>
                  <select value={formData.baseId} onChange={e => setFormData({ ...formData, baseId: e.target.value, unitId: '' })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white text-sm">
                    <option value="">بدون پایگاه</option>
                    {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {formData.baseId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">یگان تابعه</label>
                    <select value={formData.unitId} onChange={e => setFormData({ ...formData, unitId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white text-sm">
                      <option value="">بدون یگان</option>
                      {units.filter(u => u.baseId === parseInt(formData.baseId)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">تلفن تماس</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نقش کاربری <span className="text-red-500">*</span></label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white text-sm">
                    <option value="user">کاربر عادی</option>
                    <option value="superadmin">مدیر کل</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">{formData.role === 'superadmin' ? 'دسترسی کامل به تمام بخش‌های سیستم' : 'دسترسی محدود به بخش‌های مربوط به یگان'}</p>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all duration-200">انصراف</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-200/50 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <><span className="animate-spin">⏳</span>در حال ذخیره...</> : <><Save size={16} />{editingUserId ? 'ذخیره تغییرات' : 'ایجاد کاربر'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}