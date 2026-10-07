// src/components/issues/IssueDetailsModal.tsx
// مودال نمایش جامع و کامل تمامی فیلدهای نظام مسائل (۱۱ تب تخصصی + تب پیوست‌ها و خروجی Word)

import React, { useState } from 'react';
import { 
  X, FileText, Settings, ClipboardList, Users, Coins, 
  CheckCircle, Clock, RefreshCw, File, UserCog, Building2,
  Calendar, Shield, AlertCircle, Paperclip, Download, ChevronLeft,
  FileDown, ExternalLink
} from 'lucide-react';
import { formatPersianDateTime } from '../../utils/persianDate';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getIssueOrgText } from '../../utils/orgHelper';

interface IssueDetailsModalProps {
  issue: any;
  onClose: () => void;
  onEdit?: (issue: any) => void;
}

export const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({
  issue,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState('general');

  if (!issue) return null;

  const safeJson = (data: any, defaultVal: any = null) => {
    if (!data) return defaultVal;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return defaultVal; }
    }
    return typeof data === 'object' ? data : defaultVal;
  };

  const needStatement = safeJson(issue.needStatement);
  const contract = safeJson(issue.contract);
  const executiveContract = safeJson(issue.executiveContract);
  const stage20 = safeJson(issue.stage20);
  const stage50 = safeJson(issue.stage50);
  const stage100 = safeJson(issue.stage100);
  const application = safeJson(issue.application);
  const teamMembers = safeJson(issue.issueResolutionTeam, []);
  const macroProject = safeJson(issue.macroProject);
  const collaborationNetwork = safeJson(issue.collaborationNetwork);
  const attachments = Array.isArray(issue.attachments) ? issue.attachments : [];

  const tabs = [
    { id: 'general', label: 'اطلاعات کلی', icon: Settings },
    { id: 'need', label: 'بیانیه نیاز', icon: FileText },
    { id: 'projects', label: 'پروژه‌ها', icon: ClipboardList },
    { id: 'collaboration', label: 'همکاری‌ها', icon: Users },
    { id: 'budget', label: 'اعتبارات و بودجه', icon: Coins },
    { id: 'actions', label: 'اقدامات و گلوگاه‌ها', icon: CheckCircle },
    { id: 'team', label: 'کارگروه', icon: UserCog },
    { id: 'contract', label: 'قرارداد', icon: File },
    { id: 'executive_contract', label: 'شورای اجرایی', icon: Users },
    { id: 'stages', label: 'مراحل اجرایی', icon: Clock },
    { id: 'application', label: 'کاربست نتایج', icon: RefreshCw },
    { id: 'attachments', label: `پیوست‌ها (${attachments.length})`, icon: Paperclip },
  ];

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'نامشخص';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadWord = () => {
    const token = localStorage.getItem('token');
    const url = `/api/export/issues/${issue.id}/word`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-right font-sans">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
                  کد #{issue.id}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  📂 {issue.domain || 'نامشخص'}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                  {issue.status === 'completed' ? '✅ تکمیل شده' :
                   issue.status === 'in_progress' ? '🔄 در حال اجرا' :
                   issue.status === 'on_hold' ? '⏸️ متوقف' :
                   issue.status === 'canceled' ? '❌ لغو شده' : '⏳ در انتظار'}
                </span>
                {issue.period?.isComplete === 1 && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                    🔒 دوره خاتمه‌یافته / فریز
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-800 text-base mt-1 line-clamp-1">
                {issue.title}
              </h3>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                <Building2 size={13} className="text-gray-400 shrink-0" />
                <span>ساختار سازمانی / مالک:</span>
                <span className="font-semibold text-slate-700">{getIssueOrgText(issue)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* دکمه دانلود شناسنامه Word (حل اولویت ۱۳) */}
            <button
              onClick={handleDownloadWord}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
              title="دریافت شناسنامه در قالب Word"
            >
              <FileDown size={14} />
              <span>خروجی Word</span>
            </button>

            {onEdit && issue.period?.isComplete !== 1 && (
              <button
                onClick={() => { onClose(); onEdit(issue); }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                ✏️ ویرایش
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* نوار ردیابی خط سیر بین دوره‌ای (Lineage Tracking) */}
        {(issue.sourceIssueId || issue.sourceIssue || issue.metadata?.snapshotSource) && (
          <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-700">🔗 ردیابی خط سیر مسئله (Lineage):</span>
              <span>
                این رکورد منتقل‌شده از دوره {issue.sourceIssue?.period?.name || 'پیشین'} است 
                (شناسه والد: #{issue.sourceIssueId || issue.metadata?.snapshotSource?.issueId})
              </span>
            </div>
            {issue.sourceIssue?.title && (
              <span className="text-[11px] text-indigo-600 truncate max-w-xs">
                عنوان مبدأ: {issue.sourceIssue.title}
              </span>
            )}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex overflow-x-auto gap-1 p-2.5 border-b border-gray-100 bg-gray-50/70 scrollbar-thin">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-purple-700 shadow-sm border border-purple-200 font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* تب اطلاعات کلی */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🏢 دستگاه یا یگان مسئول</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.responsibleUnit || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🎯 اولویت اقدام</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.actionPriority || 'متوسط'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🔒 سطح محرمانگی</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.confidentialityLevel || 'عمومی'}</p>
                </div>
              </div>

              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <span className="text-xs text-purple-700 font-bold block mb-1.5">🧭 جهت‌گیری راه‌حل</span>
                <p className="text-sm text-gray-700 leading-relaxed">{issue.solutionDirection || 'ثبت نشده است'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">📚 نوع‌شناسی دانش</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.knowledgeType || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">📊 سطح پروژه</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.projectLevel || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🏛️ مرجع تصویب</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.approvalAuthority || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🏷️ دسته‌بندی</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.category || 'عمومی'}</p>
                </div>
              </div>

              {issue.researchItem && (
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-700 font-bold block mb-1">🔬 آیتم پژوهشی مرتبط (کد #{issue.researchItem.id}):</span>
                  <p className="text-sm text-gray-800">{issue.researchItem.importance || 'تحلیل پژوهشی مرتبط'}</p>
                </div>
              )}

              {issue.templates && issue.templates.length > 0 && (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-bold block mb-2">📋 قالب‌های دانشی مجاز مرتبط:</span>
                  <div className="flex flex-wrap gap-2">
                    {issue.templates.map((t: any, idx: number) => (
                      <span key={idx} className="text-xs bg-white border border-purple-200 text-purple-800 px-2.5 py-1 rounded-lg shadow-2xs">
                        🏷️ {t.title || t.name || t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تب بیانیه نیاز (پوشش کامل فیلدها - حل اولویت ۶) */}
          {activeTab === 'need' && (
            <div className="space-y-4">
              {needStatement ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">👤 متقاضی / کاربر نهایی</span>
                      <p className="text-sm font-semibold text-gray-800">{needStatement.user || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">📊 سطح نیاز</span>
                      <p className="text-sm font-semibold text-gray-800">{needStatement.level || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">💰 بودجه پیشنهادی متقاضی</span>
                      <p className="text-sm font-semibold text-emerald-700">{formatCurrency(needStatement.suggestedBudget)} ریال</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-400 block mb-1.5">📝 شرح و بیان مسئله و نیاز</span>
                    <p className="text-sm text-gray-800 leading-relaxed">{needStatement.problem || '-'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">📌 وضعیت تصویب</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        needStatement.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        needStatement.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {needStatement.approvalStatus === 'approved' ? '✅ تصویب شد' :
                         needStatement.approvalStatus === 'rejected' ? '❌ رد شد' : '⏳ در انتظار تصویب'}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">📅 تاریخ تصویب</span>
                      <p className="text-sm font-semibold text-gray-800">{needStatement.approvalDate || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">💰 مبلغ تصویب</span>
                      <p className="text-sm font-semibold text-emerald-700">{formatCurrency(needStatement.approvedAmount)} ریال</p>
                    </div>
                  </div>

                  {needStatement.file && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-blue-900">
                        <Paperclip size={14} />
                        <span>فایل پیوست بیانیه نیاز: <strong>{needStatement.file.name || 'مستند نیاز'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">بیانیه نیازی برای این مسئله ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* تب پروژه‌ها */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🔬 نوع پروژه پژوهشی</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.researchProjectType || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">📚 نوع پروژه دانشی</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.knowledgeProjectType || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🎪 رویداد مرتبط</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.events || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🌐 سطح دیپلماسی علمی</span>
                  <p className="text-sm font-semibold text-gray-800">{issue.scientificDiplomacy || '-'}</p>
                </div>
              </div>
              {macroProject && (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">🏗️ کلان پروژه مرتبط</span>
                  <p className="text-sm text-gray-800">{macroProject.title || macroProject.name || JSON.stringify(macroProject)}</p>
                </div>
              )}
            </div>
          )}

          {/* تب همکاری‌ها و دیپلماسی علمی */}
          {activeTab === 'collaboration' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block mb-1">🤝 همکاران و پژوهشگران</span>
                <p className="text-sm text-gray-800">{issue.collaborators || 'همکاری ثبت نشده است'}</p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block mb-1">🌐 شبکه همکاران</span>
                <p className="text-sm text-gray-800">{collaborationNetwork ? (collaborationNetwork.description || JSON.stringify(collaborationNetwork)) : 'شبکه همکاری ثبت نشده است'}</p>
              </div>
            </div>
          )}

          {/* تب بودجه و زمان */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                  <span className="text-xs text-emerald-800 block mb-1">💰 اعتبار / بودجه مورد نیاز</span>
                  <p className="text-base font-bold text-emerald-700">{formatCurrency(issue.requiredBudget, true)}</p>
                </div>
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-800 block mb-1">💳 اعتبار / بودجه مصوب</span>
                  <p className="text-base font-bold text-blue-700">{formatCurrency(issue.approvedBudget, true)}</p>
                </div>
                <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
                  <span className="text-xs text-purple-800 block mb-1">💵 اعتبار / بودجه تخصیص‌یافته</span>
                  <p className="text-base font-bold text-purple-700">{formatCurrency(issue.assignedBudget, true)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">⏳ مدت زمان پیش‌بینی شده</span>
                  <p className="text-sm font-semibold text-gray-800">{formatNumber(issue.expectedMonths || 0)} ماه</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">📊 درصد پیشرفت فیزیکی</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-gray-800">{formatNumber(issue.completionPercent || 0)}٪</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${issue.completionPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {issue.referenceDocument && (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">📜 سند بالادستی یا ارجاعی</span>
                  <p className="text-sm text-gray-800">{issue.referenceDocument}</p>
                </div>
              )}
            </div>
          )}

          {/* تب اقدامات و گلوگاه‌ها */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-green-700 font-bold block mb-1">✅ اقدامات صورت‌گرفته</span>
                <p className="text-sm text-gray-800 leading-relaxed">{issue.actionsTaken || '-'}</p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-red-700 font-bold block mb-1">🚧 گلوگاه‌ها و چالش‌ها</span>
                <p className="text-sm text-gray-800 leading-relaxed">{issue.bottlenecks || '-'}</p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-blue-700 font-bold block mb-1">📋 تدابیر و فرامین ابلاغی</span>
                <p className="text-sm text-gray-800 leading-relaxed">{issue.orders || '-'}</p>
              </div>
            </div>
          )}

          {/* تب کارگروه */}
          {activeTab === 'team' && (
            <div className="space-y-3">
              {teamMembers && teamMembers.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {teamMembers.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{m.name} {m.rank ? `(${m.rank})` : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">یگان: {m.unit || '-'} | نقش: {m.role || '-'}</p>
                      </div>
                      {m.phone && (
                        <span className="text-xs bg-white px-2.5 py-1 rounded-md border text-gray-600">
                          📞 {m.phone}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">هیچ عضوی برای کارگروه ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* تب قراردادها (پوشش کامل فیلدها - حل اولویت ۶) */}
          {activeTab === 'contract' && (
            <div className="space-y-4">
              {contract ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h4 className="font-bold text-sm text-gray-800">📄 اطلاعات قرارداد اجرایی</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">شماره قرارداد:</span>
                      <span className="font-semibold text-gray-800">{contract.number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">مجری پروژه:</span>
                      <span className="font-semibold text-gray-800">{contract.executor || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">مبلغ قرارداد:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(contract.amount)} ریال</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">تاریخ قرارداد:</span>
                      <span className="font-semibold text-gray-800">{contract.date || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">تاریخ شروع:</span>
                      <span className="font-semibold text-gray-800">{contract.startDate || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">مدت (ماه):</span>
                      <span className="font-semibold text-gray-800">{contract.duration || '-'} ماه</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-200">
                    <div>
                      <span className="text-gray-400 block mb-0.5">همکاران مجری:</span>
                      <span className="text-gray-700">{Array.isArray(contract.collaborators) ? contract.collaborators.join('، ') : (contract.collaborators || '-')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">عوامل (استاد راهنما، ارزیاب، مشاور):</span>
                      <span className="text-gray-700">{Array.isArray(contract.agents) ? contract.agents.join('، ') : (contract.agents || '-')}</span>
                    </div>
                  </div>

                  {contract.file && (
                    <div className="bg-green-50 p-2.5 rounded-lg border border-green-200 flex items-center justify-between text-xs mt-2">
                      <div className="flex items-center gap-2 text-green-900">
                        <Paperclip size={14} />
                        <span>فایل قرارداد: <strong>{contract.file.name || 'مستند قرارداد'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">قرارداد اجرایی ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* تب شورای اجرایی */}
          {activeTab === 'executive_contract' && (
            <div className="space-y-4">
              {executiveContract ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <h4 className="font-bold text-sm text-gray-800">🏛️ مصوبه و صورتجلسه شورای اجرایی</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">{executiveContract.minutes || 'مصوبه‌ای ثبت نشده است'}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">مصوبه‌ای از شورای اجرایی ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* تب مراحل اجرایی (پوشش کامل فیلدها - حل اولویت ۶) */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              {[
                { label: 'مرحله ۲۰٪ (تعریف و تدوین پروپوزال)', data: stage20 },
                { label: 'مرحله ۵۰٪ (گزارش میانی و آزمون)', data: stage50 },
                { label: 'مرحله ۱۰۰٪ (دفاع نهایی و تحویل‌گیری)', data: stage100 },
              ].map((stage, idx) => (
                <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                  <h5 className="font-bold text-xs text-purple-800">{stage.label}</h5>
                  {stage.data ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block">پروپوزال / شرح:</span>
                        <span className="font-semibold">{stage.data.proposal || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">تاریخ دفاع:</span>
                        <span className="font-semibold">{stage.data.defenseDate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">شماره صورتجلسه:</span>
                        <span className="font-semibold">{stage.data.minutes || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">اعتبار پرداختی:</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(stage.data.paidAmount)} ریال</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">اطلاعاتی ثبت نشده است</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* تب کاربست (پوشش کامل فیلدها - حل اولویت ۶) */}
          {activeTab === 'application' && (
            <div className="space-y-4">
              {application ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">نوع کاربست</span>
                      <p className="text-sm font-semibold text-gray-800">{application.applicationType || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">تاریخ کاربست</span>
                      <p className="text-sm font-semibold text-gray-800">{application.applicationDate || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">کارگروه کاربست</span>
                      <p className="text-sm font-semibold text-gray-800">{application.workingGroup || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">شماره صورتجلسه</span>
                      <p className="text-sm font-semibold text-gray-800">{application.minutes || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-400 block mb-1">بازتاب نتایج در یگان‌ها و توان رزم</span>
                    <p className="text-sm text-gray-800 leading-relaxed">{application.resultReflection || '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">اطلاعات کاربست نتایج هنوز ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* تب فایل‌ها و پیوست‌ها (نمایش عملیاتی و دانلود امن - حل اولویت ۵) */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              {attachments && attachments.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {attachments.map((att: any) => {
                    const downloadUrl = `/api/issues/${issue.id}/attachment/${att.id}/download`;
                    return (
                      <div key={att.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{att.fileName}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                              <span>حجم: {formatFileSize(att.fileSize)}</span>
                              {att.uploadedAt && (
                                <span>تاریخ بارگذاری: {formatPersianDateTime(att.uploadedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <a
                          href={downloadUrl}
                          download
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-200"
                        >
                          <Download size={13} />
                          <span>دریافت فایل</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  <Paperclip size={24} className="mx-auto mb-2 opacity-40" />
                  <span>هنوز هیچ فایل پیوستی برای این مسئله بارگذاری نشده است.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            شناسنامه تفصیلی نظام مسائل دانا
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-medium transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueDetailsModal;
