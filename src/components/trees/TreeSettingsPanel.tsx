// src/components/trees/TreeSettingsPanel.tsx
// پنل تنظیمات نمایش درختواره

import React, { useState } from 'react';
import { X, Move, RotateCcw, Type, Palette } from 'lucide-react';

interface TreeSettingsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  configNodeId: string | null;
  configNodeName: string | null;
  fontSizeScale: number;
  onFontSizeChange: (val: number) => void;
  elbowValue: number;
  onElbowChange: (val: number) => void;
  nodeOpacity?: number;
  onNodeOpacityChange?: (val: number) => void;
  isDragMode: boolean;
  onToggleDrag: (val: boolean) => void;
  onResetLayout: () => void;
  resetConfirmMode: boolean;
  isAuthenticated?: boolean;
  levelColors?: Record<string, string>;
  onLevelColorChange?: (colors: Record<string, string>) => void;
}

const LEVEL_NAMES: Record<string, string> = {
  'R': 'ریشه',
  'T': 'تنه',
  'B': 'شاخه',
  'SB': 'زیرشاخه',
  'L': 'برگ',
  'Q': 'کیفیت',
};

const DEFAULT_COLORS: Record<string, string> = {
  'R': '#3b82f6',
  'T': '#8b5cf6',
  'B': '#10b981',
  'SB': '#f59e0b',
  'L': '#6366f1',
  'Q': '#ec4899',
};

export function TreeSettingsPanel({
  isOpen,
  onToggle,
  configNodeId,
  configNodeName,
  fontSizeScale,
  onFontSizeChange,
  elbowValue,
  onElbowChange,
  nodeOpacity = 1,
  onNodeOpacityChange,
  isDragMode,
  onToggleDrag,
  onResetLayout,
  resetConfirmMode,
  isAuthenticated = true,
  levelColors = DEFAULT_COLORS,
  onLevelColorChange,
}: TreeSettingsPanelProps) {

  const handleColorChange = (level: string, color: string) => {
    const newColors = { ...levelColors, [level]: color };
    onLevelColorChange?.(newColors);
  };

  const resetColors = () => {
    onLevelColorChange?.(DEFAULT_COLORS);
  };

  return (
    <div
      className={`
        fixed top-20 right-4 z-40
        bg-white/95 backdrop-blur-md shadow-xl border border-slate-200
        rounded-2xl flex flex-col transition-all duration-300
        ${isOpen ? 'w-80 p-4 max-h-[85vh] overflow-y-auto scrollbar-hide' : 'w-0 h-0 p-0 overflow-hidden opacity-0 pointer-events-none'}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {isOpen && (
        <div className="mt-2 space-y-4">
          {/* عنوان */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-bold text-slate-800">تنظیمات نمایش</span>
            <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {/* اندازه فونت */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
            <div>
              <label className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span className="flex items-center gap-1">
                  <Type size={12} />
                  اندازه نوشته‌ها
                </span>
                <span className="text-amber-600">{Math.round(fontSizeScale * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={fontSizeScale}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            
            <div>
              <label className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span className="flex items-center gap-1">
                  <Palette size={12} />
                  شفافیت گره‌ها (Opacity)
                </span>
                <span className="text-amber-600">{Math.round(nodeOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={nodeOpacity}
                onChange={(e) => onNodeOpacityChange?.(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* تنظیمات پیوندها */}
          <div className="bg-indigo-50 border-indigo-200 p-3 rounded-xl border transition-all">
            <div className="flex items-center gap-2 mb-3 border-b border-indigo-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-700 truncate">
                تنظیمات مسیر خطوط
              </span>
            </div>

            {/* ارتفاع زانو */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-500">موقعیت زانو (ارتفاع)</span>
                <input
                  type="number"
                  min="-3"
                  max="3"
                  step="0.01"
                  disabled={!isAuthenticated}
                  value={elbowValue}
                  onChange={(e) => onElbowChange(Number(e.target.value))}
                  className="w-16 px-1 py-0.5 text-[10px] font-bold border border-slate-200 rounded text-center bg-white disabled:opacity-50 outline-none focus:border-indigo-500 font-mono text-indigo-600"
                  dir="ltr"
                />
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                disabled={!isAuthenticated}
                value={elbowValue}
                onChange={(e) => onElbowChange(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* تنظیمات رنگ‌ها */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <Palette size={12} />
                رنگ‌های سطوح
              </span>
              <button
                onClick={resetColors}
                className="text-[9px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded"
              >
                بازنشانی
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LEVEL_NAMES).map(([level, name]) => (
                <div key={level} className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-600 w-10">{name}</span>
                  <input
                    type="color"
                    value={levelColors[level] || DEFAULT_COLORS[level]}
                    onChange={(e) => handleColorChange(level, e.target.value)}
                    className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* حالت درگ */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            {isAuthenticated && (
              <button
                onClick={onResetLayout}
                className={`w-full py-2 text-[10px] font-bold border rounded-lg transition-all flex items-center justify-center gap-1.5
                  ${resetConfirmMode
                    ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse'
                    : 'text-red-500 border-red-200 hover:bg-red-50'
                  }`}
              >
                {resetConfirmMode ? (
                  <span>تایید بازنشانی؟ (کلیک کنید)</span>
                ) : (
                  <>
                    <RotateCcw size={12} />
                    <span>بازنشانی به حالت استاندارد</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TreeSettingsPanel;