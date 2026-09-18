// src/pages/Profile.tsx
// صفحه پروفایل کاربر

import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { 
  Save, 
  User as UserIcon, 
  Lock, 
  Phone, 
  Shield,
  UserCog,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  User,
  AlertCircle,
  Building2,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Profile() {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    password: '',
    phone: user?.phone || '',
    rank: user?.rank || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string }>({});

  // ============================================
  // ذخیره تغییرات
  // ============================================

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // اعتبارسنجی رمز عبور
    if (formData.password && formData.password.length < 6) {
      setErrors({ password: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      // ساخت payload
      const payload: any = {
        username: user.username,
        fullName: formData.fullName,
        role: user.role,
        baseId: user.baseId,
        unitId: user.unitId,
        phone: formData.phone || null,
        rank: formData.rank || null,
      };
      
      // اگر رمز عبور جدید وارد شده، آن را اضافه کن
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }
      
      // ارسال درخواست به سرور
      const res = await(window.customFetch || window.fetch)(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();
      
      if (res.ok && responseData.success) {
        // به‌روزرسانی اطلاعات کاربر در store
        const updatedUser = {
          ...user,
          fullName: responseData.data?.fullName || formData.fullName,
          phone: responseData.data?.phone || formData.phone,
          rank: responseData.data?.rank || formData.rank,
        };
        
        updateUser(updatedUser);
        
        // به‌روزرسانی فرم
        setFormData({
          fullName: updatedUser.fullName,
          password: '',
          phone: updatedUser.phone || '',
          rank: updatedUser.rank || '',
        });
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        toast.success('✅ پروفایل با موفقیت بروزرسانی شد');
      } else {
        toast.error(responseData.error || '❌ خطا در بروزرسانی پروفایل');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('خطای سرور');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // بازنشانی فرم
  // ============================================

  const handleReset = () => {
    setFormData({
      fullName: user?.fullName || '',
      password: '',
      phone: user?.phone || '',
      rank: user?.rank || '',
    });
    setErrors({});
    toast('فرم بازنشانی شد');
  };

  // اگر کاربر لاگین نکرده
  if (!user) return null;

  // حرف اول نام برای آواتار
  const getInitial = () => {
    return user.fullName?.charAt(0) || '?';
  };

  // رنگ آواتار بر اساس نام
  const getAvatarColor = () => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-amber-500 to-amber-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-pink-500 to-pink-600',
    ];
    const index = (user.fullName?.length || 0) % colors.length;
    return colors[index];
  };

  // دریافت نام سطح سازمانی
  const getLevelLabel = (level?: string | null) => {
    if (!level) return 'تعیین نشده';
    const labels: Record<string, string> = {
      'آجا': 'سطح کلان (آجا)',
      'نیرو': 'سطح میانی (نیرو)',
      'رده': 'سطح اجرایی (رده)',
    };
    return labels[level] || level;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
          <UserCog size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">پروفایل کاربری</h2>
          <p className="text-gray-500 text-sm mt-0.5">مدیریت اطلاعات شخصی</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Header با آواتار */}
        <div className="relative">
          {/* پس‌زمینه گرادیانت */}
          <div className="h-28 bg-gradient-to-r from-blue-500 to-indigo-600 flex flex-col justify-center pr-36">
            <h3 className="text-xl font-bold text-white drop-shadow-lg">
              {user.fullName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-white/80 mt-0.5">
              <Shield size={14} />
              <span>{user.role === 'superadmin' ? 'مدیر کل سیستم' : 'کاربر سیستم'}</span>
            </div>
            {user.organizationLevel && (
              <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                <Building2 size={12} />
                <span>{getLevelLabel(user.organizationLevel)}</span>
              </div>
            )}
          </div>
          
          {/* آواتار */}
          <div className="absolute -bottom-8 right-6">
            <div className={`
              w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor()} 
              flex items-center justify-center text-white text-2xl font-bold 
              border-4 border-white shadow-lg
            `}>
              {getInitial()}
            </div>
          </div>
        </div>

        {/* فرم */}
        <form onSubmit={handleSave} className="pt-10 p-5 space-y-4">
          <div className="space-y-4">
            {/* نام کاربری (غیرقابل تغییر) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">نام کاربری</label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 px-4 py-2.5">
                <User size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-800" dir="ltr">{user.username}</span>
                <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mr-auto">ثابت</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">نام کاربری قابل تغییر نیست</p>
            </div>

            {/* نام و نام خانوادگی */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                نام و نام خانوادگی <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  required 
                  type="text" 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
                  placeholder="نام و نام خانوادگی"
                />
              </div>
            </div>

            {/* درجه / سمت */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                درجه / سمت
              </label>
              <div className="relative">
                <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.rank} 
                  onChange={e => setFormData({...formData, rank: e.target.value})} 
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
                  placeholder="درجه یا سمت سازمانی"
                />
              </div>
            </div>

            {/* تلفن تماس */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">تلفن تماس</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
                  dir="ltr"
                  placeholder="۰۹۱۹۱۲۳۴۵۶۷"
                />
              </div>
            </div>

            {/* تغییر رمز عبور */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <KeyRound size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-gray-800">تغییر رمز عبور</span>
                <span className="text-[10px] text-gray-400">(اختیاری)</span>
              </div>
              
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={formData.password} 
                  onChange={e => {
                    setFormData({...formData, password: e.target.value});
                    if (e.target.value && e.target.value.length < 6) {
                      setErrors({ password: 'حداقل ۶ کاراکتر' });
                    } else {
                      setErrors({});
                    }
                  }} 
                  className="w-full pr-9 pl-9 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
                  dir="ltr"
                  placeholder="رمز عبور جدید"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {errors.password && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-[10px]">
                  <AlertCircle size={12} />
                  <span>{errors.password}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span>🔒 حداقل ۶ کاراکتر</span>
                <span className="w-px h-3 bg-gray-300"></span>
                <span>🔐 شامل حروف و اعداد</span>
              </div>
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2.5">
            <button 
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
            >
              بازنشانی
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  در حال ذخیره...
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 size={16} />
                  ذخیره شد
                </>
              ) : (
                <>
                  <Save size={16} />
                  ذخیره تغییرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* اطلاعات تکمیلی */}
      <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <span>نقش: {user.role === 'superadmin' ? 'مدیر کل' : 'کاربر'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-gray-400" />
            <span>سطح: {getLevelLabel(user.organizationLevel)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span>شناسه: #{user.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}