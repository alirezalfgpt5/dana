// src/pages/Login.tsx
// صفحه ورود به سیستم — با پشتیبانی از سیستم تم

import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, KeyRound, User, Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const { siteLogo, systemName, loginTitle } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await(window.customFetch || window.fetch)('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'نام کاربری یا رمز عبور اشتباه است');
      }

      if (data.user && data.token) {
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
      className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden"
      style={{ background: 'var(--surface-page)' }}
    >
      {/* عناصر تزئینی پس‌زمینه — برند محور */}
      <div 
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--brand-gradient)' }}
      />
      <div 
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: 'var(--brand-gradient)' }}
      />
      <div 
        className="absolute top-1/4 left-1/5 w-24 h-24 border-2 rounded-3xl rotate-12 pointer-events-none opacity-20"
        style={{ borderColor: 'var(--brand-300)' }}
      />
      <div 
        className="absolute bottom-1/4 right-1/6 w-16 h-16 border-2 rounded-full pointer-events-none opacity-20"
        style={{ borderColor: 'var(--brand-300)' }}
      />
      {/* شبکه نقطه‌ای ظریف */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(var(--border-main) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div 
        className="rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 animate-fade-in"
        style={{
          backgroundColor: 'var(--surface-main)',
          border: '1px solid var(--border-main)',
        }}
      >
        {/* هدر با گرادیان برند از تم */}
        <div className="sidebar-header py-7 px-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative flex items-center justify-center gap-3">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="لوگو"
                className="w-14 h-14 rounded-2xl object-cover bg-white shadow-md border-2 border-white/40"
              />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-tr from-white/20 to-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-white/30 backdrop-blur-sm relative">
                <BookOpen className="text-white" size={26} />
                <Sparkles className="text-amber-300 absolute -top-1 -right-1 animate-pulse" size={14} />
              </div>
            )}
            <div className="text-right">
              <h1 className="text-lg font-bold text-white leading-tight">
                {systemName || 'سیستم مدیریت دانش و نظام مسائل'}
              </h1>
              <p className="text-white/70 text-xs mt-0.5">DANA - مدیریت دانش و پژوهش</p>
            </div>
          </div>
        </div>
        
        {/* فرم */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* عنوان فرم */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-strong">{loginTitle || 'ورود به سیستم'}</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>برای ادامه، اطلاعات خود را وارد کنید</p>
            </div>

            {/* خطا */}
            {error && (
              <div className="bg-red-50/80 text-red-600 p-3 rounded-lg text-xs border border-red-200 flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                {error}
              </div>
            )}
            
            {/* نام کاربری */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                نام کاربری
              </label>
              <div className="relative">
                <input 
                  type="text"
                  dir="ltr"
                  className="input-theme w-full pl-9 pr-3 py-2.5 text-sm"
                  placeholder="نام کاربری خود را وارد کنید"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  autoFocus
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} size={18} />
              </div>
            </div>

            {/* رمز عبور */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                رمز عبور
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  className="input-theme w-full pl-9 pr-9 py-2.5 text-sm"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                />
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* گزینه‌های اضافی */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--brand-600)' }}
                />
                مرا به خاطر بسپار
              </label>
              <a href="#" className="font-medium transition-colors" style={{ color: 'var(--brand-600)' }}>
                رمز عبور را فراموش کردم؟
              </a>
            </div>

            {/* دکمه ورود */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full font-semibold py-3 text-sm flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال ورود...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  ورود به سیستم
                </>
              )}
            </button>
          </form>

          {/* بخش نویسنده */}
          <div className="mt-6 pt-4 border-t divider-soft text-center">
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              طراحی و توسعه توسط <span className="font-bold" style={{ color: 'var(--text-muted)' }}>علیرضا لباف</span>
            </p>
            <div className="flex items-center justify-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>
              <a href="tel:09196600545" className="hover:text-blue-500 transition-colors">
                📱 ۰۹۱۹۶۶۰۰۵۴۵
              </a>
              <span className="w-px h-3 bg-gray-300/50"></span>
              <a href="mailto:alirezalf@gmail.com" className="hover:text-blue-500 transition-colors">
                ✉️ alirezalf@gmail.com
              </a>
            </div>
            <p className="text-[10px] opacity-60 mt-2" style={{ color: 'var(--text-faint)' }}>
              © {new Date().getFullYear()} DANA - تمامی حقوق محفوظ است
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
