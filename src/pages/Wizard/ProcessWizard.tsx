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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <Waypoints className="text-purple-600" size={28} />
              مسیریاب یکپارچه دانش
            </h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">
              اجرای گام‌به‌گام فرآیند حکمرانی دانشی حوزه علوم و فناوری های نرم و شناختی آجا
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                currentStep === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-600 hover:text-purple-700'
              }`}
            >
              <ChevronRight size={18} />
              مرحله قبل
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
              disabled={currentStep === STEPS.length - 1}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                currentStep === STEPS.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
              }`}
            >
              مرحله بعد
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* نوار پیشرفت مراحل */}
        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
          <div 
            className="absolute top-1/2 right-0 h-1 bg-purple-500 -translate-y-1/2 rounded-full z-0 transition-all duration-500"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          ></div>
          
          <div className="relative z-10 flex justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(idx)}
                  className="flex flex-col items-center group focus:outline-none w-24"
                >
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border-2 ${
                      isActive 
                      ? 'bg-purple-600 border-purple-600 text-white shadow-purple-200 scale-110' 
                      : isCompleted
                        ? 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-500'
                    }`}
                  >
                    {isCompleted ? <Check size={24} className="animate-in zoom-in" /> : <Icon size={22} />}
                  </div>
                  <div className="mt-3 text-center">
                    <div className={`text-xs font-bold transition-colors ${isActive ? 'text-purple-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </div>
                    <div className={`text-[10px] mt-1 transition-colors ${isActive ? 'text-purple-500' : 'text-gray-400'}`}>
                      {step.desc}
                    </div>
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
