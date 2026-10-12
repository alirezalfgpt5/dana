import React, { useState, useEffect } from 'react';
import { 
  GitBranch, FolderOpen, Target, Shield, Database, FileText, 
  ChevronLeft, ChevronRight, Check, Waypoints
} from 'lucide-react';

// کامپوننت‌های مراحل
import { RequiredTree } from '../Trees/RequiredTree';
import { ProducedTree } from '../Trees/ProducedTree';
import { GapAnalysis } from '../Gaps/GapAnalysis';
import { IssueSystem } from '../Issues/IssueSystem';
import { ResearchTree } from '../Research/ResearchTree';
import { Outputs } from '../Outputs/Outputs';

const STEPS = [
  { id: 'required', label: 'درختواره مورد نیاز', icon: GitBranch, component: RequiredTree, desc: 'دانش مرجع' },
  { id: 'produced', label: 'درختواره تولیدشده', icon: FolderOpen, component: ProducedTree, desc: 'دانش موجود' },
  { id: 'gaps', label: 'تحلیل شکاف', icon: Target, component: GapAnalysis, desc: 'شناسایی کاستی‌ها' },
  { id: 'issues', label: 'نظام مسائل', icon: Shield, component: IssueSystem, desc: 'استخراج چالش‌ها' },
  { id: 'research', label: 'درختواره پژوهشی', icon: Database, component: ResearchTree, desc: 'پروژه‌ها' },
  { id: 'outputs', label: 'خروجی‌ها', icon: FileText, component: Outputs, desc: 'گزارش‌گیری' },
];

export function ProcessWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  const CurrentComponent = STEPS[currentStep].component;

  // اسکرول به بالا در هنگام تغییر مرحله
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainMain = document.querySelector('main');
    if (mainMain) {
      mainMain.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  return (
    <div className="space-y-6">
      {/* هدر ویزارد */}
      <div className="sticky top-0 z-30 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Waypoints className="text-purple-600" size={21} />
              مسیر یکپارچه دانش
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              اجرای گام‌به‌گام فرآیند حکمرانی دانشی حوزه علوم و فناوری های نرم و شناختی آجا
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentStep === 0 
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700'
              }`}
            >
              <ChevronRight size={15} />
              مرحله قبل
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
              disabled={currentStep === STEPS.length - 1}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentStep === STEPS.length - 1
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              مرحله بعد
              <ChevronLeft size={15} />
            </button>
          </div>
        </div>

        {/* نوار پیشرفت مراحل */}
        <div className="relative overflow-x-auto px-1 pb-1">
          <div className="absolute top-4 right-5 left-5 z-0 h-0.5 -translate-y-1/2 rounded-full bg-gray-100"></div>
          <div 
            className="absolute top-4 right-5 z-0 h-0.5 -translate-y-1/2 rounded-full bg-purple-500 transition-all duration-500"
            style={{ width: `calc((100% - 2.5rem) * ${currentStep / (STEPS.length - 1)})` }}
          ></div>
          
          <div className="relative z-10 flex min-w-[38rem] justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(idx)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`مرحله ${idx + 1}: ${step.label}`}
                  className="group flex w-24 flex-col items-center rounded-lg text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <div 
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ${
                      isActive 
                      ? 'scale-110 border-purple-600 bg-purple-600 text-white shadow-sm shadow-purple-200'
                      : isCompleted
                        ? 'border-purple-200 bg-purple-50 text-purple-600 group-hover:bg-purple-100'
                        : 'border-gray-200 bg-white text-gray-400 group-hover:border-purple-300 group-hover:text-purple-500'
                    }`}
                  >
                    {isCompleted ? <Check size={15} /> : <Icon size={15} />}
                  </div>
                  <div className="mt-1.5 min-h-8">
                    <div className={`text-[10px] font-semibold leading-4 transition-colors ${isActive ? 'text-purple-700' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.label}
                    </div>
                    {isActive && <div className="mt-0.5 text-[9px] leading-3 text-purple-500">{step.desc}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* محتوای مرحله */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CurrentComponent />
      </div>
    </div>
  );
}
