// src/components/auth/OfflineCaptcha.tsx
// کامپوننت کپچای حرفه‌ای، زیبا، آفلاین با ۳ سناریوی تعاملی

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck, Sparkles, Layers, SlidersHorizontal, Calculator } from 'lucide-react';

export type CaptchaScenario = 'math' | 'text' | 'slider';

interface OfflineCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

export function OfflineCaptcha({ onVerify, className = '' }: OfflineCaptchaProps) {
  const [scenario, setScenario] = useState<CaptchaScenario>('math');
  const [isVerified, setIsVerified] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Math State
  const [mathProblem, setMathProblem] = useState({ text: '', answer: 0 });
  const mathCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Text State
  const [textCode, setTextCode] = useState('');
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Slider State
  const [targetPosition, setTargetPosition] = useState(65);
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Helper to convert English digits to Persian
  const toPersianDigits = (num: number | string) => {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
  };

  // Helper to convert Persian digits to English for evaluation
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  };

  // -------------------------------------------------------------
  // ۱. تولید چالش ریاضی (Scenario 1)
  // -------------------------------------------------------------
  const generateMathChallenge = useCallback(() => {
    setIsVerified(false);
    onVerify(false);
    setUserInput('');
    setErrorMessage('');

    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let num1 = 0;
    let num2 = 0;
    let answer = 0;

    if (op === '+') {
      num1 = Math.floor(Math.random() * 20) + 5;
      num2 = Math.floor(Math.random() * 20) + 3;
      answer = num1 + num2;
    } else if (op === '-') {
      num1 = Math.floor(Math.random() * 30) + 15;
      num2 = Math.floor(Math.random() * 14) + 1;
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * 8) + 2;
      answer = num1 * num2;
    }

    const questionText = `${toPersianDigits(num1)} ${op} ${toPersianDigits(num2)} = ؟`;
    setMathProblem({ text: questionText, answer });

    // رسم روی بوم
    setTimeout(() => {
      const canvas = mathCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // پس‌زمینه
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // خطوط پارازیت و نویز
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 220, 0.25)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.bezierCurveTo(
          Math.random() * width, Math.random() * height,
          Math.random() * width, Math.random() * height,
          Math.random() * width, Math.random() * height
        );
        ctx.stroke();
      }

      // دانه‌های نویز
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 200, 0.4)`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // متن سوال
      ctx.font = 'bold 20px Vazirmatn, Tahoma, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(questionText, width / 2, height / 2);
    }, 50);
  }, [onVerify]);

  // -------------------------------------------------------------
  // ۲. تولید کد اعوجاج‌یافته تصویری (Scenario 2)
  // -------------------------------------------------------------
  const generateTextChallenge = useCallback(() => {
    setIsVerified(false);
    onVerify(false);
    setUserInput('');
    setErrorMessage('');

    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTextCode(code);

    setTimeout(() => {
      const canvas = textCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // پس‌زمینه
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // خطوط نویز
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 60%, 60%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.bezierCurveTo(
          Math.random() * width, Math.random() * height,
          Math.random() * width, Math.random() * height,
          Math.random() * width, Math.random() * height
        );
        ctx.stroke();
      }

      // رسم هر حرف با چرخش و افکت
      const charWidth = width / (code.length + 1);
      for (let i = 0; i < code.length; i++) {
        ctx.save();
        const x = (i + 0.8) * charWidth;
        const y = height / 2 + (Math.random() * 8 - 4);
        const angle = (Math.random() - 0.5) * 0.45; // چرخش زاویه‌ای

        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `bold ${Math.floor(Math.random() * 6 + 22)}px Arial, sans-serif`;
        ctx.fillStyle = `hsl(${Math.random() * 260 + 20}, 75%, 35%)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
      }

      // پاشش دانه‌ها
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 200, 0.5)`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 50);
  }, [onVerify]);

  // -------------------------------------------------------------
  // ۳. پازل اسلایدر (Scenario 3)
  // -------------------------------------------------------------
  const generateSliderChallenge = useCallback(() => {
    setIsVerified(false);
    onVerify(false);
    setSliderValue(0);
    setErrorMessage('');
    // موقعیت تصادفی هدف بین ۳۵٪ تا ۸۵٪
    const newTarget = Math.floor(Math.random() * 50) + 35;
    setTargetPosition(newTarget);
  }, [onVerify]);

  // راه‌اندازی بر اساس سناریو
  const reloadCurrentScenario = useCallback(() => {
    if (scenario === 'math') {
      generateMathChallenge();
    } else if (scenario === 'text') {
      generateTextChallenge();
    } else {
      generateSliderChallenge();
    }
  }, [scenario, generateMathChallenge, generateTextChallenge, generateSliderChallenge]);

  useEffect(() => {
    reloadCurrentScenario();
  }, [scenario, reloadCurrentScenario]);

  // تایید ورودی متنی یا عددی
  const handleVerifyInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) {
      setErrorMessage('لطفاً پاسخ را وارد کنید');
      return;
    }

    if (scenario === 'math') {
      const cleanInput = toEnglishDigits(userInput.trim());
      if (parseInt(cleanInput, 10) === mathProblem.answer) {
        setIsVerified(true);
        setErrorMessage('');
        onVerify(true);
      } else {
        setIsVerified(false);
        onVerify(false);
        setErrorMessage('پاسخ اشتباه است. دوباره تلاش کنید.');
        generateMathChallenge();
      }
    } else if (scenario === 'text') {
      if (userInput.trim().toUpperCase() === textCode.toUpperCase()) {
        setIsVerified(true);
        setErrorMessage('');
        onVerify(true);
      } else {
        setIsVerified(false);
        onVerify(false);
        setErrorMessage('کد امنیتی اشتباه است. دوباره تلاش کنید.');
        generateTextChallenge();
      }
    }
  };

  // بررسی وضعیت اسلایدر در رهاسازی
  const handleSliderRelease = () => {
    setIsDragging(false);
    const tolerance = 6; // ۶ درصد خطا مجاز است
    if (Math.abs(sliderValue - targetPosition) <= tolerance) {
      setSliderValue(targetPosition);
      setIsVerified(true);
      setErrorMessage('');
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
      setErrorMessage('قطعه پازل در جای صحیح قرار نگرفت. دوباره بکشید.');
      setSliderValue(0);
    }
  };

  return (
    <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
      isVerified 
        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' 
        : 'bg-gray-50/80 border-gray-200/90 hover:border-gray-300'
    } ${className}`}>
      
      {/* هدر کنترل کپچا و تغییر سناریو */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-200/60">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className={isVerified ? 'text-emerald-600' : 'text-purple-600'} />
          <span className="text-xs font-bold text-gray-700">
            {isVerified ? 'احراز امنیتی تایید شد' : 'کپچای امنیتی آفلاین'}
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mr-1 animate-pulse">
              <CheckCircle2 size={12} />
              معتبر
            </span>
          )}
        </div>

        {/* دکمه‌های کنترل و تعویض حالت */}
        <div className="flex items-center gap-1">
          <div className="flex bg-gray-200/60 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => { setScenario('math'); }}
              title="چالش محاسباتی"
              className={`p-1 rounded-md text-xs transition-colors ${scenario === 'math' ? 'bg-white shadow-xs text-purple-700 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Calculator size={13} />
            </button>
            <button
              type="button"
              onClick={() => { setScenario('text'); }}
              title="کد امنیتی تصویری"
              className={`p-1 rounded-md text-xs transition-colors ${scenario === 'text' ? 'bg-white shadow-xs text-purple-700 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Layers size={13} />
            </button>
            <button
              type="button"
              onClick={() => { setScenario('slider'); }}
              title="پازل اسلایدر"
              className={`p-1 rounded-md text-xs transition-colors ${scenario === 'slider' ? 'bg-white shadow-xs text-purple-700 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={reloadCurrentScenario}
            title="تولید مجدد چالش"
            className="p-1 text-gray-400 hover:text-purple-600 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* محتوای سناریوی ۱: چالش ریاضی */}
      {scenario === 'math' && !isVerified && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white flex-shrink-0">
              <canvas
                ref={mathCanvasRef}
                width={150}
                height={40}
                className="block select-none"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  setErrorMessage('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerifyInput();
                  }
                }}
                placeholder="حاصل؟"
                className="w-full text-center px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => handleVerifyInput()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center shrink-0"
            >
              تایید
            </button>
          </div>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Sparkles size={11} className="text-purple-500" />
            حاصل عبارت فوق را به عدد در کادر وارد و تایید کنید.
          </p>
        </div>
      )}

      {/* محتوای سناریوی ۲: کد تصویری متنی */}
      {scenario === 'text' && !isVerified && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white flex-shrink-0">
              <canvas
                ref={textCanvasRef}
                width={150}
                height={40}
                className="block select-none"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                dir="ltr"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value.toUpperCase());
                  setErrorMessage('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerifyInput();
                  }
                }}
                placeholder="کد ۵ حرفی"
                maxLength={6}
                className="w-full text-center tracking-widest font-mono font-bold px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white uppercase"
              />
            </div>
            <button
              type="button"
              onClick={() => handleVerifyInput()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center shrink-0"
            >
              تایید
            </button>
          </div>
          <p className="text-[10px] text-gray-400">حروف و اعداد تصویر بالا را وارد کنید (بدون حساسیت به حروف کوچک/بزرگ).</p>
        </div>
      )}

      {/* محتوای سناریوی ۳: پازل اسلایدر تعاملی */}
      {scenario === 'slider' && !isVerified && (
        <div className="space-y-2.5">
          {/* جعبه بوم پازل */}
          <div className="relative h-14 bg-gradient-to-r from-purple-100 via-indigo-50 to-blue-100 rounded-xl border border-gray-200/90 overflow-hidden select-none">
            {/* شیارهای پس‌زمینه */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:12px_12px]" />
            
            {/* هدف جای خالی (Target slot) */}
            <div 
              className="absolute top-2 w-10 h-10 border-2 border-dashed border-purple-500 bg-white/60 rounded-lg flex items-center justify-center backdrop-blur-xs transition-all"
              style={{ left: `${targetPosition}%` }}
            >
              <div className="w-5 h-5 rounded-md bg-purple-200/70" />
            </div>

            {/* قطعه متحرک پازل */}
            <div 
              className={`absolute top-2 w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-lg shadow-md flex items-center justify-center transition-transform ${isDragging ? 'scale-105 shadow-lg' : ''}`}
              style={{ left: `calc(${sliderValue}% * 0.85)` }}
            >
              <ShieldCheck size={18} />
            </div>
          </div>

          {/* اسلایدر کشیدنی */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
          <p className="text-[10px] text-gray-500 text-center">اسلایدر را بکشید تا قطعه پازل در جای خالی قرار گیرد.</p>
        </div>
      )}

      {/* حالت احراز موفقیت‌آمیز */}
      {isVerified && (
        <div className="flex items-center justify-between p-2 bg-emerald-100/70 text-emerald-800 rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>هویت شما به‌عنوان کاربر واقعی با موفقیت تایید شد.</span>
          </div>
          <button
            type="button"
            onClick={reloadCurrentScenario}
            className="text-[11px] text-emerald-700 hover:text-emerald-900 underline mr-2"
          >
            تغییر
          </button>
        </div>
      )}

      {/* پیام خطا */}
      {errorMessage && (
        <div className="text-[11px] text-red-500 mt-1 font-medium flex items-center gap-1 animate-shake">
          <span>⚠️</span> {errorMessage}
        </div>
      )}
    </div>
  );
}

export default OfflineCaptcha;
