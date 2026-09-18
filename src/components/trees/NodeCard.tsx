// src/components/trees/NodeCard.tsx
// کامپوننت کارت گره درختواره - با پشتیبانی از renderLeafActions

import React, { useState } from 'react';
import { Edit2, Eye, Trash2, Plus, Anchor, UserPlus, FileText } from 'lucide-react';

interface NodeCardProps {
  node: any;
  depth: number;
  isActive?: boolean;
  isSelected?: boolean;
  isRoot?: boolean;
  onSelect?: (node: any) => void;
  onEdit?: (node: any) => void;
  onDelete?: (node: any) => void;
  onAddChild?: (node: any) => void;
  onFocus?: (node: any) => void;
  onAnchor?: (node: any) => void;
  showActions?: boolean;
  viewMode?: 'rich' | 'simple' | 'vertical';
  fontSizeScale?: number;
  renderLeafActions?: (node: any) => React.ReactNode;
  levelColors?: Record<string, string>;
  opacity?: number;
  showGaps?: boolean;
}

const LEVEL_COLORS_DEFAULT: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  'R': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', gradient: 'from-blue-500 to-blue-700' },
  'T': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-800', gradient: 'from-purple-500 to-purple-700' },
  'B': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800', gradient: 'from-green-500 to-green-700' },
  'SB': { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', gradient: 'from-amber-500 to-amber-700' },
  'L': { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-800', gradient: 'from-indigo-500 to-indigo-700' },
  'Q': { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800', gradient: 'from-rose-500 to-rose-700' },
};

const DEPTH_COLORS = [
  'from-amber-700 to-amber-900 border-amber-500',
  'from-slate-700 to-slate-900 border-slate-500',
  'from-emerald-600 to-emerald-800 border-emerald-400',
  'from-blue-600 to-blue-800 border-blue-400',
  'from-indigo-500 to-indigo-700 border-indigo-300',
  'from-purple-500 to-purple-700 border-purple-300',
  'from-white to-slate-100 border-slate-200',
];

export function NodeCard({
  node,
  depth,
  isActive = false,
  isSelected = false,
  isRoot = false,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onFocus,
  onAnchor,
  showActions = true,
  viewMode = 'rich',
  fontSizeScale = 1,
  renderLeafActions,
  levelColors,
  opacity = 1,
  showGaps = false
}: NodeCardProps) {
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const levelInfo = LEVEL_COLORS_DEFAULT[node.level] || LEVEL_COLORS_DEFAULT['L'];
  const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const isLight = depth >= 6;
  
  const customColor = levelColors ? levelColors[node.level] : undefined;
  const customBorder = customColor ? { borderColor: customColor } : {};
  const customBg = customColor ? { background: `linear-gradient(0deg, ${customColor}1A, ${customColor}1A), #ffffff` } : {};
  const customText = customColor ? { color: customColor } : {};
  const customGradientBg = customColor ? { background: `linear-gradient(135deg, ${customColor}, ${customColor}cc), #ffffff` } : {};

  const isLeaf = node.level === 'L' || node.level === 'Q';
  const isGap = showGaps ? node.isGap === 1 : false;
  const gapStatus = showGaps ? (node.gapStatus || (isGap ? 'open' : null)) : null;

  const getGapIndicator = () => {
    if (!gapStatus) return null;
    
    if (gapStatus === 'open') {
      return (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full border-2 border-red-500 shadow-lg flex items-center justify-center text-red-500 font-bold animate-pulse" style={{ fontSize: '0.65em' }} title="شکاف دانشی (گپ)">
          ⚠
        </div>
      );
    } else if (gapStatus === 'partially_filled') {
      return (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-orange-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold" style={{ fontSize: '0.65em' }} title="تطابق جزئی">
          ~
        </div>
      );
    } else if (gapStatus === 'filled') {
      return (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold" style={{ fontSize: '0.65em' }} title="دارایی موجود">
          ✓
        </div>
      );
    }
    return null;
  };

  if (viewMode === 'simple') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105
          px-3 py-2 bg-white rounded-lg shadow-sm border-2 min-w-[80px]
          ${isActive ? 'ring-2 ring-amber-400' : ''}
          ${isSelected ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-200' : ''}
          ${isGap ? 'border-red-400 bg-red-50' : (!customColor ? levelInfo.border : '')}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect?.(node)}
        style={{ fontSize: `${0.875 * fontSizeScale}rem`, opacity, ...(isGap ? {} : customBorder), ...(isGap ? {} : customBg) }}
      >
        <span className="font-bold text-gray-800 text-center" style={{ fontSize: '1em' }}>{node.title}</span>
        <span 
          className={`font-medium mt-0.5 ${!customColor ? levelInfo.text : ''}`}
          style={{ ...customText, fontSize: '0.65em' }}
        >
          {node.level}
        </span>
        {getGapIndicator()}

        {showActions && isHovered && (
          <div className="absolute -top-3 -right-3 flex gap-0.5 bg-white rounded-full shadow-lg border border-gray-200 p-0.5 z-20">
            {onAnchor && !isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); onAnchor(node); }}
                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                title="لنگر روی این شاخه"
              >
                <Anchor size={11} />
              </button>
            )}
            {onAddChild && !isLeaf && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="افزودن فرزند"
              >
                <Plus size={11} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                title="ویرایش"
              >
                <Edit2 size={11} />
              </button>
            )}
            {onFocus && (
              <button
                onClick={(e) => { e.stopPropagation(); onFocus(node); }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="فوکوس"
              >
                <Eye size={11} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="حذف"
              >
                <Trash2 size={11} />
              </button>
            )}
            {renderLeafActions && renderLeafActions(node)}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'vertical') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105
          w-8 h-32 bg-white rounded-lg shadow-sm border-2
          ${isActive ? 'ring-2 ring-amber-400' : ''}
          ${isSelected ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-200' : ''}
          ${isGap ? 'border-red-400 bg-red-50' : (!customColor ? levelInfo.border : '')}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect?.(node)}
        style={{ fontSize: `${0.875 * fontSizeScale}rem`, opacity, ...(isGap ? {} : customBorder), ...(isGap ? {} : customBg) }}
      >
        <span className="font-bold text-gray-800 text-center whitespace-nowrap transform -rotate-90 origin-center" style={{ fontSize: '0.85em' }}>{node.title}</span>
        {getGapIndicator()}
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-[1.02]
        w-[220px] min-h-[140px] p-5 rounded-2xl border-2 shadow-xl
        ${!customColor ? `bg-gradient-to-br ${depthColor}` : ''}
        ${isActive ? 'ring-4 ring-amber-400' : ''}
        ${isSelected ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-200' : ''}
        ${!customColor ? (isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/20 text-white border-white/30') : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(node)}
      style={{ fontSize: `${fontSizeScale}rem`, opacity, ...customGradientBg, ...(customColor ? { borderColor: customColor, color: '#fff' } : {}) }}
    >
      <div className={`absolute top-2 left-2 font-bold px-2 py-0.5 rounded-full ${!customColor ? (isLight ? 'bg-black/10 text-slate-700' : 'bg-white/20 text-white') : 'bg-black/20 text-white'}`} style={{ fontSize: '0.65em' }}>
        {node.level}
      </div>

      {getGapIndicator()}

      <div className={`font-black text-center leading-tight mb-1 px-4 ${!customColor ? (isLight ? 'text-slate-900' : 'text-white') : 'text-white'}`} style={{ fontSize: '1em' }}>
        {node.title}
      </div>

      {node.description && (
        <div className={`text-center mb-2 px-2 ${!customColor ? (isLight ? 'text-slate-600' : 'text-white/80') : 'text-white/90'}`} style={{ fontSize: '0.75em' }}>
          {node.description.length > 40 ? node.description.substring(0, 40) + '...' : node.description}
        </div>
      )}

      {isLeaf && node.templateIds && (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).length > 0 && (
        <div className={`px-3 py-1 rounded-full border flex items-center gap-1.5
          ${!customColor ? (isLight ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white/20 text-white border-white/30') : 'bg-black/20 text-white border-white/30'}
        `} style={{ fontSize: '0.6em' }}>
          <FileText size={10} />
          <span>{(Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).length} قالب</span>
        </div>
      )}

      {showActions && isHovered && (
        <div className={`absolute -top-3 -right-3 flex gap-0.5 backdrop-blur-md rounded-xl p-1 shadow-lg border
          ${isLight ? 'bg-white/80 border-slate-200' : 'bg-white/20 border-white/30'}
        `}>
          {onAnchor && !isRoot && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnchor(node); }}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isLight ? 'text-slate-500 hover:text-purple-600 hover:bg-purple-50' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
              title="لنگر روی این شاخه (نمایش فقط این شاخه)"
            >
              <Anchor size={14} />
            </button>
          )}
          {onAddChild && !isLeaf && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isLight ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
              title="افزودن فرزند"
            >
              <UserPlus size={14} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isLight ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
              title="ویرایش"
            >
              <Edit2 size={14} />
            </button>
          )}
          {onFocus && (
            <button
              onClick={(e) => { e.stopPropagation(); onFocus(node); }}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isLight ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
              title="فوکوس"
            >
              <Eye size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isLight ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          )}
          {renderLeafActions && (
            <>
              <div className="w-px h-6 bg-white/30 mx-0.5" />
              {renderLeafActions(node)}
            </>
          )}
        </div>
      )}

      {node._ancestors && node._ancestors.length > 0 && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          onMouseEnter={() => setShowBreadcrumbs(true)}
          onMouseLeave={() => setShowBreadcrumbs(false)}
        >
          <button className={`px-2 py-0.5 rounded-full font-bold ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/20 text-white'}`} style={{ fontSize: '0.5em' }}>
            ↑ {node._ancestors.length} لایه
          </button>

          {showBreadcrumbs && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-50">
              <div className="p-2 rounded-xl shadow-2xl bg-slate-800 text-white border border-slate-600 min-w-[120px] max-w-[200px]">
                <div className="flex flex-col gap-0.5 font-bold" style={{ fontSize: '0.6em' }}>
                  {[...node._ancestors].reverse().map((anc: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelect) onSelect(anc);
                        if (onFocus) onFocus(anc);
                      }}
                    >
                      <span className="opacity-40" style={{ fontSize: '0.8em' }}>{'▲'.repeat(idx + 1)}</span>
                      <span>{anc.title}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800 translate-y-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NodeCard;