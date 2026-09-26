// src/components/auth/ResetPasswordModal.tsx
// مودال بازنشانی محلی و امن رمز عبور در حالت آفلاین (بدون نیاز به اینترنت یا ایمیل)

import React, { useState } from 'react';
import { X, KeyRound, Shield, CheckCircle2, AlertTriangle, Eye, EyeOff, Lock, User, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUsername?: string;
  onResetSuccess?: (username: string) => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  defaultUsername = '',
  onResetSuccess
}: ResetPasswordModalProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('نام کاربری الزامی است');
      return;
    }

    if (!recoveryKey.trim()) {
      setError('کلید بازیابی اضطراری الزامی است');
      return;
    }

    if (newPassword.length < 6) {
      setError('رمز عبور جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('رمز عبور جدید با تکرار آن یکسان نیست');
      return;
    }

    setLoading(true);

    try {
      const res = await (window.customFetch || window.fetch)('/api/auth/reset-password-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          recoveryKey: recoveryKey.trim(),
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در بازنشانی رمز عبور');
      }

      setSuccess(true);
      toast.success('رمز عبور با موفقیت بازنشانی شد');
      if (onResetSuccess) {
        onResetSuccess(username.trim());
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'خطا در فرآیند بازنشانی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <KeyRound size={22} className="text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">بازنشانی محلی رمز عبور</h3>
              <p className="text-white/70 text-xs mt-0.5">ویژه سیستم‌های آفلاین و ایزوله</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info box explaining offline reset */}
        <div className="p-4 bg-blue-50/70 border-b border-blue-100 text-xs text-blue-800 flex gap-2.5 items-start">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            با توجه به اینکه این سامانه در بستر <strong>آفلاین و شبکه محلی</strong> کار می‌کند، بازنشانی رمز از طریق <strong>کلید بازیابی اضطراری سیستم (Master Recovery Key)</strong> انجام می‌شود. در صورت عدم اطلاع، کلید بازیابی را از مدیر ارشد سیستم جویا شوید.
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-800">رمز عبور با موفقیت بازنشانی شد!</h4>
              <p className="text-xs text-gray-500">اکنون می‌توانید با رمز جدید وارد سامانه شوید.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  نام کاربری <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="نام کاربری مورد نظر..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-gray-50/50 focus:bg-white transition-all font-mono"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                </div>
              </div>

              {/* Master Recovery Key */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>کلید بازیابی اضطراری <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-gray-400 font-normal">کلید امنیتی سیستم</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    required
                    placeholder="مثال: DANA-ADMIN-SECURE-2026"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-gray-50/50 focus:bg-white transition-all font-mono font-bold text-purple-700"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={17} />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  رمز عبور جدید <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="حداقل ۶ کاراکتر"
                    className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-gray-50/50 focus:bg-white transition-all"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  تکرار رمز عبور جدید <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="تکرار رمز عبور جدید"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-gray-50/50 focus:bg-white transition-all"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'در حال بازنشانی...' : 'تایید و بازنشانی رمز'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordModal;
