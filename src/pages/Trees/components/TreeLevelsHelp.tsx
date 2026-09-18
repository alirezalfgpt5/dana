import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { LEVELS, LEVEL_ORDER } from '../constants/treeLevels';

export function TreeLevelsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-blue-500" />
          <span className="font-semibold text-sm">راهنمای سطوح درختواره</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {LEVEL_ORDER.map(key => {
              const config = LEVELS[key];
              return (
                <div key={key} className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{config.emoji}</span>
                    <span className={`font-bold ${config.textColor}`}>
                      {config.labelFa} ({config.value})
                    </span>
                  </div>
                  <p className={`text-xs ${config.textColor} opacity-80 leading-relaxed`}>
                    {config.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
