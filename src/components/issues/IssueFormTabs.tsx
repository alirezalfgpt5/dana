// src/components/issues/IssueFormTabs.tsx
// فرم تب‌بندی شده برای ثبت/ویرایش مسئله - نسخه ماژولار و بهینه‌سازی شده ۳.۰

import React, { useState, useEffect } from 'react';
import { 
  Save, X, FileText, 
  Users, Coins, Clock, CheckCircle, 
  UserCog, File as FileIcon, Settings, 
  ClipboardList, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { TeamMember, NeedStatementData, ContractData, ExecutiveContractData, StageData, ApplicationData } from './tabs/types';
import { GeneralTab } from './tabs/GeneralTab';
import { ProjectsTab } from './tabs/ProjectsTab';
import { CollaborationTab } from './tabs/CollaborationTab';
import { BudgetTab } from './tabs/BudgetTab';
import { ActionsTab } from './tabs/ActionsTab';
import { TeamTab } from './tabs/TeamTab';
import { NeedTab } from './tabs/NeedTab';
import { ExecutiveContractTab } from './tabs/ExecutiveContractTab';
import { ContractTab } from './tabs/ContractTab';
import { StagesTab } from './tabs/StagesTab';
import { ApplicationTab } from './tabs/ApplicationTab';

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

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [needStatementData, setNeedStatementData] = useState<NeedStatementData>({
    user: '',
    problem: '',
    suggestedBudget: 0,
    level: '',
    file: null,
    approvalStatus: 'pending',
    approvalDate: '',
    approvedAmount: 0,
  });
  const [contractData, setContractData] = useState<ContractData>({
    number: '',
    executor: '',
    collaborators: [],
    agents: [],
    date: '',
    duration: 0,
    startDate: '',
    amount: 0,
    file: null,
  });
  const [executiveContractData, setExecutiveContractData] = useState<ExecutiveContractData>({
    file: null,
    minutes: '',
  });
  const [stage20Data, setStage20Data] = useState<StageData>({
    proposal: '',
    file: null,
    defenseDate: '',
    minutes: '',
    minutesFile: null,
    recordsFiles: [],
    paidAmount: 0,
    paymentDate: '',
  });
  const [stage50Data, setStage50Data] = useState<StageData>({
    file: null,
    defenseDate: '',
    minutes: '',
    minutesFile: null,
    recordsFiles: [],
    paidAmount: 0,
    paymentDate: '',
  });
  const [stage100Data, setStage100Data] = useState<StageData>({
    file: null,
    defenseDate: '',
    minutes: '',
    minutesFile: null,
    recordsFiles: [],
    paidAmount: 0,
    paymentDate: '',
  });
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    resultReflection: '',
    applicationType: '',
    applicationDate: '',
    minutes: '',
    minutesFile: null,
    recordsFiles: [],
    workingGroup: '',
  });

  const [domainNodes, setDomainNodes] = useState<any[]>([]);
  const [researchItems, setResearchItems] = useState<any[]>([]);
  
  const [dynamicKnowledgeTypes, setDynamicKnowledgeTypes] = useState<string[]>(knowledgeTypes);
  const [dynamicResearchProjectTypes, setDynamicResearchProjectTypes] = useState<string[]>(researchProjectTypes);
  const [dynamicEventTypes, setDynamicEventTypes] = useState<string[]>(eventTypes);
  const [dynamicProjectLevels, setDynamicProjectLevels] = useState<string[]>(projectLevels);
  const [dynamicApprovalAuthorities, setDynamicApprovalAuthorities] = useState<string[]>(approvalAuthorities);
  const [dynamicKnowledgeProjectTypes, setDynamicKnowledgeProjectTypes] = useState<string[]>(knowledgeProjectTypes);
  const [dynamicScientificDiplomacyLevels, setDynamicScientificDiplomacyLevels] = useState<string[]>(scientificDiplomacyLevels);
  const [dynamicConfidentialityLevels, setDynamicConfidentialityLevels] = useState<string[]>(confidentialityLevels);
  const [dynamicActionPriorities] = useState<string[]>(['خیلی زیاد', 'زیاد', 'متوسط']);

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
    const fetchData = async () => {
      try {
        const [nodesRes, researchRes] = await Promise.all([
          api.get('/api/trees/nodes/leaves') as Promise<any>,
          api.get('/api/research') as Promise<any>
        ]);
        
        let nodes: any[] = [];
        if (Array.isArray(nodesRes)) {
          nodes = nodesRes;
        } else if (nodesRes && Array.isArray(nodesRes.data)) {
          nodes = nodesRes.data;
        }
        setDomainNodes(nodes);

        let rItems: any[] = [];
        if (Array.isArray(researchRes)) {
          rItems = researchRes;
        } else if (researchRes && Array.isArray(researchRes.data)) {
          rItems = researchRes.data;
        }
        setResearchItems(rItems);

        // واکشی متادیتاهای داینامیک
        const fetchMeta = async (path: string, setter: (val: string[]) => void, defaultVal: string[]) => {
          try {
            const data = await api.get('/api/metadata/' + path) as unknown as any[];
            if (Array.isArray(data) && data.length > 0) {
              setter(data.map((item: any) => item.name || item.title || item));
            }
          } catch {
            setter(defaultVal);
          }
        };

        await Promise.all([
          fetchMeta('knowledge-types', setDynamicKnowledgeTypes, knowledgeTypes),
          fetchMeta('research-project-types', setDynamicResearchProjectTypes, researchProjectTypes),
          fetchMeta('event-types', setDynamicEventTypes, eventTypes),
          fetchMeta('project-levels', setDynamicProjectLevels, projectLevels),
          fetchMeta('approval-authorities', setDynamicApprovalAuthorities, approvalAuthorities),
          fetchMeta('knowledge-project-types', setDynamicKnowledgeProjectTypes, knowledgeProjectTypes),
          fetchMeta('scientific-diplomacy-levels', setDynamicScientificDiplomacyLevels, scientificDiplomacyLevels),
          fetchMeta('confidentiality-levels', setDynamicConfidentialityLevels, confidentialityLevels),
        ]);
      } catch (err: any) {
        console.error('Error fetching issue form metadata:', err);
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
    { id: 'budget', label: ' بودجه و اعتبارات', icon: Coins },
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
      console.error('Error saving issue:', error);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            formData={formData}
            handleChange={handleChange}
            researchItems={researchItems}
            domainNodes={domainNodes}
            issueCategories={issueCategories}
            dynamicConfidentialityLevels={dynamicConfidentialityLevels}
            dynamicActionPriorities={dynamicActionPriorities}
            dynamicApprovalAuthorities={dynamicApprovalAuthorities}
            dynamicKnowledgeTypes={dynamicKnowledgeTypes}
            dynamicProjectLevels={dynamicProjectLevels}
            groupedTemplates={groupedTemplates}
            handleTemplateToggle={handleTemplateToggle}
            statusOptions={statusOptions}
          />
        );
      case 'projects':
        return (
          <ProjectsTab
            formData={formData}
            handleChange={handleChange}
            dynamicResearchProjectTypes={dynamicResearchProjectTypes}
            dynamicKnowledgeProjectTypes={dynamicKnowledgeProjectTypes}
            dynamicEventTypes={dynamicEventTypes}
          />
        );
      case 'collaboration':
        return (
          <CollaborationTab
            formData={formData}
            handleChange={handleChange}
            dynamicScientificDiplomacyLevels={dynamicScientificDiplomacyLevels}
          />
        );
      case 'budget':
        return (
          <BudgetTab
            formData={formData}
            handleChange={handleChange}
          />
        );
      case 'actions':
        return (
          <ActionsTab
            formData={formData}
            handleChange={handleChange}
          />
        );
      case 'team':
        return (
          <TeamTab
            teamMembers={teamMembers}
            handleAddTeamMember={handleAddTeamMember}
            handleRemoveTeamMember={handleRemoveTeamMember}
            handleTeamMemberChange={handleTeamMemberChange}
          />
        );
      case 'need':
        return (
          <NeedTab
            needStatementData={needStatementData}
            setNeedStatementData={setNeedStatementData}
            handleFileUpload={handleFileUpload}
          />
        );
      case 'contract':
        return (
          <ContractTab
            contractData={contractData}
            setContractData={setContractData}
          />
        );
      case 'executive_contract':
        return (
          <ExecutiveContractTab
            executiveContractData={executiveContractData}
            setExecutiveContractData={setExecutiveContractData}
          />
        );
      case 'stages':
        return (
          <StagesTab
            stage20Data={stage20Data}
            setStage20Data={setStage20Data}
            stage50Data={stage50Data}
            setStage50Data={setStage50Data}
            stage100Data={stage100Data}
            setStage100Data={setStage100Data}
            handleFileUpload={handleFileUpload}
          />
        );
      case 'application':
        return (
          <ApplicationTab
            applicationData={applicationData}
            setApplicationData={setApplicationData}
          />
        );
      default:
        return null;
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
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 p-3 border-b border-gray-200 bg-gray-50/50 flex-shrink-0 scrollbar-thin">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
          className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
        >
          ❌ انصراف
        </button>
        <button
          type="submit"
          form="issueForm"
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg cursor-pointer ${
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
