// src/pages/Trees/components/TreeHelp.tsx
// کامپوننت راهنمای سطوح درختواره

import React from 'react';
import { LEVELS, LEVEL_ORDER } from '../constants/treeLevels';

interface TreeHelpProps {
  stats: { total: number; leaves: number };
}

export function TreeHelp({ stats }: TreeHelpProps) {
  const progress = stats.total > 0 ? Math.round((stats.leaves / stats.total) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <span className="text-sm font-medium text-blue-800">سلسله‌مراتب سطوح:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-blue-700">
          {LEVEL_ORDER.map((level, index) => (
            <React.Fragment key={level}>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${LEVELS[level].bgColor} ${LEVELS[level].textColor} ${LEVELS[level].borderColor}`}>
                {LEVELS[level].labelFa} ({level})
              </span>
              {index < LEVEL_ORDER.length - 1 && <span className="text-gray-400">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {LEVEL_ORDER.map(level => (
            <span key={level} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LEVELS[level].color }} />
              <span className="text-gray-600">{LEVELS[level].labelFa}</span>
            </span>
          ))}
          <span className="w-px h-4 bg-gray-300" />
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-3 h-3 rounded-full border-2 border-red-500 bg-white border-dashed" />
            گپ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">پیشرفت:</span>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-700">{progress}%</span>
        </div>
      </div>
    </div>
  );
}