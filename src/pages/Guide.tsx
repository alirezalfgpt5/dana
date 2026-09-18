import React, { useState } from 'react';
import { 
  GitBranch, Target, Database, FileText, 
  Settings, Users, FolderTree, BookOpen, 
  ArrowLeft, CheckCircle, BarChart3, LayoutDashboard, Calendar, History, FolderOpen, Maximize2, X, ZoomIn, ZoomOut, RotateCcw, Box
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ArchitectureDoc } from '../components/ArchitectureDoc';
import imgConcept from '../assets/img-concept.png';

export function Guide() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'architecture'>('workflow');

  const steps = [
    {
      id: 1,
      title: '۱. تنظیمات اولیه و مدیریت سیستم',
      description: 'ابتدا باید پیکربندی‌های اصلی سیستم را انجام دهید. این اطلاعات پایه برای سایر بخش‌های سامانه ضروری هستند.',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      path: '/settings',
      tasks: [
        'تعریف ساختار سازمانی و واحدهای مختلف در منوی مدیریت سیستم',
        'مدیریت دوره‌های زمانی برای تفکیک اطلاعات در بازه‌های مشخص',
        'تعریف نقش‌ها و دسترسی‌های کاربران سامانه',
        'تنظیمات عمومی سامانه (لوگو، نام سیستم، رنگ‌بندی)'
      ]
    },
    {
      id: 2,
      title: '۲. ایجاد درختواره مورد نیاز',
      description: 'در این بخش، دانش‌ها، مهارت‌ها و فناوری‌هایی که سازمان برای رسیدن به اهدافش نیاز دارد را در قالب یک درخت سلسله‌مراتبی (ریشه، تنه، شاخه، برگ) ثبت کنید.',
      icon: GitBranch,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      path: '/trees/required',
      tasks: [
        'ایجاد گره‌های دانشی مورد نیاز سازمان',
        'تعیین اولویت، نوع و سطح برای هر گره',
        'پیوست مستندات و فرم‌های مرتبط با هر بخش'
      ]
    },
    {
      id: 3,
      title: '۳. ثبت درختواره تولیدشده (وضعیت موجود)',
      description: 'پس از تعیین نیازها، باید بررسی کنید که در حال حاضر سازمان چه دارایی‌های دانشی در اختیار دارد و آن‌ها را در این بخش ثبت کنید.',
      icon: FolderTree,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      path: '/trees/produced',
      tasks: [
        'ثبت مستندات، تجربیات و دانش‌های تولید شده',
        'اتصال دارایی‌های موجود به گره‌های متناظر در درختواره مورد نیاز'
      ]
    },
    {
      id: 4,
      title: '۴. تحلیل شکاف (Gap Analysis)',
      description: 'سامانه با مقایسه درختواره مورد نیاز و تولیدشده، به طور خودکار نشان می‌دهد که در چه بخش‌هایی سازمان دچار کمبود دانش (گپ) است.',
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      path: '/gaps',
      tasks: [
        'مشاهده وضعیت پوشش هر گره دانشی',
        'تشخیص گپ‌های باز (بدون پوشش) و نیمه‌پر',
        'تصمیم‌گیری برای رفع شکاف‌های اولویت‌دار'
      ]
    },
    {
      id: 5,
      title: '۵. تعریف پروژه‌های پژوهشی',
      description: 'برای پر کردن شکاف‌های شناسایی شده، باید پروژه‌های پژوهشی، دوره‌های آموزشی یا اقدامات دانشی تعریف کنید.',
      icon: Database,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      path: '/research',
      tasks: [
        'تعریف اقلام پژوهشی جدید با جزئیات کامل',
        'تخصیص پژوهش‌ها به یک یا چند گپ شناسایی شده'
      ]
    },
    {
      id: 6,
      title: '۶. ثبت در نظام مسائل',
      description: 'اقدامات پژوهشی تایید شده به عنوان یک "مسئله" وارد چرخه عملیاتی می‌شوند تا فرآیند اجرا، بودجه‌بندی و پیگیری آن‌ها انجام شود.',
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      path: '/issues',
      tasks: [
        'تبدیل اقلام پژوهشی به مسئله',
        'تکمیل شناسنامه مسئله، ضرورت‌ها و پیشینه',
        'مدیریت قراردادها و پیگیری درصد پیشرفت'
      ]
    },
    {
      id: 7,
      title: '۷. داشبورد و گزارش‌گیری',
      description: 'در هر لحظه می‌توانید وضعیت کلی سیستم، پیشرفت برنامه‌ها و خروجی‌های آماری را از طریق داشبورد و بخش گزارش‌ها رصد کنید.',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      path: '/',
      tasks: [
        'مشاهده آمار کلی و شاخص‌های کلیدی عملکرد (KPI) در داشبورد',
        'دریافت خروجی‌های اکسل از جداول مختلف در بخش خروجی‌ها',
        'رصد آخرین فعالیت‌های انجام شده توسط کاربران'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex items-start gap-6">
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
            <BookOpen size={48} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-3">راهنمای جامع سامانه مدیریت دانش (DANA)</h1>
            <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
              به سامانه جامع مدیریت دانش خوش آمدید. این راهنما شامل جریان کار (Workflow) سامانه و سند جامع معماری آن می‌باشد.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
            activeTab === 'workflow'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <LayoutDashboard size={18} />
          جریان کار و آموزش گام‌به‌گام
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
            activeTab === 'architecture'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <Box size={18} />
          سند جامع معماری و عملکرد
        </button>
      </div>

      {activeTab === 'architecture' ? (
        <ArchitectureDoc />
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Conceptual Design Image */}
      <div 
        className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 relative group cursor-pointer overflow-hidden hover:shadow-md transition-all duration-300"
        onClick={() => setIsFullscreen(true)}
      >
        <div className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-2">
          <span className="text-sm font-medium">نمایش تمام‌صفحه</span>
          <Maximize2 size={20} />
        </div>
        <img 
          src={imgConcept} 
          alt="معماری و جریان کار سیستم" 
          className="w-full h-auto rounded-xl object-contain bg-gray-50 max-h-[500px]"
        />
      </div>
      <div className="relative">
        <div className="absolute top-8 bottom-8 right-8 w-1 bg-gray-200 rounded-full hidden md:block"></div>
        
        <div className="space-y-6 relative">
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="relative flex flex-col md:flex-row gap-6 md:gap-8 group">
                <div className="hidden md:flex flex-col items-center z-10">
                  <div className={`w-16 h-16 rounded-2xl ${step.bgColor} ${step.color} flex items-center justify-center shadow-sm border-4 border-white transition-transform group-hover:scale-110`}>
                    <StepIcon size={28} />
                  </div>
                </div>
                
                <div className="flex-1 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${step.bgColor} ${step.color} flex items-center justify-center md:hidden`}>
                        <StepIcon size={24} />
                      </div>
                      <h3 className={`text-xl font-bold ${step.color}`}>{step.title}</h3>
                    </div>
                    {step.path && (
                      <button 
                        onClick={() => navigate(step.path)}
                        className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors px-3 py-1.5 bg-gray-50 hover:bg-blue-50 rounded-lg shrink-0"
                      >
                        ورود به بخش
                        <ArrowLeft size={16} />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-600 leading-relaxed mb-6 text-justify">
                    {step.description}
                  </p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      اقدامات اصلی این مرحله:
                    </h4>
                    <ul className="space-y-2">
                      {step.tasks.map((task, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:bg-gray-400 before:rounded-full before:mt-2">
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm"
          dir="ltr"
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-[120]"
            onClick={() => setIsFullscreen(false)}
          >
            <X size={32} />
          </button>
          
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={10}
            centerOnInit={true}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <React.Fragment>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 p-3 rounded-2xl z-[120]">
                  <button onClick={() => zoomIn()} className="text-white hover:text-blue-400 p-2" title="بزرگ‌نمایی">
                    <ZoomIn size={24} />
                  </button>
                  <button onClick={() => zoomOut()} className="text-white hover:text-blue-400 p-2" title="کوچک‌نمایی">
                    <ZoomOut size={24} />
                  </button>
                  <button onClick={() => resetTransform()} className="text-white hover:text-blue-400 p-2" title="بازنشانی">
                    <RotateCcw size={24} />
                  </button>
                </div>
                <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src={imgConcept} 
                    alt="معماری و جریان کار سیستم" 
                    style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
                    className="rounded-lg shadow-2xl cursor-move"
                    draggable={false}
                  />
                </TransformComponent>
              </React.Fragment>
            )}
          </TransformWrapper>
        </div>
      )}
    </div>
  );
}

export default Guide;
