// src/pages/Login.tsx
// صفحه ورود به سیستم — فشرده، زیبا و بهینه با کپچای زنده و تولتیپ اطلاعات توسعه‌دهنده بدون ریرندر

import React, { useState, useCallback } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, KeyRound, User, Shield, Eye, EyeOff, Info } from 'lucide-react';
import { OfflineCaptcha } from '../components/auth/OfflineCaptcha';
import { ResetPasswordModal } from '../components/auth/ResetPasswordModal';
import toast from 'react-hot-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const { siteLogo, systemName, loginTitle } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCaptchaVerify = useCallback((valid: boolean) => {
    setIsCaptchaVerified(valid);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isCaptchaVerified) {
      const msg = 'لطفاً ابتدا چالش امنیتی (کپچا) را تکمیل کنید';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await (window.customFetch || window.fetch)('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'نام کاربری یا رمز عبور اشتباه است');
      }

      if (data.user && data.token) {
        try {
          const { useSecurityStore } = await import('../store');
          useSecurityStore.getState().setLocked(false);
          (window as any)._sessionExpiredHandled = false;
        } catch { /* noop */ }
        login(data.user, data.token);
        toast.success(`خوش آمدید ${data.user.fullName}`, {
          icon: '👋',
          duration: 3000,
        });
        
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('اطلاعات ورود نامعتبر است');
        toast.error('اطلاعات ورود نامعتبر است');
      }
    } catch (err: any) {
      const message = err.message || 'نام کاربری یا رمز عبور اشتباه است';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin(e as any);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-3 font-sans relative overflow-hidden"
      style={{ background: 'var(--surface-page)' }}
    >
      {/* عناصر تزئینی پس‌زمینه */}
      <div 
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--brand-gradient)' }}
      />
      <div 
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: 'var(--brand-gradient)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(var(--border-main) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div 
        className="rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative z-10 animate-fade-in"
        style={{
          backgroundColor: 'var(--surface-main)',
          border: '1px solid var(--border-main)',
        }}
      >
        {/* هدر فشرده و شیک با گرادیان برند */}
        <div className="sidebar-header py-4 px-5 text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative flex items-center justify-center gap-2.5">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="لوگو"
                className="w-10 h-10 rounded-xl object-cover bg-white shadow-sm border border-white/40"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-tr from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-sm border border-white/30 backdrop-blur-xs relative">
                <BookOpen className="text-white" size={20} />
                <Sparkles className="text-amber-300 absolute -top-1 -right-1 animate-pulse" size={12} />
              </div>
            )}
            <div className="text-right">
              <h1 className="text-base font-bold text-white leading-tight">
                {systemName || 'سامانه مدیریت دانش و نظام مسائل'}
              </h1>
              <p className="text-white/80 text-[11px] mt-0.5">سامانه جامع DANA</p>
            </div>
          </div>
        </div>
        
        {/* بدنه فرم */}
        <div className="p-4 sm:p-5">
          <form onSubmit={handleLogin} className="space-y-3">
            {/* عنوان فرم */}
            <div className="text-center">
              <h2 className="text-base font-bold text-strong">{loginTitle || 'ورود به سیستم'}</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>اطلاعات حساب کاربری خود را وارد فرمایید</p>
            </div>

            {/* خطا */}
            {error && (
              <div className="bg-red-50/90 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-200 flex items-center gap-1.5">
                <span className="text-red-500">⚠️</span>
                {error}
              </div>
            )}
            
            {/* نام کاربری */}
            <div>
              <div className="relative">
                <input 
                  type="text"
                  dir="ltr"
                  className="input-theme w-full pl-8 pr-3 py-2 text-xs font-medium"
                  placeholder="نام کاربری"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  autoFocus
                />
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} size={16} />
              </div>
            </div>

            {/* رمز عبور */}
            <div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  className="input-theme w-full pl-8 pr-8 py-2 text-xs font-medium"
                  placeholder="رمز عبور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                />
                <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} size={16} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* کپچای امنیتی فشرده و زنده */}
            <div>
              <OfflineCaptcha
                onVerify={handleCaptchaVerify}
              />
            </div>

            {/* به خاطر سپردن و بازیابی رمز عبور */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: 'var(--brand-600)' }}
                />
                مرا به خاطر بسپار
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="font-medium hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--brand-600)' }}
              >
                فراموشی رمز عبور؟
              </button>
            </div>

            {/* دکمه ورود */}
            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full font-semibold py-2.5 text-xs flex justify-center items-center gap-2 transition-all cursor-pointer ${
                !isCaptchaVerified ? 'opacity-85' : 'shadow-md shadow-purple-200/50'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال ورود...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  ورود به سیستم
                </>
              )}
            </button>
          </form>

          {/* مودال بازنشانی محلی رمز عبور در حالت آفلاین */}
          <ResetPasswordModal
            isOpen={showResetModal}
            onClose={() => setShowResetModal(false)}
            defaultUsername={username}
            onResetSuccess={(resetUser) => {
              setUsername(resetUser);
              setPassword('');
            }}
          />

          {/* فوتر مینیمال با آیکون i کاملاً استاتیک با هوور CSS بدون هیچ ریرندر یا ایونت فرم */}
          <div className="mt-3 pt-2 border-t divider-soft flex items-center justify-between text-[11px]">
            <span className="text-[10px] opacity-65" style={{ color: 'var(--text-faint)' }}>
              سامانه آفلاین دانا
            </span>

            {/* اطلاعات توسعه‌دهنده با Pure CSS Hover بدون هیچ دستکاری در State یا DOM */}
            <div className="relative group inline-flex items-center">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200"
                title="درباره توسعه‌دهنده"
              >
                <Info size={12} />
              </div>

              {/* Tooltip Popup Pure CSS Hover */}
              <div 
                className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto absolute bottom-full left-0 mb-2 w-64 bg-[#1e293b] text-white rounded-xl shadow-2xl p-3 z-50 text-right border border-slate-700"
              >
                <div className="space-y-1.5 text-[11px]">
                  <p className="font-bold text-blue-400 text-xs border-b border-slate-700/80 pb-1.5">
                    طراحی و توسعه توسط علیرضا لباف
                  </p>
                  <div className="flex items-center justify-between text-slate-300 pt-0.5">
                    <span className="text-[10px] text-slate-400">تماس:</span>
                    <a href="tel:09196600545" dir="ltr" className="hover:text-blue-300 font-mono text-xs">
                      📱 ۰۹۱۹۶۶۰۰۵۴۵
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[10px] text-slate-400">ایمیل:</span>
                    <a href="mailto:alirezalf@gmail.com" dir="ltr" className="hover:text-blue-300 font-mono text-[11px]">
                      ✉️ alirezalf@gmail.com
                    </a>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/80 text-[10px] text-slate-400 text-center">
                    © 2026 DANA - تمامی حقوق محفوظ است
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
