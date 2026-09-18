// src/pages/Trees/components/TreeStats.tsx
// کامپوننت آمار درختواره

import React from 'react';
import { LEVELS, LEVEL_ORDER } from '../constants/treeLevels';

interface TreeStatsProps {
  stats: {
    total: number;
    byLevel: Record<string, number>;
  };
}

export function TreeStats({ stats }: TreeStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 text-center">
        <p className="text-xs text-gray-400">کل گره‌ها</p>
        <p className="text-xl font-bold text-gray-800">{stats.total}</p>
      </div>
      {LEVEL_ORDER.map(level => (
        <div key={level} className={`rounded-xl p-3 text-center border ${LEVELS[level].bgColor} ${LEVELS[level].borderColor}`}>
          <p className="text-xs text-gray-500">{LEVELS[level].labelFa}</p>
          <p className={`text-xl font-bold ${LEVELS[level].textColor}`}>
            {stats.byLevel[level] || 0}
          </p>
        </div>
      ))}
    </div>
  );
}