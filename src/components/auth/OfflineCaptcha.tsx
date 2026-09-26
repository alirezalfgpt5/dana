// src/components/auth/OfflineCaptcha.tsx
// کامپوننت کپچای حرفه‌ای، فشرده و زنده (بدون وابستگی ریرندر به والد، بدون رفرش ناخواسته)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

export type CaptchaScenario = 'math' | 'text' | 'slider';

interface OfflineCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

export function OfflineCaptcha({ onVerify, className = '' }: OfflineCaptchaProps) {
  const [scenario, setScenario] = useState<CaptchaScenario>('math');
  const [isVerified, setIsVerified] = useState(false);
  const [userInput, setUserInput] = useState('');

  // جلوگیری از ایجاد وابستگی ریرندر روی تابع onVerify
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Math State
  const [mathProblem, setMathProblem] = useState({ text: '', answer: 0 });
  const mathCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Text State
  const [textCode, setTextCode] = useState('');
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Slider State
  const [targetPosition, setTargetPosition] = useState(65);
  const [sliderValue, setSliderValue] = useState(0);

  // تبدیل ارقام انگلیسی به فارسی
  const toPersianDigits = (num: number | string) => {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
  };

  // تبدیل ارقام فارسی و عربی به انگلیسی
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  };

  const pickRandomScenario = (): CaptchaScenario => {
    const scenarios: CaptchaScenario[] = ['math', 'text', 'slider'];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  };

  // ۱. چالش ریاضی
  const generateMath = useCallback(() => {
    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let n1 = 0;
    let n2 = 0;
    let ans = 0;

    if (op === '+') {
      n1 = Math.floor(Math.random() * 15) + 3;
      n2 = Math.floor(Math.random() * 15) + 2;
      ans = n1 + n2;
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 20) + 10;
      n2 = Math.floor(Math.random() * 9) + 1;
      ans = n1 - n2;
    } else {
      n1 = Math.floor(Math.random() * 6) + 2;
      n2 = Math.floor(Math.random() * 6) + 2;
      ans = n1 * n2;
    }

    const qText = `${toPersianDigits(n1)} ${op} ${toPersianDigits(n2)} = ؟`;
    setMathProblem({ text: qText, answer: ans });

    setTimeout(() => {
      const canvas = mathCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(99, 102, 241, 0.25)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
        ctx.stroke();
      }

      ctx.font = 'bold 16px Vazirmatn, Tahoma, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(qText, w / 2, h / 2);
    }, 40);
  }, []);

  // ۲. چالش کد متنی تصویری
  const generateText = useCallback(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTextCode(code);

    setTimeout(() => {
      const canvas = textCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(139, 92, 246, 0.3)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }

      const charWidth = w / (code.length + 1);
      for (let i = 0; i < code.length; i++) {
        ctx.save();
        const x = (i + 0.9) * charWidth;
        const y = h / 2 + (Math.random() * 4 - 2);
        const angle = (Math.random() - 0.5) * 0.35;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = '#4338ca';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
      }
    }, 40);
  }, []);

  // ۳. چالش اسلایدر
  const generateSlider = useCallback(() => {
    setSliderValue(0);
    const newTarget = Math.floor(Math.random() * 45) + 40;
    setTargetPosition(newTarget);
  }, []);

  // اجرای سناریوی تصادفی جدید
  const initNewRandomChallenge = useCallback(() => {
    setIsVerified(false);
    onVerifyRef.current(false);
    setUserInput('');

    const nextScenario = pickRandomScenario();
    setScenario(nextScenario);

    if (nextScenario === 'math') {
      generateMath();
    } else if (nextScenario === 'text') {
      generateText();
    } else {
      generateSlider();
    }
  }, [generateMath, generateText, generateSlider]);

  // بارگذاری فقط و فقط یک بار در اولین لود
  useEffect(() => {
    initNewRandomChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // بررسی زنده ورودی ریاضی
  const handleMathChange = (val: string) => {
    setUserInput(val);
    const clean = toEnglishDigits(val.trim());
    if (clean !== '' && parseInt(clean, 10) === mathProblem.answer) {
      setIsVerified(true);
      onVerifyRef.current(true);
    } else {
      if (isVerified) {
        setIsVerified(false);
        onVerifyRef.current(false);
      }
    }
  };

  // بررسی زنده ورودی کد متنی
  const handleTextChange = (val: string) => {
    setUserInput(val.toUpperCase());
    if (val.trim().toUpperCase() === textCode.toUpperCase()) {
      setIsVerified(true);
      onVerifyRef.current(true);
    } else {
      if (isVerified) {
        setIsVerified(false);
        onVerifyRef.current(false);
      }
    }
  };

  // بررسی زنده اسلایدر
  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    if (Math.abs(val - targetPosition) <= 5) {
      setSliderValue(targetPosition);
      setIsVerified(true);
      onVerifyRef.current(true);
    } else if (isVerified) {
      setIsVerified(false);
      onVerifyRef.current(false);
    }
  };

  const handleSliderRelease = () => {
    if (Math.abs(sliderValue - targetPosition) <= 6) {
      setSliderValue(targetPosition);
      setIsVerified(true);
      onVerifyRef.current(true);
    } else {
      setSliderValue(0);
      setIsVerified(false);
      onVerifyRef.current(false);
    }
  };

  return (
    <div
      className={`p-2.5 rounded-xl border transition-all duration-200 ${
        isVerified
          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40'
          : 'bg-gray-50/70 border-gray-200/80 hover:border-gray-300'
      } ${className}`}
    >
      {/* چالش ریاضی: بوم + کادر پاسخ زنده + دکمه رفرش */}
      {scenario === 'math' && (
        <div className="flex items-center gap-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs">
            <canvas ref={mathCanvasRef} width={120} height={34} className="block select-none" />
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => handleMathChange(e.target.value)}
              placeholder="پاسخ؟"
              className={`w-full text-center px-2 py-1.5 text-xs font-bold rounded-lg border outline-none transition-colors ${
                isVerified
                  ? 'border-emerald-500 bg-white text-emerald-700'
                  : 'border-gray-200 focus:border-purple-500 bg-white'
              }`}
            />
            {isVerified && (
              <CheckCircle2
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in"
              />
            )}
          </div>

          <button
            type="button"
            onClick={initNewRandomChallenge}
            title="چالش جدید"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-gray-200/60 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* چالش متنی: تصویر ۴ حرفی + کادر پاسخ زنده + رفرش */}
      {scenario === 'text' && (
        <div className="flex items-center gap-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs">
            <canvas ref={textCanvasRef} width={120} height={34} className="block select-none" />
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              dir="ltr"
              value={userInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="کد تصویر"
              maxLength={4}
              className={`w-full text-center tracking-widest font-mono font-bold px-2 py-1.5 text-xs uppercase rounded-lg border outline-none transition-colors ${
                isVerified
                  ? 'border-emerald-500 bg-white text-emerald-700'
                  : 'border-gray-200 focus:border-purple-500 bg-white'
              }`}
            />
            {isVerified && (
              <CheckCircle2
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in"
              />
            )}
          </div>

          <button
            type="button"
            onClick={initNewRandomChallenge}
            title="چالش جدید"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-gray-200/60 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* چالش اسلایدر فشرده و زیبا */}
      {scenario === 'slider' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 h-8 bg-gradient-to-r from-purple-100/80 via-indigo-50 to-blue-100/80 rounded-lg border border-gray-200/80 overflow-hidden select-none">
              <div
                className="absolute top-1 w-6 h-6 border-2 border-dashed border-purple-500 bg-white/70 rounded-md flex items-center justify-center transition-all"
                style={{ left: `${targetPosition}%` }}
              >
                <div className="w-2.5 h-2.5 rounded-xs bg-purple-300" />
              </div>

              <div
                className={`absolute top-1 w-6 h-6 rounded-md shadow-xs flex items-center justify-center text-white text-[10px] transition-transform ${
                  isVerified
                    ? 'bg-emerald-500 scale-105'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                }`}
                style={{ left: `calc(${sliderValue}% * 0.88)` }}
              >
                {isVerified ? <CheckCircle2 size={13} /> : <ShieldCheck size={13} />}
              </div>
            </div>

            <button
              type="button"
              onClick={initNewRandomChallenge}
              title="چالش جدید"
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-gray-200/60 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      )}

      {/* وضعیت تایید شده با پیام بسیار ظریف و فشرده */}
      {isVerified && (
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-700 font-semibold">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            احراز هویت آفلاین با موفقیت انجام شد
          </span>
          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
            معتبر
          </span>
        </div>
      )}
    </div>
  );
}

export default OfflineCaptcha;
