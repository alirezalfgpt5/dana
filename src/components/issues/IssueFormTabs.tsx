// src/components/issues/IssueFormTabs.tsx
// فرم تب‌بندی شده برای ثبت/ویرایش مسئله - نسخه نهایی ۳.۰

import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, X, Plus, Trash2, Calendar, FileText, 
  Users, DollarSign, Clock, CheckCircle, AlertCircle,
  Building2, UserCog, File as FileIcon, Link, Settings, 
  ClipboardList, BookOpen, RefreshCw, Upload,
  Download, Eye, EyeOff, HelpCircle
} from 'lucide-react';
import RawDatePicker from 'react-multi-date-picker';
import rawPersian from 'react-date-object/calendars/persian';
import rawPersianFa from 'react-date-object/locales/persian_fa';
import rawTransition from 'react-element-popper/animations/transition';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../ui/SearchableSelect';
import { api } from '../../services/api';

// Safe extraction of CJS/ESM exports for react-multi-date-picker and plugins
const resolveComponent = (comp: any) => {
  if (!comp) return null;
  if (comp.$typeof || typeof comp === 'function') return comp;
  if (comp.default?.$typeof || typeof comp.default === 'function') return comp.default;
  if (comp.default?.default?.$typeof || typeof comp.default?.default === 'function') return comp.default.default;
  return comp.default || comp;
};

const DatePicker: any = resolveComponent(RawDatePicker);
const persian: any = (rawPersian as any)?.default || rawPersian;
const persian_fa: any = (rawPersianFa as any)?.default || rawPersianFa;
const transition: any = () => {
  try {
    const fn = (rawTransition as any)?.default || rawTransition;
    if (typeof fn === 'function') return fn();
  } catch {}
  return undefined;
};

interface IssueFormTabsProps {
  initialData?: any;
  onSave: (data: any) => Promise<any>;
  onCancel: () => void;
  onUploadAttachment?: (issueId: number, file: File) => Promise<any>;
  templates?: any[];
  knowledgeTypes?: string[];
  projectLevels?: string[];
  approvalAuthorities?: string[];
  researchProjectTypes?: string[];
  knowledgeProjectTypes?: string[];
  eventTypes?: string[];
  scientificDiplomacyLevels?: string[];
  confidentialityLevels?: string[];
  statuses?: string[];
  loading?: boolean;
}

export function IssueFormTabs({
  initialData,
  onSave,
  onCancel,
  onUploadAttachment,
  templates = [],
  knowledgeTypes = ['نظریه', 'الگو', 'راهبرد', 'راه‌کار و توصیه', 'دانش نوظهور', 'معماری', 'دانش فنی', 'نقشه‌راه', 'ایده', 'سناریو', 'خلاقیت و نوآوری'],
  projectLevels = ['راهبردی', 'سطح1', 'سطح2', 'سطح3', 'سطح4'],
  approvalAuthorities = ['نهاجا (رده دانشی و پژوهشی)', 'نهاجا (شورای عالی دانش و پژوهش)', 'آجا (معاونت عتف)', 'ستاد کل (معاونت عتف)'],
  researchProjectTypes = ['مأموریتی مرتبط با توان رزم', 'تبیین', 'آینده‌پژوهی', 'حمایت از پایان‌نامه', 'نخبگان وظیفه', 'همکاران تحقیقاتی', 'اندیشه‌ورزی', 'بررسی ستادی', 'نقد و مناظره', 'نظریه‌پردازی', 'تدوین سازوکارها', 'بازنگری در سازوکارها', 'تعمیم فناوری نرم'],
  knowledgeProjectTypes = ['مستندسازی', 'تجربه‌نگاری', 'تاریخ‌شفاهی', 'نشر کتاب', 'پیوست مدیریت دانش رخدادها', 'کتب مرجع (دانشنامه، فرهنگنامه، اطلس)'],
  eventTypes = ['همایش', 'جشنواره', 'سمینار', 'کارگاه', 'نشست‌های تخصصی', 'هم‌اندیشی', 'میزهای تخصصی'],
  scientificDiplomacyLevels = ['درون‌رده دانشی و پژوهشی', 'درون‌نیرویی', 'درون‌سازمانی', 'بین‌سازمانی', 'کشوری'],
  confidentialityLevels = ['عمومی', 'محرمانه', 'سری', 'بسیار سری'],
  statuses = ['pending', 'in_progress', 'completed', 'canceled', 'on_hold'],
  loading = false,
}: IssueFormTabsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<any>({
    domainNodeId: '',
    title: '',
    category: '',
    solutionDirection: '',
    responsibleUnit: '',
    confidentialityLevel: 'عمومی',
    actionPriority: 'متوسط',
    approvalDate: '',
    knowledgeType: '',
    projectLevel: 'سطح1',
    approvalAuthority: '',
    researchProjectType: '',
    knowledgeProjectType: '',
    events: '',
    macroProject: null,
    scientificDiplomacy: '',
    collaborators: '',
    collaborationNetwork: null,
    referenceDocument: '',
    requiredBudget: 0,
    approvedBudget: 0,
    assignedBudget: 0,
    expectedMonths: 0,
    completionPercent: 0,
    actionsTaken: '',
    bottlenecks: '',
    orders: '',
    issueResolutionTeam: null,
    needStatement: null,
    contract: null,
    stage20: null,
    stage50: null,
    stage100: null,
    application: null,
    status: 'pending',
    templateIds: [],
  });

  // تبدیل امن مقادیر تاریخ به شیء قابل خواندن برای DatePicker
  const safeDateForPicker = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(val)) {
        return val;
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      return val;
    }
    return val;
  };

  // قالب‌بندی امن خروجی انتخاب تاریخ به رشته جلالی
  const formatPickerDate = (date: any) => {
    if (!date) return '';
    if (date.format) return date.format('YYYY/MM/DD');
    if (date.toDate) {
      try {
        const d = date.toDate();
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {}
    }
    return String(date);
  };

  const issueCategories = [
    'فنی و مهندسی',
    'عملیاتی و رزمی',
    'آموزشی و مهارتی',
    'فاوا و فناوری اطلاعات',
    'ساختاری و سازمانی',
    'پژوهشی و مطالعاتی',
    'پشتیبانی و لجستیک',
    'نوآوری و فناوری‌های نوظهور',
    'عمومی و سایر'
  ];

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [needStatementData, setNeedStatementData] = useState<any>({
    user: '',
    problem: '',
    suggestedBudget: 0,
    level: '',
    file: null as File | null,
    approvalStatus: 'pending',
    approvalDate: '',
    approvedAmount: 0,
  });
  const [contractData, setContractData] = useState<any>({
    number: '',
    executor: '',
    collaborators: [] as string[],
    agents: [] as string[],
    date: '',
    duration: 0,
    startDate: '',
    amount: 0,
  });
  const [executiveContractData, setExecutiveContractData] = useState<any>({
    file: null as File | null,
    minutes: '',
  });
  const [stage20Data, setStage20Data] = useState<any>({
    proposal: '',
    file: null as File | null,
    defenseDate: '',
    minutes: '',
    minutesFile: null as File | null,
    recordsFiles: [] as File[],
    paidAmount: 0,
    paymentDate: '',
  });
  const [stage50Data, setStage50Data] = useState<any>({
    file: null as File | null,
    defenseDate: '',
    minutes: '',
    minutesFile: null as File | null,
    recordsFiles: [] as File[],
    paidAmount: 0,
    paymentDate: '',
  });
  const [stage100Data, setStage100Data] = useState<any>({
    file: null as File | null,
    defenseDate: '',
    minutes: '',
    minutesFile: null as File | null,
    recordsFiles: [] as File[],
    paidAmount: 0,
    paymentDate: '',
  });
  const [applicationData, setApplicationData] = useState<any>({
    resultReflection: '',
    applicationType: '',
    applicationDate: '',
    minutes: '',
    minutesFile: null as File | null,
    recordsFiles: [] as File[],
    workingGroup: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [domainNodes, setDomainNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [researchItems, setResearchItems] = useState<any[]>([]);
  
  const [dynamicKnowledgeTypes, setDynamicKnowledgeTypes] = useState<string[]>(knowledgeTypes);
  const [dynamicResearchProjectTypes, setDynamicResearchProjectTypes] = useState<string[]>(researchProjectTypes);
  const [dynamicEventTypes, setDynamicEventTypes] = useState<string[]>(eventTypes);

  const [dynamicProjectLevels, setDynamicProjectLevels] = useState<string[]>(projectLevels);
  const [dynamicApprovalAuthorities, setDynamicApprovalAuthorities] = useState<string[]>(approvalAuthorities);
  const [dynamicKnowledgeProjectTypes, setDynamicKnowledgeProjectTypes] = useState<string[]>(knowledgeProjectTypes);
  const [dynamicScientificDiplomacyLevels, setDynamicScientificDiplomacyLevels] = useState<string[]>(scientificDiplomacyLevels);
  const [dynamicConfidentialityLevels, setDynamicConfidentialityLevels] = useState<string[]>(confidentialityLevels);
  const [dynamicActionPriorities, setDynamicActionPriorities] = useState<string[]>(['خیلی زیاد', 'زیاد', 'متوسط']);


  
  useEffect(() => {
    if (formData.researchItemId && researchItems.length > 0) {
      const rItem = researchItems.find(r => String(r.id) === String(formData.researchItemId));
      if (rItem?.node?.templateIds) {
        const requiredTemplateIds = (Array.isArray(rItem.node.templateIds) ? rItem.node.templateIds : (rItem.node.templateIds ? String(rItem.node.templateIds).split(',').filter(Boolean) : []));
        setFormData((prev: any) => ({ ...prev, templateIds: requiredTemplateIds }));
      }
    }
  }, [formData.researchItemId, researchItems]);

  useEffect(() => {
    // Fetch domain nodes, research items, and dynamic metadata
    const fetchData = async () => {
      try {
        const nodes = await api.get('/api/trees/domain-nodes/all');
        setDomainNodes(nodes as unknown as any[]);
        
        const research = await api.get('/api/research/all/with-nodes');
        setResearchItems(research as unknown as any[]);
        
        // Fetch dynamic metadata
        const fetchMeta = async (path: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
          try {
            const data = await api.get('/api/metadata/' + path) as unknown as any[];
            if (data && data.length > 0) setter(data.map(d => d.name));
          } catch (e) {
            console.error('Error fetching ' + path);
          }
        };

        await Promise.all([
          fetchMeta('knowledge-types', setDynamicKnowledgeTypes),
          fetchMeta('research-project-types', setDynamicResearchProjectTypes),
          fetchMeta('event-types', setDynamicEventTypes),
          fetchMeta('project-levels', setDynamicProjectLevels),
          fetchMeta('approval-authorities', setDynamicApprovalAuthorities),
          fetchMeta('knowledge-project-types', setDynamicKnowledgeProjectTypes),
          fetchMeta('scientific-diplomacy-levels', setDynamicScientificDiplomacyLevels),
          fetchMeta('confidentiality-levels', setDynamicConfidentialityLevels),
          fetchMeta('action-priorities', setDynamicActionPriorities),
        ]);

      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const availableTemplates = formData.researchItemId
    ? templates.filter(t => {
        const rItem = researchItems.find(r => String(r.id) === String(formData.researchItemId));
        if (!rItem?.node?.templateIds) return false;
        return (Array.isArray(rItem.node.templateIds) ? rItem.node.templateIds : (rItem.node.templateIds ? String(rItem.node.templateIds).split(',').filter(Boolean) : [])).includes(String(t.id));
      })
    : templates;

  const rootTemplates = availableTemplates.filter(t => t.parentId === null);
  const concreteTemplates = availableTemplates.filter(t => t.parentId !== null);
  const groupedTemplates = rootTemplates.reduce((acc: any, root) => {
    const children = concreteTemplates.filter(t => t.parentId === root.id);
    acc[root.title] = { root, children };
    return acc;
  }, {});

  useEffect(() => {
    if (initialData) {
      // استخراج و سینک صحیح شناسه‌های قالب‌ها جهت چک‌باکس‌های فرم
      const initialTemplateIds = (initialData.templateIds && Array.isArray(initialData.templateIds))
        ? initialData.templateIds.map(String)
        : Array.isArray(initialData.templates)
          ? initialData.templates.map((t: any) => String(t.id !== undefined ? t.id : t))
          : [];

      setFormData({
        ...initialData,
        category: initialData.category || '',
        templateIds: initialTemplateIds,
      });
      
      const safeParse = (data: any, defaultVal: any = null) => {
        if (!data) return defaultVal;
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            return parsed !== null && parsed !== undefined ? parsed : defaultVal;
          } catch {
            return defaultVal;
          }
        }
        return data;
      };

      const parsedTeam = safeParse(initialData.issueResolutionTeam, []);
      setTeamMembers(Array.isArray(parsedTeam) ? parsedTeam : []);

      const parsedNeed = safeParse(initialData.needStatement, {});
      setNeedStatementData({
        user: parsedNeed?.user || '',
        problem: parsedNeed?.problem || '',
        suggestedBudget: Number(parsedNeed?.suggestedBudget) || 0,
        level: parsedNeed?.level || '',
        file: parsedNeed?.file || null,
        approvalStatus: parsedNeed?.approvalStatus || 'pending',
        approvalDate: parsedNeed?.approvalDate || '',
        approvedAmount: Number(parsedNeed?.approvedAmount) || 0,
      });

      const parsedContract = safeParse(initialData.contract, {});
      let rawCollabs = parsedContract?.collaborators;
      if (typeof rawCollabs === 'string') {
        rawCollabs = rawCollabs.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (!Array.isArray(rawCollabs)) {
        rawCollabs = [];
      }
      let rawAgents = parsedContract?.agents;
      if (typeof rawAgents === 'string') {
        rawAgents = rawAgents.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (!Array.isArray(rawAgents)) {
        rawAgents = [];
      }
      setContractData({
        number: parsedContract?.number || '',
        executor: parsedContract?.executor || '',
        collaborators: rawCollabs,
        agents: rawAgents,
        date: parsedContract?.date || '',
        duration: Number(parsedContract?.duration) || 0,
        startDate: parsedContract?.startDate || '',
        amount: Number(parsedContract?.amount) || 0,
        file: parsedContract?.file || null,
      });

      const parsedExec = safeParse(initialData.executiveContract, {});
      setExecutiveContractData({
        file: parsedExec?.file || null,
        minutes: parsedExec?.minutes || '',
      });

      const parseStage = (stageObj: any) => {
        const p = safeParse(stageObj, {});
        return {
          proposal: p?.proposal || '',
          file: p?.file || null,
          defenseDate: p?.defenseDate || '',
          minutes: p?.minutes || '',
          minutesFile: p?.minutesFile || null,
          recordsFiles: Array.isArray(p?.recordsFiles) ? p.recordsFiles : [],
          paidAmount: Number(p?.paidAmount) || 0,
          paymentDate: p?.paymentDate || '',
        };
      };

      setStage20Data(parseStage(initialData.stage20));
      setStage50Data(parseStage(initialData.stage50));
      setStage100Data(parseStage(initialData.stage100));

      const parsedApp = safeParse(initialData.application, {});
      setApplicationData({
        resultReflection: parsedApp?.resultReflection || '',
        applicationType: parsedApp?.applicationType || '',
        applicationDate: parsedApp?.applicationDate || '',
        minutes: parsedApp?.minutes || '',
        minutesFile: parsedApp?.minutesFile || null,
        recordsFiles: Array.isArray(parsedApp?.recordsFiles) ? parsedApp.recordsFiles : [],
        workingGroup: parsedApp?.workingGroup || '',
      });
    } else {
      setFormData({
        domainNodeId: '',
        title: '',
        category: '',
        solutionDirection: '',
        responsibleUnit: '',
        confidentialityLevel: 'عمومی',
        actionPriority: 'متوسط',
        approvalDate: '',
        knowledgeType: '',
        projectLevel: 'سطح1',
        approvalAuthority: '',
        researchProjectType: '',
        knowledgeProjectType: '',
        events: '',
        macroProject: null,
        scientificDiplomacy: '',
        collaborators: '',
        collaborationNetwork: null,
        referenceDocument: '',
        requiredBudget: 0,
        approvedBudget: 0,
        assignedBudget: 0,
        expectedMonths: 0,
        completionPercent: 0,
        actionsTaken: '',
        bottlenecks: '',
        orders: '',
        issueResolutionTeam: null,
        needStatement: null,
        contract: null,
        stage20: null,
        stage50: null,
        stage100: null,
        application: null,
        status: 'pending',
        templateIds: [],
      });
      setTeamMembers([]);
      setNeedStatementData({
        user: '', problem: '', suggestedBudget: 0, level: '', file: null,
        approvalStatus: 'pending', approvalDate: '', approvedAmount: 0
      });
      setContractData({
        number: '', executor: '', collaborators: [], agents: [], date: '',
        duration: 0, startDate: '', amount: 0, file: null
      });
      setExecutiveContractData({ file: null, minutes: '' });
      setStage20Data({ proposal: '', file: null, defenseDate: '', minutes: '', minutesFile: null, recordsFiles: [], paidAmount: 0, paymentDate: '' });
      setStage50Data({ proposal: '', file: null, defenseDate: '', minutes: '', minutesFile: null, recordsFiles: [], paidAmount: 0, paymentDate: '' });
      setStage100Data({ proposal: '', file: null, defenseDate: '', minutes: '', minutesFile: null, recordsFiles: [], paidAmount: 0, paymentDate: '' });
      setApplicationData({ resultReflection: '', applicationType: '', applicationDate: '', minutes: '', minutesFile: null, recordsFiles: [], workingGroup: '' });
    }
  }, [initialData]);

  const tabs = [
    { id: 'need', label: ' بیانیه نیاز', icon: FileText },
    { id: 'general', label: ' اطلاعات کلی', icon: Settings },
    { id: 'projects', label: ' پروژه‌ها', icon: ClipboardList },
    { id: 'collaboration', label: ' همکاری‌ها', icon: Users },
    { id: 'budget', label: ' بودجه و زمان', icon: DollarSign },
    { id: 'actions', label: ' اقدامات', icon: CheckCircle },
    { id: 'team', label: ' کارگروه', icon: UserCog },
    { id: 'contract', label: ' قرارداد', icon: FileIcon },
    { id: 'executive_contract', label: ' قرارداد شورای اجرایی', icon: Users },
    { id: 'stages', label: ' مراحل', icon: Clock },
    { id: 'application', label: ' کاربست', icon: RefreshCw },
  ];

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleTemplateToggle = (templateId: string) => {
    setFormData((prev: any) => {
      const current = prev.templateIds || [];
      const exists = current.includes(templateId);
      return {
        ...prev,
        templateIds: exists ? current.filter((id: string) => id !== templateId) : [...current, templateId],
      };
    });
  };

  const handleAddTeamMember = () => {
    const newMember = {
      id: Date.now(),
      name: '',
      rank: '',
      unit: '',
      phone: '',
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  const handleRemoveTeamMember = (id: number) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id));
  };

  const handleTeamMemberChange = (id: number, field: string, value: string) => {
    setTeamMembers(teamMembers.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleFileUpload = (field: string, file: File | null) => {
    // در اینجا می‌توانید منطق آپلود فایل را پیاده‌سازی کنید
    toast.success(`📎 فایل "${file?.name}" برای ${field} انتخاب شد`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.domainNodeId || !formData.title) {
      toast.error('❌ حوزه و عنوان مسئله الزامی است');
      return;
    }

    const prepareJson = (data: any) => {
      if (!data) return null;
      const cleanData = { ...data };
      if (cleanData.file && cleanData.file instanceof File) {
        cleanData.file = { name: cleanData.file.name };
      }
      return cleanData;
    };

    const submitData = {
      ...formData,
      category: formData.category || 'عمومی',
      domainNodeId: parseInt(formData.domainNodeId),
      researchItemId: formData.researchItemId ? parseInt(formData.researchItemId) : null,
      requiredBudget: parseFloat(formData.requiredBudget) || 0,
      approvedBudget: parseFloat(formData.approvedBudget) || 0,
      assignedBudget: parseFloat(formData.assignedBudget) || 0,
      expectedMonths: parseInt(formData.expectedMonths) || 0,
      completionPercent: parseInt(formData.completionPercent) || 0,
      issueResolutionTeam: teamMembers.length > 0 ? teamMembers : null,
      needStatement: prepareJson(needStatementData),
      contract: prepareJson(contractData),
      executiveContract: prepareJson(executiveContractData),
      stage20: prepareJson(stage20Data),
      stage50: prepareJson(stage50Data),
      stage100: prepareJson(stage100Data),
      application: prepareJson(applicationData),
    };

    try {
      const savedIssue = await onSave(submitData);
      
      if (savedIssue && savedIssue.id && onUploadAttachment) {
        const uploadPromises: Promise<any>[] = [];
        
        if (needStatementData?.file instanceof File) {
          uploadPromises.push(onUploadAttachment(savedIssue.id, needStatementData.file));
        }
        if (contractData?.file instanceof File) {
          uploadPromises.push(onUploadAttachment(savedIssue.id, contractData.file));
        }
        if (executiveContractData?.file instanceof File) {
          uploadPromises.push(onUploadAttachment(savedIssue.id, executiveContractData.file));
        }
        if (formData.macroProject?.file instanceof File) {
          uploadPromises.push(onUploadAttachment(savedIssue.id, formData.macroProject.file));
        }

        const stages = [stage20Data, stage50Data, stage100Data, applicationData];
        for (const stage of stages) {
          if (stage?.file instanceof File) {
            uploadPromises.push(onUploadAttachment(savedIssue.id, stage.file));
          }
          if (stage?.minutesFile instanceof File) {
            uploadPromises.push(onUploadAttachment(savedIssue.id, stage.minutesFile));
          }
          if (Array.isArray(stage?.recordsFiles)) {
            for (const file of stage.recordsFiles) {
              if (file instanceof File) {
                uploadPromises.push(onUploadAttachment(savedIssue.id, file as File));
              }
            }
          }
        }
        
        if (uploadPromises.length > 0) {
          toast.loading('در حال آپلود فایل‌های پیوست...', { id: 'upload-toast' });
          await Promise.allSettled(uploadPromises);
          toast.success('فایل‌های پیوست با موفقیت آپلود شدند', { id: 'upload-toast' });
        }
      }
      
    } catch (error) {
      // خطا قبلاً مدیریت شده
    }
  };

  const statusOptions = statuses.map(s => ({
    value: s,
    label: s === 'pending' ? '⏳ در انتظار' :
           s === 'in_progress' ? '🔄 در حال اجرا' :
           s === 'completed' ? '✅ تکمیل شده' :
           s === 'canceled' ? '❌ لغو شده' :
           s === 'on_hold' ? '⏸️ متوقف' : s,
  }));

  const renderGeneralTab = () => (
    <div className="space-y-4">
      {formData.gapId && !formData.researchItemId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex gap-3 items-start">
          <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <strong className="font-bold block mb-1">تبدیل شکاف به مسئله و آیتم پژوهشی</strong>
            شما در حال تعریف یک مسئله جدید برای حل یک <b>شکاف دانشی</b> هستید. پس از ذخیره، سیستم به‌طور خودکار یک <b>آیتم پژوهشی</b> برای این شکاف ایجاد کرده و آن را به این مسئله متصل می‌کند.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔍 مرتبط با آیتم پژوهشی (اختیاری - بر اساس شکاف دانشی)
          </label>
          <SearchableSelect
            options={researchItems.map(r => ({ 
              value: String(r.id), 
              label: `${r.node?.title || 'نامشخص'} - ${r.treeName} (${r.status === 'proposed' ? 'پیشنهادی' : 'تایید شده'})` 
            }))}
            value={formData.researchItemId ? String(formData.researchItemId) : ''}
            onChange={val => handleChange('researchItemId', val)}
            placeholder={formData.gapId ? "یک آیتم پژوهشی به‌صورت خودکار ایجاد خواهد شد" : "انتخاب آیتم پژوهشی برای پر کردن شکاف..."}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📂 حوزه <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
  options={(() => {
    // اطمینان از اینکه domainNodes یک آرایه است
    const nodesArray = Array.isArray(domainNodes) ? domainNodes : [];
    const opts = nodesArray.map((n: any) => ({ 
      value: String(n.id), 
      label: `${n.title} (${n.treeName})` 
    }));
    if (formData.domainNodeId && formData.domain && !opts.find(o => o.value === String(formData.domainNodeId))) {
      opts.unshift({ value: String(formData.domainNodeId), label: formData.domain });
    }
    return opts;
  })()}
  value={formData.domainNodeId ? String(formData.domainNodeId) : ''}
  onChange={val => handleChange('domainNodeId', val)}
  placeholder="انتخاب حوزه..."
/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📌 عنوان مسئله <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="عنوان عینی و شفاف..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🧭 جهت‌گیری راه‌حل
        </label>
        <textarea
          value={formData.solutionDirection || ''}
          onChange={e => handleChange('solutionDirection', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="رویکرد کلی برای حل مسئله..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏷️ دسته‌بندی مسئله
          </label>
          <SearchableSelect
            options={issueCategories.map(cat => ({ value: cat, label: cat }))}
            value={formData.category || ''}
            onChange={(val) => handleChange('category', val || '')}
            placeholder="انتخاب دسته‌بندی مسئله..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏢 دستگاه یا یگان مسئول
          </label>
          <input
            type="text"
            value={formData.responsibleUnit || ''}
            onChange={e => handleChange('responsibleUnit', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="واحد متولی اجرا..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔒 سطح محرمانگی
          </label>
          <SearchableSelect
            options={dynamicConfidentialityLevels.map(c => ({ value: c, label: c }))}
            value={formData.confidentialityLevel}
            onChange={(val) => handleChange('confidentialityLevel', val || 'عمومی')}
            placeholder="انتخاب سطح محرمانگی..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🎯 اولویت اقدام
          </label>
          <SearchableSelect
            options={dynamicActionPriorities.map(p => ({ value: p, label: p }))}
            value={formData.actionPriority}
            onChange={(val) => handleChange('actionPriority', val || 'متوسط')}
            placeholder="انتخاب اولویت..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📅 تاریخ تصویب
          </label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(formData.approvalDate)}
              onChange={(date: any) => handleChange('approvalDate', formatPickerDate(date))}
              calendar={persian}
              locale={persian_fa}
              animations={[transition()]}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🏛️ مرجع تصویب
          </label>
          <SearchableSelect
            options={dynamicApprovalAuthorities.map(a => ({ value: a, label: a }))}
            value={formData.approvalAuthority}
            onChange={(val) => handleChange('approvalAuthority', val || '')}
            placeholder="انتخاب مرجع تصویب..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📚 نوع‌شناسی دانش
          </label>
          <SearchableSelect
            options={dynamicKnowledgeTypes.map(k => ({ value: k, label: k }))}
            value={formData.knowledgeType}
            onChange={(val) => handleChange('knowledgeType', val || '')}
            placeholder="انتخاب نوع دانش..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📊 سطح پروژه
          </label>
          <SearchableSelect
            options={dynamicProjectLevels.map(p => ({ value: p, label: p }))}
            value={formData.projectLevel}
            onChange={(val) => handleChange('projectLevel', val || 'سطح1')}
            placeholder="انتخاب سطح پروژه..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📋 قالب‌های مجاز
          <span className="text-xs text-gray-400 mr-1">(سینک با آیتم پژوهشی / درختواره مورد نیاز)</span>
        </label>
        <div className="space-y-3 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
          {Object.keys(groupedTemplates).length > 0 ? (
            Object.entries(groupedTemplates).map(([type, group]: [string, any]) => {
              const rootChecked = formData.templateIds?.includes(String(group.root.id)) || false;
              return (
              <div key={type} className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rootChecked}
                    onChange={() => handleTemplateToggle(String(group.root.id))}
                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-700">{type}</span>
                  <span className="text-[10px] text-gray-400 font-normal mr-auto bg-gray-100 px-1.5 py-0.5 rounded">
                    نوع قالب
                  </span>
                </label>
                {group.children.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    {group.children.map((template: any) => {
                      const isChecked = formData.templateIds?.includes(String(template.id)) || false;
                      return (
                        <label
                          key={template.id}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all
                            ${isChecked
                               ? 'bg-blue-100 border border-blue-300 text-blue-700'
                               : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTemplateToggle(String(template.id))}
                            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span>{template.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )})
          ) : (
            <span className="text-sm text-gray-400">هیچ قالبی تعریف نشده است</span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          💡 قالب‌ها با درختواره مورد نیاز سینک می‌شوند
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📌 وضعیت
        </label>
        <SearchableSelect
          options={statusOptions}
          value={formData.status}
          onChange={(val) => handleChange('status', val || 'pending')}
          placeholder="انتخاب وضعیت..."
        />
      </div>
    </div>
  );

  const renderProjectsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            🔬 پروژه پژوهشی
          </label>
          <SearchableSelect
            options={dynamicResearchProjectTypes.map(r => ({ value: r, label: r }))}
            value={formData.researchProjectType}
            onChange={(val) => handleChange('researchProjectType', val || '')}
            placeholder="انتخاب نوع پروژه پژوهشی..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📚 پروژه دانشی
          </label>
          <SearchableSelect
            options={dynamicKnowledgeProjectTypes.map(k => ({ value: k, label: k }))}
            value={formData.knowledgeProjectType}
            onChange={(val) => handleChange('knowledgeProjectType', val || '')}
            placeholder="انتخاب نوع پروژه دانشی..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🎪 رویدادها
        </label>
        <SearchableSelect
          options={dynamicEventTypes.map(e => ({ value: e, label: e }))}
          value={formData.events}
          onChange={(val) => handleChange('events', val || '')}
          placeholder="انتخاب رویداد..."
        />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
        <h4 className="font-medium text-gray-700 text-sm mb-3">🏗️ اطلاعات کلان‌پروژه</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">عنوان کلان‌پروژه</label>
            <input
              type="text"
              value={formData.macroProject?.title || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="عنوان..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">مدیر/مسئول</label>
            <input
              type="text"
              value={formData.macroProject?.manager || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, manager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="نام مسئول..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">شماره نامه ابلاغی</label>
            <input
              type="text"
              value={formData.macroProject?.letterNumber || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, letterNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شماره نامه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">تاریخ نامه ابلاغی</label>
            <input
              type="text"
              value={formData.macroProject?.letterDate || ''}
              onChange={e => handleChange('macroProject', { ...formData.macroProject, letterDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="تاریخ نامه..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">آپلود نامه ابلاغی (فایل)</label>
            <input
              type="file"
              onChange={e => handleChange('macroProject', { ...formData.macroProject, file: e.target.files?.[0] || null })}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">توضیحات تکمیلی</label>
          <textarea
            value={formData.macroProject?.description || formData.macroProject?.text || ''}
            onChange={e => handleChange('macroProject', { ...formData.macroProject, description: e.target.value, text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm min-h-[80px]"
            placeholder="توضیحات کلان‌پروژه..."
          />
        </div>
      </div>
    </div>
  );

  const renderCollaborationTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🌐 دیپلماسی علمی
        </label>
        <SearchableSelect
          options={dynamicScientificDiplomacyLevels.map(s => ({ value: s, label: s }))}
          value={formData.scientificDiplomacy}
          onChange={(val) => handleChange('scientificDiplomacy', val || '')}
          placeholder="انتخاب سطح دیپلماسی علمی..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🤝 همکاری با کجاها
        </label>
        <input
          type="text"
          value={formData.collaborators || ''}
          onChange={e => handleChange('collaborators', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام دستگاه‌ها یا نهادهای همکار..."
        />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
        <h4 className="font-medium text-gray-700 text-sm mb-3">🌐 جزئیات شبکه همکاران</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">همکاران داخلی</label>
            <input
              type="text"
              value={formData.collaborationNetwork?.internal || ''}
              onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, internal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شوراها و دبیرخانه‌های داخلی..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">همکاران خارجی/بین‌المللی</label>
            <input
              type="text"
              value={formData.collaborationNetwork?.external || ''}
              onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, external: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="نهادهای بین‌المللی..."
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">توضیحات شبکه</label>
          <textarea
            value={formData.collaborationNetwork?.description || formData.collaborationNetwork?.text || ''}
            onChange={e => handleChange('collaborationNetwork', { ...formData.collaborationNetwork, description: e.target.value, text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm min-h-[80px]"
            placeholder="توضیحات نحوه همکاری..."
          />
        </div>
      </div>
    </div>
  );

  const renderBudgetTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📄 عنوان دانش و پژوهش مرجع تصویب
        </label>
        <input
          type="text"
          value={formData.referenceDocument || ''}
          onChange={e => handleChange('referenceDocument', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
          placeholder="ارجاع به سند بالادستی..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            💰 بودجه مورد نیاز
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ریال</span>
            <input
              type="number"
              value={formData.requiredBudget || 0}
              onChange={e => handleChange('requiredBudget', parseFloat(e.target.value) || 0)}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ✅ بودجه مصوب
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ریال</span>
            <input
              type="number"
              value={formData.approvedBudget || 0}
              onChange={e => handleChange('approvedBudget', parseFloat(e.target.value) || 0)}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📤 بودجه واگذار شده
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ریال</span>
            <input
              type="number"
              value={formData.assignedBudget || 0}
              onChange={e => handleChange('assignedBudget', parseFloat(e.target.value) || 0)}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ⏱️ زمان به ماه
          </label>
          <input
            type="number"
            value={formData.expectedMonths || 0}
            onChange={e => handleChange('expectedMonths', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="تعداد ماه مورد انتظار..."
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📊 درصد انجام
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={formData.completionPercent ?? 0}
              onChange={e => handleChange('completionPercent', e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActionsTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ✅ اهم اقدامات صورت‌گرفته
        </label>
        <textarea
          value={formData.actionsTaken || ''}
          onChange={e => handleChange('actionsTaken', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="شرح اقدامات اجرا شده..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          🚧 گلوگاه‌ها
        </label>
        <textarea
          value={formData.bottlenecks || ''}
          onChange={e => handleChange('bottlenecks', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="موانع و چالش‌های موجود..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📋 اوامر
        </label>
        <textarea
          value={formData.orders || ''}
          onChange={e => handleChange('orders', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[80px]"
          placeholder="دستورات ویژه یا ابلاغی..."
        />
      </div>
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-700 text-sm">👥 کارگروه حل نظام مسائل</h4>
        <button
          type="button"
          onClick={handleAddTeamMember}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          افزودن عضو
        </button>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          <Users size={32} className="mx-auto mb-2 text-gray-300" />
          <p>هیچ عضوی به کارگروه اضافه نشده است</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teamMembers.map((member, index) => (
            <div key={member.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-400 w-6">{index + 1}</span>
              <input
                type="text"
                placeholder="👤 نام"
                value={member.name}
                onChange={e => handleTeamMemberChange(member.id, 'name', e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="🎖️ درجه"
                value={member.rank}
                onChange={e => handleTeamMemberChange(member.id, 'rank', e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="🏢 یگان"
                value={member.unit}
                onChange={e => handleTeamMemberChange(member.id, 'unit', e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="📞 تلفن"
                value={member.phone}
                onChange={e => handleTeamMemberChange(member.id, 'phone', e.target.value)}
                className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <button
                type="button"
                onClick={() => handleRemoveTeamMember(member.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        📝 شامل: درجه، نام، نشان، یگان، تلفن
      </p>
    </div>
  );

  const renderNeedTab = () => (
    <div className="space-y-4">
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">👤 کاربر ذینفع</label>
          <input
            type="text"
            value={needStatementData?.user || ''}
            onChange={e => setNeedStatementData({...needStatementData, user: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نام کاربر ذینفع..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📊 سطح</label>
          <input
            type="text"
            value={needStatementData?.level || ''}
            onChange={e => setNeedStatementData({...needStatementData, level: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="سطح نیاز..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📝 بیان مسئله</label>
        <textarea
          value={needStatementData?.problem || ''}
          onChange={e => setNeedStatementData({...needStatementData, problem: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="شرح مسئله..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 اعتبار پیشنهادی</label>
          <input
            type="number"
            value={needStatementData?.suggestedBudget || 0}
            onChange={e => setNeedStatementData({...needStatementData, suggestedBudget: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📎 فایل</label>
          <input
            type="file"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setNeedStatementData({...needStatementData, file});
              if (file) handleFileUpload('بیانیه نیاز', file);
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📌 وضعیت تصویب</label>
          <select
            value={needStatementData?.approvalStatus || 'pending'}
            onChange={e => setNeedStatementData({...needStatementData, approvalStatus: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          >
            <option value="pending">⏳ در انتظار</option>
            <option value="approved">✅ تصویب شد</option>
            <option value="rejected">❌ تصویب نشد</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ تصویب</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(needStatementData?.approvalDate)}
              onChange={(date: any) => setNeedStatementData({...needStatementData, approvalDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 مبلغ تصویب</label>
          <input
            type="number"
            value={needStatementData?.approvedAmount || 0}
            onChange={e => setNeedStatementData({...needStatementData, approvedAmount: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
            min="0"
          />
        </div>
      </div>
    </div>
  );

    const renderExecutiveContractTab = () => (
    <div className="space-y-4">
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          متن صورتجلسه
        </label>
        <textarea
          value={executiveContractData?.minutes || ''}
          onChange={e => setExecutiveContractData({...executiveContractData, minutes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[100px]"
          placeholder="شرح صورتجلسه..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          آپلود فایل صورتجلسه
        </label>
        <input
          type="file"
          onChange={e => setExecutiveContractData({...executiveContractData, file: e.target.files?.[0] || null})}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
    </div>
  );

  const renderContractTab = () => (
    <div className="space-y-4">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">🔢 شماره قرارداد</label>
          <input
            type="text"
            value={contractData?.number || ''}
            onChange={e => setContractData({...contractData, number: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="شماره قرارداد..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">👤 مجری</label>
          <input
            type="text"
            value={contractData?.executor || ''}
            onChange={e => setContractData({...contractData, executor: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نام مجری..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">🤝 همکاران مجری</label>
        <input
          type="text"
          value={Array.isArray(contractData?.collaborators) ? contractData.collaborators.join(', ') : (contractData?.collaborators || '')}
          onChange={e => setContractData({...contractData, collaborators: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام همکاران (با کاما جدا کنید)..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">🧑‍🏫 عوامل (استاد راهنما، ارزیاب، مشاور)</label>
        <input
          type="text"
          value={Array.isArray(contractData?.agents) ? contractData.agents.join(', ') : (contractData?.agents || '')}
          onChange={e => setContractData({...contractData, agents: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="استاد راهنما، ارزیاب، مشاور..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ قرارداد</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(contractData?.date)}
              onChange={(date: any) => setContractData({...contractData, date: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ شروع</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(contractData?.startDate)}
              onChange={(date: any) => setContractData({...contractData, startDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">⏱️ مدت (ماه)</label>
          <input
            type="number"
            value={contractData?.duration || 0}
            onChange={e => setContractData({...contractData, duration: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 مبلغ قرارداد</label>
          <input
            type="number"
            value={contractData?.amount || 0}
            onChange={e => setContractData({...contractData, amount: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
            min="0"
          />
        </div>
      </div>
    </div>
  );

  const renderStagesTab = () => (
    <div className="space-y-6">
      

      {/* مرحله ۲۰ درصد */}
      <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۲۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📄 پروپوزال</label>
            <input
              type="text"
              value={stage20Data?.proposal || ''}
              onChange={e => setStage20Data({...stage20Data, proposal: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="عنوان پروپوزال..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage20Data({...stage20Data, file});
                if (file) handleFileUpload('مقطع ۲۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage20Data?.defenseDate)}
                onChange={(date: any) => setStage20Data({...stage20Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage20Data?.minutes || ''}
              onChange={e => setStage20Data({...stage20Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی</label>
            <input
              type="number"
              value={stage20Data?.paidAmount || 0}
              onChange={e => setStage20Data({...stage20Data, paidAmount: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage20Data?.paymentDate)}
                onChange={(date: any) => setStage20Data({...stage20Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* مرحله ۵۰ درصد */}
      <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۵۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage50Data({...stage50Data, file});
                if (file) handleFileUpload('مقطع ۵۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage50Data?.defenseDate)}
                onChange={(date: any) => setStage50Data({...stage50Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage50Data?.minutes || ''}
              onChange={e => setStage50Data({...stage50Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی</label>
            <input
              type="number"
              value={stage50Data?.paidAmount || 0}
              onChange={e => setStage50Data({...stage50Data, paidAmount: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage50Data?.paymentDate)}
                onChange={(date: any) => setStage50Data({...stage50Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* مرحله ۱۰۰ درصد */}
      <div className="border border-green-200 rounded-xl p-4 bg-green-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۱۰۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage100Data({...stage100Data, file});
                if (file) handleFileUpload('مقطع ۱۰۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage100Data?.defenseDate)}
                onChange={(date: any) => setStage100Data({...stage100Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage100Data?.minutes || ''}
              onChange={e => setStage100Data({...stage100Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی</label>
            <input
              type="number"
              value={stage100Data?.paidAmount || 0}
              onChange={e => setStage100Data({...stage100Data, paidAmount: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              placeholder="۰"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage100Data?.paymentDate)}
                onChange={(date: any) => setStage100Data({...stage100Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderApplicationTab = () => (
    <div className="space-y-4">
      

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📤 انعکاس نتایج به کاربر</label>
        <textarea
          value={applicationData?.resultReflection || ''}
          onChange={e => setApplicationData({...applicationData, resultReflection: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="نحوه انعکاس نتایج به کاربر..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📊 نوع کاربست</label>
          <input
            type="text"
            value={applicationData?.applicationType || ''}
            onChange={e => setApplicationData({...applicationData, applicationType: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نوع کاربست..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ کاربست</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(applicationData?.applicationDate)}
              onChange={(date: any) => setApplicationData({...applicationData, applicationDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📋 صورتجلسه کاربست</label>
        <input
          type="text"
          value={applicationData?.minutes || ''}
          onChange={e => setApplicationData({...applicationData, minutes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="شماره صورتجلسه..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">👥 کارگروه کاربست</label>
        <input
          type="text"
          value={applicationData?.workingGroup || ''}
          onChange={e => setApplicationData({...applicationData, workingGroup: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام کارگروه کاربست..."
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'projects': return renderProjectsTab();
      case 'collaboration': return renderCollaborationTab();
      case 'budget': return renderBudgetTab();
      case 'actions': return renderActionsTab();
      case 'team': return renderTeamTab();
      case 'need': return renderNeedTab();
      case 'contract': return renderContractTab();
      case 'executive_contract': return renderExecutiveContractTab();
      case 'stages': return renderStagesTab();
      case 'application': return renderApplicationTab();
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            {initialData ? '✏️' : '➕'}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">
              {initialData ? 'ویرایش مسئله' : 'ثبت مسئله جدید'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {initialData ? `در حال ویرایش: ${initialData.title}` : 'ثبت مسئله در نظام مسائل'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 p-3 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200/50'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <form id="issueForm" onSubmit={handleSubmit}>
          {renderTabContent()}
        </form>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
        >
          ❌ انصراف
        </button>
        <button
          type="submit"
          form="issueForm"
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg ${
            loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200/50'
          }`}
        >
          <Save size={16} />
          {loading ? '⏳ در حال ذخیره...' : initialData ? 'ذخیره تغییرات' : 'ثبت مسئله'}
        </button>
      </div>
    </div>
  );
}

export default IssueFormTabs;