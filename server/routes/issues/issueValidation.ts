// server/routes/issues/issueValidation.ts
// اعتبارسنجی سمت سرور و یکپارچه‌سازی قواعد با دامنه‌ی فیلدهای فرم

import { z } from 'zod';

export function normalizePersianText(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\u200C/g, ' ') // نیم‌فاصله به فاصله
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728)) // ارقام عربی به انگلیسی
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728)) // ارقام فارسی به انگلیسی
    .toLowerCase();
}

export const validStatuses = ['pending', 'in_progress', 'completed', 'canceled', 'on_hold'] as const;

export const issueInputSchema = z.object({
  title: z.string().min(1, 'عنوان مسئله نمی‌تواند خالی باشد').max(500),
  domainNodeId: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).refine(n => !isNaN(n) && n > 0, 'شناسه حوزه (گره دانشی) نامعتبر است'),
  periodId: z.union([z.number(), z.string(), z.null()]).optional().transform(v => v ? parseInt(String(v)) : null),
  researchItemId: z.union([z.number(), z.string(), z.null()]).optional().transform(v => v ? parseInt(String(v)) : null),
  sourceIssueId: z.union([z.number(), z.string(), z.null()]).optional().transform(v => v ? parseInt(String(v)) : null),
  gapId: z.union([z.number(), z.string(), z.null()]).optional().transform(v => v ? parseInt(String(v)) : null),
  
  solutionDirection: z.string().nullable().optional(),
  responsibleUnit: z.string().nullable().optional(),
  confidentialityLevel: z.string().nullable().optional(),
  actionPriority: z.string().nullable().optional(),
  approvalDate: z.string().nullable().optional(),
  knowledgeType: z.string().nullable().optional(),
  projectLevel: z.string().nullable().optional(),
  approvalAuthority: z.string().nullable().optional(),
  researchProjectType: z.string().nullable().optional(),
  knowledgeProjectType: z.string().nullable().optional(),
  events: z.string().nullable().optional(),
  scientificDiplomacy: z.string().nullable().optional(),
  collaborators: z.string().nullable().optional(),
  referenceDocument: z.string().nullable().optional(),
  actionsTaken: z.string().nullable().optional(),
  bottlenecks: z.string().nullable().optional(),
  orders: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  
  requiredBudget: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined && v !== null && v !== '' ? Math.max(0, parseFloat(String(v)) || 0) : 0),
  approvedBudget: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined && v !== null && v !== '' ? Math.max(0, parseFloat(String(v)) || 0) : 0),
  assignedBudget: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined && v !== null && v !== '' ? Math.max(0, parseFloat(String(v)) || 0) : 0),
  expectedMonths: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined && v !== null && v !== '' ? Math.max(0, parseInt(String(v)) || 0) : 0),
  completionPercent: z.union([z.number(), z.string()]).optional().transform(v => {
    const val = v !== undefined && v !== null && v !== '' ? parseInt(String(v)) || 0 : 0;
    return Math.min(100, Math.max(0, val));
  }),
  
  status: z.enum(validStatuses).optional().default('pending'),
  
  macroProject: z.any().optional(),
  collaborationNetwork: z.any().optional(),
  issueResolutionTeam: z.any().optional(),
  needStatement: z.any().optional(),
  contract: z.any().optional(),
  executiveContract: z.any().optional(),
  stage20: z.any().optional(),
  stage50: z.any().optional(),
  stage100: z.any().optional(),
  application: z.any().optional(),
  metadata: z.any().optional(),
  templateIds: z.array(z.any()).optional(),
});

export const issueUpdateSchema = issueInputSchema.partial().extend({
  domainNodeId: z.union([z.number(), z.string()]).optional().transform(v => v !== undefined ? parseInt(String(v)) : undefined),
});

export const rolloverSchema = z.object({
  sourcePeriodId: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  targetPeriodId: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  mode: z.enum(['open_only', 'all', 'selected'] as const).default('open_only'),
  issueIds: z.array(z.union([z.number(), z.string()]).transform(v => parseInt(String(v)))).optional(),
  responsibleUnit: z.string().optional(),
}).refine(data => {
  if (data.sourcePeriodId === data.targetPeriodId) return false;
  return true;
}, {
  message: 'دوره مبدأ و مقصد نمی‌توانند یکسان باشند',
  path: ['targetPeriodId'],
}).refine(data => {
  if (data.mode === 'selected') {
    return Array.isArray(data.issueIds) && data.issueIds.length > 0;
  }
  return true;
}, {
  message: 'در حالت انتقال انتخابی، ارسال حداقل یک مسئله در لیست issueIds الزامی است',
  path: ['issueIds'],
});
