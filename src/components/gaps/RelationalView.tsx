// src/components/gaps/RelationalView.tsx
// نمای ارتباطی سه جدولی: درختواره مورد نیاز ← تولیدشده ← پژوهشی
// با فلش‌های اتصال بین گره‌های مرتبط

import React, { useMemo } from 'react';
import { ArrowLeft, GitBranch, Database, Beaker, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface RelNode {
  id: number;
  title: string;
  level: string;
  levelLabel: string;
  gapId?: number | null;
  gapStatus?: string;
  matchScore?: number | null;
  producedNodeId?: number | null;
  researchItem?: any;
  gap?: any;
  connected?: boolean;
  connectedGapId?: number;
  requiredNodeId?: number;
  requiredNodeTitle?: string;
}

interface RelationalViewProps {
  requiredNodes: RelNode[];
  producedNodes: RelNode[];
  researchItems: RelNode[];
  onNodeClick?: (node: RelNode, type: 'required' | 'produced' | 'research') => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'filled': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle };
    case 'partial':
    case 'partially_filled': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock };
    case 'open': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: AlertCircle };
    default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', icon: Clock };
  }
}

function getLevelBadge(level: string) {
  const colors: Record<string, string> = {
    'R': 'bg-purple-100 text-purple-700',
    'T': 'bg-blue-100 text-blue-700',
    'B': 'bg-sky-100 text-sky-700',
    'SB': 'bg-cyan-100 text-cyan-700',
    'L': 'bg-emerald-100 text-emerald-700',
    'Q': 'bg-orange-100 text-orange-700',
  };
  return colors[level] || 'bg-gray-100 text-gray-700';
}

function ArrowConnector({ from, to }: { from: string; to: string }) {
  return (
    <div className="hidden lg:flex items-center justify-center w-12 flex-shrink-0">
      <div className="relative flex items-center">
        <div className="w-8 h-px bg-gray-300" />
        <ArrowLeft size={16} className="text-gray-400 -mr-1" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-gray-400 whitespace-nowrap">
          {from} → {to}
        </div>
      </div>
    </div>
  );
}

export function RelationalView({ requiredNodes, producedNodes, researchItems, onNodeClick }: RelationalViewProps) {
  // پیدا کردن گره‌های تولیدشده متصل به هر گره مورد نیاز
  const connections = useMemo(() => {
    const map: Record<number, { producedId: number | null; researchId: number | null }> = {};
    requiredNodes.forEach(rn => {
      map[rn.id] = {
        producedId: rn.producedNodeId || null,
        researchId: rn.researchItem?.id || null,
      };
    });
    return map;
  }, [requiredNodes]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 overflow-x-auto">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Database size={16} className="text-violet-500" />
        نمای ارتباطی: درختواره مورد نیاز ← تولیدشده ← پژوهشی
      </h3>
      
      <div className="flex gap-0 min-w-[900px]">
        {/* ستون ۱: درختواره مورد نیاز */}
        <div className="flex-1 min-w-[250px]">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gradient-to-l from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <GitBranch size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-700">درختواره مورد نیاز</span>
            <span className="text-[10px] text-blue-500 mr-auto">({requiredNodes.length} گره)</span>
          </div>
          <div className="space-y-1.5">
            {requiredNodes.map(node => {
              const st = getStatusColor(node.gapStatus || 'filled');
              const Icon = st.icon;
              return (
                <div
                  key={node.id}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${st.bg} ${st.border} ${
                    onNodeClick ? 'hover:scale-[1.02]' : ''
                  }`}
                  onClick={() => onNodeClick?.(node, 'required')}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={14} className={`shrink-0 mt-0.5 ${st.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed line-clamp-2">{node.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getLevelBadge(node.level)}`}>
                          {node.levelLabel}
                        </span>
                        {node.matchScore != null && node.matchScore > 0 && (
                          <span className="text-[9px] text-gray-500">
                            تطابق: {Math.round(node.matchScore * 100)}٪
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {requiredNodes.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs">گره‌ای یافت نشد</div>
            )}
          </div>
        </div>

        {/* فلش ۱ */}
        <ArrowConnector from="نیاز" to="تولید" />

        {/* ستون ۲: درختواره تولیدشده */}
        <div className="flex-1 min-w-[250px]">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gradient-to-l from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <Database size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">درختواره تولیدشده</span>
            <span className="text-[10px] text-emerald-500 mr-auto">({producedNodes.length} گره)</span>
          </div>
          <div className="space-y-1.5">
            {producedNodes.map(node => (
              <div
                key={node.id}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  node.connected
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                } ${onNodeClick ? 'hover:scale-[1.02]' : ''}`}
                onClick={() => onNodeClick?.(node, 'produced')}
              >
                <div className="flex items-start gap-2">
                  {node.connected ? (
                    <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <div className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full border-2 border-gray-300 border-dashed" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-relaxed line-clamp-2">{node.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getLevelBadge(node.level)}`}>
                        {node.levelLabel}
                      </span>
                      {node.connected && (
                        <span className="text-[9px] text-emerald-600 font-medium">متصل شده</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {producedNodes.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs">گره‌ای یافت نشد</div>
            )}
          </div>
        </div>

        {/* فلش ۲ */}
        <ArrowConnector from="تولید" to="پژوهش" />

        {/* ستون ۳: پروژه‌های پژوهشی */}
        <div className="flex-1 min-w-[250px]">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gradient-to-l from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <Beaker size={16} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700">پروژه‌های پژوهشی</span>
            <span className="text-[10px] text-violet-500 mr-auto">({researchItems.length} پروژه)</span>
          </div>
          <div className="space-y-1.5">
            {researchItems.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border bg-violet-50/50 border-violet-200 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
                onClick={() => onNodeClick?.(item, 'research')}
              >
                <div className="flex items-start gap-2">
                  <Beaker size={14} className="shrink-0 mt-0.5 text-violet-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-relaxed line-clamp-2">
                      {item.researchItem?.metadata?.title || item.title}
                    </p>
                    {item.requiredNodeTitle && (
                      <p className="text-[9px] text-violet-600 mt-1">
                        مرتبط با: {item.requiredNodeTitle}
                      </p>
                    )}
                    {item.gapStatus && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${getLevelBadge(item.level)}`}>
                        {item.gapStatus === 'open' ? 'گپ باز' : item.gapStatus === 'partial' ? 'نیمه‌پر' : 'پر شده'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {researchItems.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs">
                پروژه پژوهشی وجود ندارد
                <br />
                <span className="text-[10px]">ابتدا درختواره پژوهشی را تولید کنید</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RelationalView;
