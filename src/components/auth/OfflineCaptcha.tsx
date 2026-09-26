// src/components/auth/OfflineCaptcha.tsx
// کامپوننت پیشرفته و حرفه‌ای کپچای آفلاین با اسلایدر پازل قطعه‌ای (Jigsaw Slider) و سناریوهای هوشمند

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck, ChevronsRight, Check } from 'lucide-react';

export type CaptchaScenario = 'slider' | 'math' | 'text';

interface OfflineCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

const PIECE_SIZE = 40;
const TAB_R = 7;
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 125;
const PIECE_CANVAS_SIZE = PIECE_SIZE + TAB_R * 2 + 6;

// تابع ایجاد مسیر هندسی قطعه پازل (زبانه بالا و زبانه راست)
function drawPuzzlePiecePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = PIECE_SIZE,
  r: number = TAB_R
) {
  ctx.beginPath();
  ctx.moveTo(x, y);

  // لبه بالا با برآمدگی دایره‌ای
  ctx.lineTo(x + size / 2 - r, y);
  ctx.arc(x + size / 2, y - r + 1, r, Math.PI * 0.8, Math.PI * 0.2, false);
  ctx.lineTo(x + size, y);

  // لبه راست با برآمدگی دایره‌ای
  ctx.lineTo(x + size, y + size / 2 - r);
  ctx.arc(x + size + r - 1, y + size / 2, r, Math.PI * 1.3, Math.PI * 0.7, false);
  ctx.lineTo(x + size, y + size);

  // لبه پایین (صاف)
  ctx.lineTo(x, y + size);

  // لبه چپ (صاف)
  ctx.lineTo(x, y);
  ctx.closePath();
}

export function OfflineCaptcha({ onVerify, className = '' }: OfflineCaptchaProps) {
  const [scenario, setScenario] = useState<CaptchaScenario>('slider');
  const [isVerified, setIsVerified] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [shakeError, setShakeError] = useState(false);

  // جلوگیری از ایجاد وابستگی ریرندر روی تابع onVerify
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Canvas Refs
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mathCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Slider Interactive State
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [targetX, setTargetX] = useState(160);
  const [targetY, setTargetY] = useState(40);

  // Math State
  const [mathProblem, setMathProblem] = useState({ text: '', answer: 0 });

  // Text State
  const [textCode, setTextCode] = useState('');

  // تبدیل ارقام فارسی و عربی به انگلیسی
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  };

  const toPersianDigits = (num: number | string) => {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
  };

  // ۱. تولید چالش اسلایدر پازل فوق‌حرفه‌ای (Jigsaw Graphic)
  const generateSliderPuzzle = useCallback(() => {
    setIsVerified(false);
    onVerifyRef.current(false);
    setDragProgress(0);
    setShakeError(false);

    // مختصات تصادفی اسلات پازل روی تصویر
    const slotX = Math.floor(Math.random() * (CANVAS_WIDTH - PIECE_SIZE - 90)) + 80;
    const slotY = Math.floor(Math.random() * (CANVAS_HEIGHT - PIECE_SIZE - 40)) + 20;
    setTargetX(slotX);
    setTargetY(slotY);

    setTimeout(() => {
      const bgCanvas = bgCanvasRef.current;
      const pieceCanvas = pieceCanvasRef.current;
      if (!bgCanvas || !pieceCanvas) return;

      const bgCtx = bgCanvas.getContext('2d');
      const pieceCtx = pieceCanvas.getContext('2d');
      if (!bgCtx || !pieceCtx) return;

      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;

      // ۱. نقاشی پس‌زمینه گرافیکی مدرن و باکیفیت
      const themes = [
        { c1: '#312e81', c2: '#4338ca', c3: '#6366f1', glow: '#a5b4fc', name: 'Cyber' },
        { c1: '#064e3b', c2: '#047857', c3: '#10b981', glow: '#6ee7b7', name: 'Emerald' },
        { c1: '#1e1b4b', c2: '#701a75', c3: '#ec4899', glow: '#fbcfe8', name: 'Sunset' },
        { c1: '#0f172a', c2: '#1e293b', c3: '#3b82f6', glow: '#93c5fd', name: 'Deep Space' },
      ];
      const theme = themes[Math.floor(Math.random() * themes.length)];

      const grad = bgCtx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, theme.c1);
      grad.addColorStop(0.5, theme.c2);
      grad.addColorStop(1, theme.c3);
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, w, h);

      // الگوهای هندسی و امواج نوری در پس‌زمینه
      for (let i = 0; i < 4; i++) {
        bgCtx.beginPath();
        bgCtx.arc(
          Math.random() * w,
          Math.random() * h,
          Math.random() * 50 + 20,
          0,
          Math.PI * 2
        );
        bgCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08 + 0.02})`;
        bgCtx.fill();
      }

      // شبکه‌بندی دیجیتال و ستاره‌های ریز
      for (let i = 0; i < 35; i++) {
        bgCtx.fillStyle = theme.glow;
        bgCtx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }

      // خطوط وکتور شیک
      bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      bgCtx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, Math.random() * h);
        bgCtx.bezierCurveTo(w * 0.3, Math.random() * h, w * 0.7, Math.random() * h, w, Math.random() * h);
        bgCtx.stroke();
      }

      // واتر‌مارک ظریف امنیتی
      bgCtx.font = 'bold 10px Vazirmatn, Tahoma, sans-serif';
      bgCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      bgCtx.textAlign = 'right';
      bgCtx.fillText('DANA SECURITY SYSTEM', w - 10, h - 8);

      // ۲. برش قطعه پازل برای pieceCanvas (قبل از ایجاد جای خالی روی بوم اصلی)
      pieceCtx.clearRect(0, 0, PIECE_CANVAS_SIZE, PIECE_CANVAS_SIZE);
      pieceCtx.save();
      drawPuzzlePiecePath(pieceCtx, TAB_R, TAB_R, PIECE_SIZE, TAB_R);
      pieceCtx.clip();

      // کپی دقیق پیکسل‌ها از بوم پس‌زمینه
      pieceCtx.drawImage(
        bgCanvas,
        slotX - TAB_R,
        slotY - TAB_R,
        PIECE_CANVAS_SIZE,
        PIECE_CANVAS_SIZE,
        0,
        0,
        PIECE_CANVAS_SIZE,
        PIECE_CANVAS_SIZE
      );

      // کادر سفید براق دور قطعه پازل
      pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      pieceCtx.lineWidth = 2;
      pieceCtx.stroke();
      pieceCtx.restore();

      // ۳. رسم جای خالی قطعه (Slot) روی بوم اصلی
      bgCtx.save();
      drawPuzzlePiecePath(bgCtx, slotX, slotY, PIECE_SIZE, TAB_R);
      bgCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      bgCtx.fill();
      bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      bgCtx.lineWidth = 1.8;
      bgCtx.setLineDash([4, 3]);
      bgCtx.stroke();
      bgCtx.restore();
    }, 40);
  }, []);

  // ۲. چالش محاسباتی
  const generateMath = useCallback(() => {
    setIsVerified(false);
    onVerifyRef.current(false);
    setUserInput('');

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
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }

      ctx.font = 'bold 16px Vazirmatn, Tahoma, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(qText, w / 2, h / 2);
    }, 40);
  }, []);

  // ۳. چالش کد تصویری
  const generateText = useCallback(() => {
    setIsVerified(false);
    onVerifyRef.current(false);
    setUserInput('');

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

  // انتخاب تصادفی یک سناریو (با اولویت ویژه به اسلایدر پازل گرافیکی)
  const initNewRandomChallenge = useCallback(() => {
    const list: CaptchaScenario[] = ['slider', 'slider', 'math', 'text'];
    const chosen = list[Math.floor(Math.random() * list.length)];
    setScenario(chosen);

    if (chosen === 'slider') {
      generateSliderPuzzle();
    } else if (chosen === 'math') {
      generateMath();
    } else {
      generateText();
    }
  }, [generateSliderPuzzle, generateMath, generateText]);

  // لود اولیه فقط یک بار
  useEffect(() => {
    initNewRandomChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // محاسبه موقعیت قطعه متحرک بر روی تصویر
  // بازه حرکت قطعه پازل بر روی بوم: از 0 تا (CANVAS_WIDTH - PIECE_SIZE - 10)
  const maxPieceX = CANVAS_WIDTH - PIECE_SIZE - 10;
  const currentPieceX = dragProgress * maxPieceX;

  // درگ اسلایدر با موس و لمس
  const handleDragMove = useCallback((clientX: number) => {
    if (!trackRef.current || !isDragging || isVerified) return;
    const rect = trackRef.current.getBoundingClientRect();
    const handleW = 44;
    const maxTrackDrag = rect.width - handleW;
    if (maxTrackDrag <= 0) return;

    const offsetX = Math.max(0, Math.min(clientX - rect.left - handleW / 2, maxTrackDrag));
    const progress = offsetX / maxTrackDrag;
    setDragProgress(progress);
  }, [isDragging, isVerified]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || isVerified) return;
    setIsDragging(false);

    // بررسی تطابق مختصات با خطای مجاز ±5 پیکسل
    const diff = Math.abs(currentPieceX - targetX);
    if (diff <= 6) {
      // تطابق دقیق! قفل روی اسلات و تایید
      const exactProgress = targetX / maxPieceX;
      setDragProgress(exactProgress);
      setIsVerified(true);
      onVerifyRef.current(true);
      setShakeError(false);
    } else {
      // عدم تطابق: لرزش خطا و بازگشت نرم به نقطه شروع
      setShakeError(true);
      setTimeout(() => {
        setDragProgress(0);
        setShakeError(false);
      }, 400);
    }
  }, [isDragging, isVerified, currentPieceX, targetX, maxPieceX]);

  // گوش دادن به رویدادهای سرتاسری موس و لمس در هنگام درگ
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleDragMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // بررسی زنده ریاضی
  const handleMathChange = (val: string) => {
    setUserInput(val);
    const clean = toEnglishDigits(val.trim());
    if (clean !== '' && parseInt(clean, 10) === mathProblem.answer) {
      setIsVerified(true);
      onVerifyRef.current(true);
    } else if (isVerified) {
      setIsVerified(false);
      onVerifyRef.current(false);
    }
  };

  // بررسی زنده متنی
  const handleTextChange = (val: string) => {
    setUserInput(val.toUpperCase());
    if (val.trim().toUpperCase() === textCode.toUpperCase()) {
      setIsVerified(true);
      onVerifyRef.current(true);
    } else if (isVerified) {
      setIsVerified(false);
      onVerifyRef.current(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isVerified
          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40 p-2.5'
          : 'bg-white/80 border-gray-200/90 shadow-xs p-2.5'
      } ${className}`}
    >
      {/* ۱. سناریوی اسلایدر پازل تصویری حرفه‌ای */}
      {scenario === 'slider' && (
        <div className="space-y-2 select-none">
          {/* کادر تصویر و قطعه پازل شناور */}
          <div
            className={`relative rounded-xl overflow-hidden border border-slate-700/60 shadow-inner bg-slate-900 mx-auto transition-transform ${
              shakeError ? 'animate-shake' : ''
            }`}
            style={{ width: '100%', maxWidth: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
          >
            {/* بوم پس‌زمینه تصویر با جای خالی پازل */}
            <canvas
              ref={bgCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full block"
            />

            {/* قطعه برش‌خورده پازل که با اسلایدر جابجا می‌شود */}
            <div
              className={`absolute pointer-events-none transition-transform duration-75 ${
                isVerified ? 'scale-100 ring-2 ring-emerald-400 rounded-lg' : ''
              }`}
              style={{
                top: `${targetY - TAB_R}px`,
                left: `${currentPieceX - TAB_R}px`,
                filter: isVerified
                  ? 'none'
                  : 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.75))',
                transition: isDragging ? 'none' : 'left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <canvas
                ref={pieceCanvasRef}
                width={PIECE_CANVAS_SIZE}
                height={PIECE_CANVAS_SIZE}
                className="block"
              />
            </div>

            {/* دکمه بازسازی چالش روی تصویر */}
            <button
              type="button"
              onClick={initNewRandomChallenge}
              title="تغییر تصویر و چالش"
              className="absolute top-2 left-2 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>

            {/* نشان تایید روی تصویر هنگام موفقیت */}
            {isVerified && (
              <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold animate-in zoom-in-90">
                  <CheckCircle2 size={16} />
                  <span>تطابق کامل پازل</span>
                </div>
              </div>
            )}
          </div>

          {/* ترَک کشیدنی اسلایدر */}
          <div
            ref={trackRef}
            className={`relative h-10 rounded-xl overflow-hidden flex items-center transition-colors border select-none ${
              isVerified
                ? 'bg-emerald-100/90 border-emerald-300 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {/* پر شدن پس‌زمینه همراه با درگ */}
            <div
              className={`absolute top-0 bottom-0 left-0 transition-colors ${
                isVerified
                  ? 'bg-emerald-500/30'
                  : 'bg-gradient-to-r from-purple-500/20 to-indigo-500/25'
              }`}
              style={{
                width: isVerified
                  ? '100%'
                  : `calc(${dragProgress * 100}% + 22px)`,
              }}
            />

            {/* متن راهنما درون اسلایدر */}
            <div className="w-full text-center text-[11px] font-medium pointer-events-none z-0">
              {isVerified ? (
                <span className="flex items-center justify-center gap-1 font-bold text-emerald-700">
                  <Check size={14} /> پازل با موفقیت تکمیل شد
                </span>
              ) : (
                <span className="opacity-75">اسلایدر را برای تکمیل پازل بکشید »»</span>
              )}
            </div>

            {/* دستگیره اسلایدر (Thumb) */}
            <div
              onMouseDown={(e) => {
                if (isVerified) return;
                e.preventDefault();
                setIsDragging(true);
              }}
              onTouchStart={() => {
                if (isVerified) return;
                setIsDragging(true);
              }}
              className={`absolute top-0.5 bottom-0.5 w-11 rounded-lg flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-all z-10 ${
                isVerified
                  ? 'bg-emerald-600 text-white'
                  : isDragging
                  ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400'
                  : 'bg-white text-slate-600 hover:text-purple-600 hover:bg-slate-50 border border-slate-200'
              }`}
              style={{
                left: isVerified
                  ? 'calc(100% - 46px)'
                  : `calc(${dragProgress} * (100% - 44px))`,
                transition: isDragging ? 'none' : 'left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {isVerified ? (
                <Check size={18} className="animate-in zoom-in" />
              ) : (
                <ChevronsRight size={18} className={isDragging ? 'animate-pulse' : ''} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ۲. سناریوی چالش ریاضی زنده */}
      {scenario === 'math' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs">
              <canvas ref={mathCanvasRef} width={130} height={36} className="block select-none" />
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

          <p className="text-[10px] text-gray-400 text-center">
            {isVerified ? 'احراز هویت موفقیت‌آمیز بود.' : 'حاصل عبارت بالا را وارد نمایید.'}
          </p>
        </div>
      )}

      {/* ۳. سناریوی چالش کد تصویری زنده */}
      {scenario === 'text' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs">
              <canvas ref={textCanvasRef} width={130} height={36} className="block select-none" />
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

          <p className="text-[10px] text-gray-400 text-center">
            {isVerified ? 'احراز هویت موفقیت‌آمیز بود.' : 'کد امنیتی ۴ حرفی تصویر را وارد فرمایید.'}
          </p>
        </div>
      )}

      {/* نشان تایید برای سناریوهای متنی و عددی */}
      {isVerified && scenario !== 'slider' && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-700 font-semibold">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            احراز هویت آفلاین تایید شد
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
