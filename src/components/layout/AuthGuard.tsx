// src/components/layout/AuthGuard.tsx
// محافظت از مسیرها با احراز هویت

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useSecurityStore } from '../../store';
import { Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useAuthStore();
  const { lockTimerMinutes, isLocked, setLocked } = useSecurityStore();
  const location = useLocation();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  // قفل خودکار صفحه
  React.useEffect(() => {
    if (!user || lockTimerMinutes <= 0) return;

    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeout);
      if (!isLocked) {
        timeout = setTimeout(() => {
          setLocked(true);
        }, lockTimerMinutes * 60 * 1000);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(name => document.removeEventListener(name, resetTimer));
    };
  }, [user, lockTimerMinutes, isLocked, setLocked]);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLocked) {
    const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      
     (window.customFetch || window.fetch)('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password })
      })
        .then(r => r.json())
        .then(data => {
          if (data.token) {
            // 🟢 ریست پرچم ۴۰۱ + ذخیره توکن جدید + بروزرسانی state کاربر
            (window as any)._sessionExpiredHandled = false;
            useAuthStore.setState({ token: data.token, user: data.user || user });
            setLocked(false);
            setError('');
            setPassword('');
            window.location.reload();
          } else {
            setError('رمز عبور اشتباه است');
          }
        })
        .catch(() => setError('خطا در اتصال به سرور'));
    };

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">صفحه قفل شده</h2>
          <p className="text-gray-500 text-sm">
            کاربر {user.fullName}، لطفاً رمز عبور خود را وارد کنید.
          </p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input 
                type="password"
                placeholder="رمز عبور..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              بازگشایی
            </button>
            <button 
              type="button" 
              onClick={() => { setLocked(false); useAuthStore.getState().logout(); }}
              className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
            >
              خروج از حساب کاربری
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}