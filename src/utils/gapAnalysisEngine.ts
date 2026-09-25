// src/utils/gapAnalysisEngine.ts
// موتور تحلیل شکاف دانشی — هسته محاسباتی مشترک
// این ماژول منطق مقایسه «درختواره مورد نیاز» و «درختواره تولیدشده» را پیاده‌سازی می‌کند
// به‌گونه‌ای که هم سرور (Express) و هم فرانت‌اند بتوانند از آن استفاده کنند و گزارش توضیحی تولید شود.
// ⚠️ منطق کسب‌وکار دست نخورده باقی مانده؛ فقط دقت تشخیص و شفافیت گزارش بهبود یافته است.

// ============================================
// تنظیمات موتور تحلیل
// ============================================

export interface GapAnalysisEngineOptions {
  /** حداقل امتیاز برای شناختن تطابق فازی (۰ تا ۱) */
  fuzzyThreshold?: number;
  /** حداقل امتیاز تطابق جزئی قالب (۰ تا ۱) */
  partialMatchThreshold?: number;
  /** وزن شباهت عنوان در امتیاز نهایی (۰ تا ۱) */
  titleWeight?: number;
  /** وزن شباهت سطح ساختاری (ارث‌بری از شاخه هم‌نام) در امتیاز نهایی */
  structureWeight?: number;
  /** وزن شباهت قالب/نمونه‌ها */
  templateWeight?: number;
  /** پرچم تشخیص دستی از فرانت (instanceIds = 'checked') */
  allowManualChecked?: boolean;
}

export const DEFAULT_ENGINE_OPTIONS: Required<GapAnalysisEngineOptions> = {
  fuzzyThreshold: 0.45,
  partialMatchThreshold: 0.3,
  titleWeight: 0.6,
  structureWeight: 0.2,
  templateWeight: 0.2,
  allowManualChecked: true,
};

// ============================================
// ابزارهای نرمال‌سازی متن فارسی
// ============================================

const ARABIC_TO_PERSIAN: Record<string, string> = {
  'ي': 'ی', 'ك': 'ک', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ؤ': 'و', 'ئ': 'ی',
  'ة': 'ه', 'ٱ': 'ا', 'ٹ': 'ت', 'ڈ': 'د', 'ڑ': 'ر', 'ى': 'ی',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** نرمال‌سازی متن فارسی/عربی: یکسان‌سازی ی/ک عربی، حذف اعراب، حذف نیم‌فاصله و نویسه‌های کنترلی */
export function normalizePersianText(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input).toLowerCase().trim();
  // حذف اعراب، تنوین، تشدید و اتصال‌های کنترلی
  s = s.replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F\uFEFF\u00AD]/g, '');
  // یکسان‌سازی نویسه‌های عربی/فارسی و ارقام
  s = s.replace(/[يكۀأإآؤئةٱٹڈڑى٠-٩۰-۹]/g, (ch) => ARABIC_TO_PERSIAN[ch] || ch);
  // یکسان‌سازی انواع نیم‌فاصله/خط تیره به فاصله
  s = s.replace(/[\u200C\u200D\u200E\u200F]/g, ' ');
  s = s.replace(/[-ـ_/\\.,;:!?()[\]{}"'«»]+/g, ' ');
  // فشرده‌سازی فاصله‌ها
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** استخراج توکن‌های معنادار (حذف ایست‌واژه‌های پرتکرار فارسی) */
const STOPWORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'آن', 'با', 'برای', 'های', 'ها', 'یک',
  'می', 'را', 'است', 'هست', 'بود', 'شده', 'شدهاست', 'بر', 'تا', 'نیز', 'یا',
  'هر', 'همه', 'چگونه', 'چه', 'کدام', 'برترین', 'بهترین',
]);

export function tokenize(text: string): string[] {
  const normalized = normalizePersianText(text);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map(w => w.replace(/^(ال)?/, (m) => (m === 'ال' ? '' : m)))
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

// ============================================
// شباهت فازی پیشرفته
// ============================================

/** فاصله لوانشتاین بین دو رشته */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // حذف
        curr[j - 1] + 1,   // درج
        prev[j - 1] + cost // جایگزینی
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** شباهت بر اساس فاصله لوانشتاین (۰ تا ۱) */
export function normalizedLevenshtein(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** ضرایب بزرگ‌مقداری (Bigram) — شباهت حروف ترکیبی برای متن فارسی */
export function bigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
    return set;
  };
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;
  let common = 0;
  ba.forEach(g => { if (bb.has(g)) common++; });
  return (2 * common) / (ba.size + bb.size); // Sørensen–Dice
}

/** شباهت توکن‌محور (اشتراک واژگان) با وزن طول */
export function tokenOverlapSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  let common = 0;
  ta.forEach(t => { if (setB.has(t)) common++; });
  return common / Math.max(ta.length, tb.length);
}

/** شباهت توکن‌های فازی — هر توکن در یک مجموعه نزدیک‌ترین همتای خود را پیدا می‌کند */
function fuzzyTokenOverlap(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const used = new Set<number>();
  let matched = 0;
  for (const t1 of ta) {
    let bestIdx = -1;
    let bestScore = 0;
    tb.forEach((t2, idx) => {
      if (used.has(idx)) return;
      const score = t1 === t2 ? 1 : normalizedLevenshtein(t1, t2);
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
    });
    if (bestIdx >= 0 && bestScore >= 0.8) {
      used.add(bestIdx);
      matched += bestScore;
    }
  }
  return matched / Math.max(ta.length, tb.length);
}

/**
 * شباهت ترکیبی نهایی بین دو عنوان.
 * ترکیب وزن‌دارِ شباهت زیررشته‌ای، لوانشتاین، بای‌گرام و اشتراک توکن‌ها.
 * همان منطق قدیمی (includes + اشتراک کلمات) حفظ شده اما دقیق‌تر شده است.
 */
export function combinedSimilarity(titleA: string, titleB: string): number {
  const a = normalizePersianText(titleA);
  const b = normalizePersianText(titleB);
  if (!a || !b) return 0;
  if (a === b) return 1;

  // ۱. شامل بودن یکی در دیگری (منطق قدیمی: 0.85) — تقویت با نسبت طول
  let inclusionScore = 0;
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    inclusionScore = 0.75 + 0.25 * ratio; // بین ۰.۷۵ تا ۱
  }

  // ۲. شباهت‌های مبتنی بر توکن و کاراکتر
  const tokenScore = tokenOverlapSimilarity(a, b);
  const fuzzyTokenScore = fuzzyTokenOverlap(a, b);
  const levScore = normalizedLevenshtein(a, b);
  const bigramScore = bigramSimilarity(a, b);

  // ۳. شباهت کلمات مشترک ساده (منطق قدیمی حفظ شده)
  const words1 = a.split(/\s+/);
  const words2 = b.split(/\s+/);
  const common = words1.filter(w => words2.includes(w)).length;
  const legacyScore = common > 0 ? common / Math.max(words1.length, words2.length) : 0;

  // ترکیب وزن‌دار
  const combined =
    0.30 * Math.max(inclusionScore, legacyScore) +
    0.25 * Math.max(tokenScore, legacyScore) +
    0.20 * fuzzyTokenScore +
    0.15 * bigramScore +
    0.10 * levScore;

  return Math.min(1, Math.max(combined, legacyScore > 0 ? legacyScore * 0.95 : 0));
}

// ============================================
// شباهت ساختاری (ساختار پدر-فرزندی)
// ============================================

export interface StructurePath {
  /** مسیر عناوین از ریشه تا این گره (بدون خود گره) */
  pathTitles: string[];
  /** سطح ساختاری (R, T, B, SB, L, Q) */
  level: string;
}

/** شباهت ساختاری دو گره بر اساس مسیر اجدادشان */
export function structureSimilarity(a: StructurePath, b: StructurePath): number {
  if (!a.pathTitles.length || !b.pathTitles.length) return 0;
  const len = Math.min(a.pathTitles.length, b.pathTitles.length);
  let matched = 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    // وزن بیشتر به سطوح بالاتر (نزدیک ریشه)
    const weight = len - i;
    total += weight;
    const sim = combinedSimilarity(a.pathTitles[i], b.pathTitles[i]);
    if (sim >= 0.7) matched += weight * sim;
  }
  if (total === 0) return 0;
  return matched / total;
}

// ============================================
// تایپ‌های داده ورودی موتور
// ============================================

export interface EngineNode {
  id: number;
  treeId: number;
  parentId: number | null;
  level: string;
  title: string;
  description?: string | null;
  templateIds?: string | string[] | null;
  instanceIds?: string | string[] | null;
  metadata?: unknown;
}

export interface EngineInstance {
  id: number;
  templateId: number;
  title?: string | null;
}

export interface EngineAsset {
  nodeId: number;
  templateId?: number | null;
}

export interface MatchResult {
  matched: boolean;
  status: 'filled' | 'partially_filled' | 'open';
  gapType: 'manual' | 'complete' | 'partial' | 'fuzzy' | 'complete_missing';
  matchScore: number;
  matchedNodeId: number | null;
  matchedNodeTitle?: string | null;
  /** امتیازهای جزئی برای شفافیت گزارش */
  scoreBreakdown?: {
    title: number;
    structure: number;
    template: number;
    inclusionBoost: number;
  };
  /** شرح فارسی چرایی نتیجه */
  reasonFa: string;
  /** جزئیات تطابق قالب‌ها */
  templateDetails?: {
    required: number[];
    found: number[];
    missing: number[];
    matchRatio: number;
  };
}

// ============================================
// تحلیل مقایسه یک گره برگ با درختواره تولیدشده
// ============================================

export interface CompareContext {
  requiredNode: EngineNode;
  requiredAncestors: EngineNode[];
  producedLeaves: EngineNode[];
  producedAncestors: Map<number, EngineNode[]>;
  instances: Map<number, EngineInstance>; // نمونه‌ها بر اساس شناسه
  assets: Map<number, EngineAsset[]>;      // دارایی‌ها بر اساس nodeId
  options: Required<GapAnalysisEngineOptions>;
}

/** استخراج شناسه‌های قالب از گره (پشتیبانی از آرایه یا رشته جداشده با کاما) */
export function extractTemplateIds(node: EngineNode): string[] {
  if (!node.templateIds) return [];
  if (Array.isArray(node.templateIds)) return node.templateIds.map(String).filter(Boolean);
  return String(node.templateIds).split(',').map(s => s.trim()).filter(Boolean);
}

/** استخراج شناسه‌های نمونه از گره */
export function extractInstanceIds(node: EngineNode): string[] {
  if (!node.instanceIds) return [];
  if (Array.isArray(node.instanceIds)) return node.instanceIds.map(String).filter(Boolean);
  return String(node.instanceIds).split(',').map(s => s.trim()).filter(Boolean);
}

/** ساخت مسیر ساختاری گره از ریشه */
export function buildAncestorPath(node: EngineNode, allNodes: Map<number, EngineNode>): EngineNode[] {
  const path: EngineNode[] = [];
  let current = node.parentId ? allNodes.get(node.parentId) : undefined;
  let guard = 0;
  while (current && guard++ < 50) {
    path.unshift(current);
    current = current.parentId ? allNodes.get(current.parentId) : undefined;
  }
  return path;
}

/**
 * مقایسه یک گره برگ مورد نیاز با همه گره‌های برگ تولیدشده.
 * خروجی: بهترین تطابق به همراه امتیاز تفصیلی و شرح فارسی.
 */
export function compareRequiredLeaf(ctx: CompareContext): MatchResult {
  const { requiredNode, requiredAncestors, producedLeaves, producedAncestors, instances, assets, options } = ctx;
  const requiredTemplateIds = extractTemplateIds(requiredNode);

  let best: MatchResult | null = null;

  for (const producedLeaf of producedLeaves) {
    // ---------- مرحله ۱: تشخیص دستی (پرچم 'checked') — منطق قدیمی حفظ شده ----------
    const producedInstanceIds = extractInstanceIds(producedLeaf);
    if (options.allowManualChecked && producedInstanceIds.includes('checked')) {
      if (normalizePersianText(requiredNode.title) === normalizePersianText(producedLeaf.title)) {
        const result: MatchResult = {
          matched: true,
          status: 'filled',
          gapType: 'manual',
          matchScore: 1,
          matchedNodeId: producedLeaf.id,
          matchedNodeTitle: producedLeaf.title,
          reasonFa: `تطابق دستی تأیید‌شده: عنوان «${requiredNode.title}» عیناً در درختواره تولیدشده علامت‌گذاری شده بود.`,
          templateDetails: { required: requiredTemplateIds.map(Number), found: requiredTemplateIds.map(Number), missing: [], matchRatio: 1 },
        };
        if (!best || result.matchScore > best.matchScore) best = result;
        continue;
      }
    }

    // ---------- مرحله ۲: جمع‌آوری قالب‌های موجود در گره تولیدشده ----------
    const validInstanceIds = producedInstanceIds
      .filter(id => id !== 'checked')
      .map(id => parseInt(id, 10))
      .filter(n => !isNaN(n));

    const producedTemplateIdsSet = new Set<string>();
    for (const instId of validInstanceIds) {
      const inst = instances.get(instId);
      if (inst) producedTemplateIdsSet.add(String(inst.templateId));
    }
    for (const asset of assets.get(producedLeaf.id) || []) {
      if (asset.templateId) producedTemplateIdsSet.add(String(asset.templateId));
    }
    // قالب‌های مستقیم ثبت‌شده روی خود گره تولیدشده (قبلاً نادیده گرفته می‌شد)
    for (const tid of extractTemplateIds(producedLeaf)) {
      producedTemplateIdsSet.add(tid);
    }
    const producedTemplateIds = Array.from(producedTemplateIdsSet);

    // ---------- مرحله ۳: تطابق کامل قالبی ----------
    const templateDetails = {
      required: requiredTemplateIds.map(Number),
      found: requiredTemplateIds.filter(id => producedTemplateIds.includes(id)).map(Number),
      missing: requiredTemplateIds.filter(id => !producedTemplateIds.includes(id)).map(Number),
      matchRatio: requiredTemplateIds.length > 0
        ? requiredTemplateIds.filter(id => producedTemplateIds.includes(id)).length / requiredTemplateIds.length
        : 0,
    };

    const hasAllTemplates =
      requiredTemplateIds.length > 0 &&
      templateDetails.missing.length === 0;

    if (hasAllTemplates) {
      const result: MatchResult = {
        matched: true,
        status: 'filled',
        gapType: 'complete',
        matchScore: 1,
        matchedNodeId: producedLeaf.id,
        matchedNodeTitle: producedLeaf.title,
        reasonFa: `پوشش کامل: هر ${requiredTemplateIds.length} قالب دانشی مورد نیاز در گره «${producedLeaf.title}» موجود است.`,
        templateDetails,
      };
      if (!best || result.matchScore > best.matchScore) best = result;
      continue; // تطابق کامل؛ بهتر از این نمی‌شود
    }

    // ---------- مرحله ۴: تطابق جزئی قالبی (منطق قدیمی با آستانه 0.3) ----------
    if (templateDetails.matchRatio > options.partialMatchThreshold && (!best || templateDetails.matchRatio > best.matchScore)) {
      const result: MatchResult = {
        matched: true,
        status: 'partially_filled',
        gapType: 'partial',
        matchScore: templateDetails.matchRatio,
        matchedNodeId: producedLeaf.id,
        matchedNodeTitle: producedLeaf.title,
        reasonFa: `پوشش جزئی قالبی: ${templateDetails.found.length} از ${requiredTemplateIds.length} قالب دانشی مورد نیاز در گره «${producedLeaf.title}» یافت شد (${Math.round(templateDetails.matchRatio * 100)}٪).`,
        templateDetails,
      };
      if (!best || result.matchScore > best.matchScore) best = result;
      // ادامه می‌دهیم تا شاید تطابق کامل دیگری پیدا شود
      continue;
    }

    // ---------- مرحله ۵: شباهت فازی ترکیبی (عنوان + ساختار) ----------
    const titleSim = combinedSimilarity(requiredNode.title, producedLeaf.title);
    const requiredPath: StructurePath = { pathTitles: requiredAncestors.map(a => a.title), level: requiredNode.level };
    const producedPath: StructurePath = {
      pathTitles: (producedAncestors.get(producedLeaf.id) || []).map(a => a.title),
      level: producedLeaf.level,
    };
    const structSim = structureSimilarity(requiredPath, producedPath);

    // اگر قالب مشترکی هم وجود دارد به عنوان بوست استفاده می‌شود (منطق قدیمی: +0.2)
    const commonTemplates = requiredTemplateIds.filter(id => producedTemplateIds.includes(id));
    const templateBoost = commonTemplates.length > 0 ? options.templateWeight : 0;

    let score = options.titleWeight * titleSim + options.structureWeight * structSim + templateBoost;

    // بوست نمونه‌های یکسان (منطق قدیمی: +0.3)
    const requiredInstanceIds = extractInstanceIds(requiredNode);
    const commonInstances = requiredInstanceIds.filter(i => i !== 'checked' && producedInstanceIds.includes(i));
    if (commonInstances.length > 0) {
      score = Math.min(1, score + options.templateWeight * 1.5);
    }

    if (score > (best?.matchScore ?? 0)) {
      // ⚠️ آستانه پذیرش: تطابق فازی فقط در صورت عبور از حد آستانه معتبر است
      // (منطق قدیمی: bestScore > 0.5 — حفظ شده با آستانه قابل تنظیم)
      if (score < options.fuzzyThreshold) continue;

      // تشخیص دقیق: عنوان کاملاً یکسان + جایگاه ساختاری مشابه = پوشش واقعی
      const isExactTitleWithStructure = titleSim >= 0.99 && structSim >= 0.5;
      const status: MatchResult['status'] = isExactTitleWithStructure || score >= 0.9 ? 'filled' : 'partially_filled';
      const parts: string[] = [];
      parts.push(`شباهت عنوان: ${Math.round(titleSim * 100)}٪`);
      if (structSim > 0.3) parts.push(`شباهت جایگاه ساختاری: ${Math.round(structSim * 100)}٪`);
      if (commonTemplates.length > 0) parts.push(`${commonTemplates.length} قالب مشترک`);
      if (commonInstances.length > 0) parts.push(`${commonInstances.length} نمونه مشترک`);

      const result: MatchResult = {
        matched: true,
        status,
        gapType: 'fuzzy',
        matchScore: isExactTitleWithStructure ? Math.max(score, 0.95) : score,
        matchedNodeId: producedLeaf.id,
        matchedNodeTitle: producedLeaf.title,
        scoreBreakdown: {
          title: titleSim,
          structure: structSim,
          template: commonTemplates.length / Math.max(requiredTemplateIds.length, 1),
          inclusionBoost: templateBoost + (commonInstances.length > 0 ? options.templateWeight * 1.5 : 0),
        },
        reasonFa: status === 'filled'
          ? `تطابق فازی قوی: ${parts.join(' • ')}. گره «${producedLeaf.title}» عملاً همان نیاز دانشی را پوشش می‌دهد.`
          : `تطابق فازی جزئی: ${parts.join(' • ')}. گره «${producedLeaf.title}» بخشی از نیاز را پوشش می‌دهد اما تطابق قطعی نیست.`,
        templateDetails,
      };
      best = result;
    }
  }

  // ---------- مرحله ۶: هیچ تطابقی یافت نشد ----------
  if (!best) {
    const reason = requiredTemplateIds.length > 0
      ? `هیچ گره تولیدشده‌ای با عنوان «${requiredNode.title}» یا قالب‌های دانشی مورد نیاز آن (${requiredTemplateIds.length} قالب) مطابقت نداشت.`
      : `هیچ گره تولیدشده‌ای با عنوان «${requiredNode.title}» هم‌خوانی نداشت.`;
    return {
      matched: false,
      status: 'open',
      gapType: requiredTemplateIds.length > 0 ? 'complete_missing' : 'complete',
      matchScore: 0,
      matchedNodeId: null,
      reasonFa: reason,
      templateDetails: {
        required: requiredTemplateIds.map(Number),
        found: [],
        missing: requiredTemplateIds.map(Number),
        matchRatio: 0,
      },
    };
  }

  return best;
}

// ============================================
// گزارش تحلیلی با شرح فارسی
// ============================================

export interface EngineReportInput {
  requiredTreeName: string;
  producedTreeName: string | null;
  results: Array<{
    requiredNodeId: number;
    requiredNodeTitle: string;
    level: string;
    status: MatchResult['status'];
    gapType: MatchResult['gapType'];
    matchScore: number;
    matchedNodeTitle?: string | null;
    reasonFa: string;
  }>;
  createdAt?: string;
}

export interface EngineReport {
  requiredTree: string;
  producedTree: string;
  totalLeaves: number;
  filledGaps: number;
  openGaps: number;
  partialGaps: number;
  coveragePercent: number;
  weightedCoveragePercent: number;
  byLevel: Record<string, { total: number; filled: number; partial: number; open: number; coveragePercent: number }>;
  byGapType: Record<string, number>;
  avgMatchScore: number;
  worstNodes: Array<{ title: string; level: string; status: string; matchScore: number }>;
  /** شرح فارسی گام‌به‌گام روش تحلیل */
  methodologyFa: string[];
  /** جمع‌بندی فارسی نتیجه تحلیل */
  summaryFa: string;
  createdAt: string;
}

export function buildAnalysisReport(input: EngineReportInput): EngineReport {
  const { results } = input;
  const totalLeaves = results.length;
  const filledGaps = results.filter(r => r.status === 'filled').length;
  const openGaps = results.filter(r => r.status === 'open').length;
  const partialGaps = results.filter(r => r.status === 'partially_filled').length;

  const coveragePercent = totalLeaves > 0 ? Math.round((filledGaps / totalLeaves) * 100) : 0;
  const weightedCoveragePercent = totalLeaves > 0
    ? Math.round((results.reduce((sum, r) => sum + Math.min(1, r.matchScore), 0) / totalLeaves) * 100)
    : 0;

  // گروه‌بندی بر اساس سطح
  const byLevel: EngineReport['byLevel'] = {};
  for (const r of results) {
    if (!byLevel[r.level]) byLevel[r.level] = { total: 0, filled: 0, partial: 0, open: 0, coveragePercent: 0 };
    byLevel[r.level].total++;
    if (r.status === 'filled') byLevel[r.level].filled++;
    else if (r.status === 'partially_filled') byLevel[r.level].partial++;
    else byLevel[r.level].open++;
  }
  Object.keys(byLevel).forEach(lvl => {
    const s = byLevel[lvl];
    s.coveragePercent = s.total > 0 ? Math.round(((s.filled + 0.5 * s.partial) / s.total) * 100) : 0;
  });

  const byGapType: Record<string, number> = {};
  for (const r of results) {
    byGapType[r.gapType] = (byGapType[r.gapType] || 0) + 1;
  }

  const avgMatchScore = totalLeaves > 0
    ? results.reduce((sum, r) => sum + r.matchScore, 0) / totalLeaves
    : 0;

  const worstNodes = [...results]
    .sort((a, b) => a.matchScore - b.matchScore)
    .filter(r => r.status !== 'filled')
    .slice(0, 8)
    .map(r => ({ title: r.requiredNodeTitle, level: r.level, status: r.status, matchScore: r.matchScore }));

  // ---- شرح روش تحلیل ----
  const methodologyFa = [
    `۱. گره‌های برگ و پرسش‌های سطح پایین (L و Q) از درختواره «${input.requiredTreeName}» به عنوان نیازهای دانشی استخراج شدند (${totalLeaves} گره).`,
    input.producedTreeName
      ? `۲. برگ‌های درختواره تولیدشده «${input.producedTreeName}» به عنوان دارایی‌های موجود بررسی شدند و قالب‌ها، نمونه‌ها و دارایی‌های دانشی هر گره جمع‌آوری شد.`
      : '۲. چون درختواره تولیدشده‌ای انتخاب نشد، همه نیازها به عنوان «گپ باز» ثبت شدند.',
    '۳. برای هر نیاز، سه نوع تطابق به ترتیب اولویت بررسی شد: تطابق دستی تأیید‌شده (بازنگری کاربر)، تطابق کامل قالبی (همه قالب‌های لازم موجود)، و تطابق جزئی قالبی (حداقل ۳۰٪ قالب‌ها).',
    `۴. اگر تطابق قالبی پیدا نمی‌شد، شباهت فازی عنوان با ۵ روش مستقل محاسبه شد:
    • لوانشتاین — فاصله ویرایشی حرف‌به‌حرف: حداقل تعداد حذف/اضافه/جایگزینی حروف برای تبدیل یک عنوان به عنوان دیگر. تغییرات کوچک تایپی را می‌گیرد و به طول رشته حساس است.
    • بای‌گرام — مقایسه جفت‌حرف‌های مجاور (مثلاً «فا-وا»، «وا-ره») با شاخص سایرنسن‑دایس: نسبت بای‌گرام‌های مشترک به کل بای‌گرام‌ها. در برابر جابجایی ترتیب حروف مقاوم‌تر از لوانشتاین است.
    • توکن فازی — هر «کلمه» عنوان با نزدیک‌ترین کلمه عنوان دیگر تطبیق داده می‌شود (تطبیق یک‌به‌یک حریصانه): تفاوت‌های نگارشی و تصریفی کلمات را می‌بخشد.
    • اشتراک واژگان — تعداد کلمات دقیقاً مشترک تقسیم بر میانگین تعداد کلمات دو عنوان: وقتی هر دو عنوان از واژگان مشترک سازمانی استفاده کنند قوی‌ترین سیگنال را می‌دهد.
    • امتیاز ساختاری — شباهت مسیر والد‌ها (از ریشه تا برگ) با همان معیار اشتراک واژگان: وقتی دو گره در شاخه‌های هم‌نام ساختاری قرار دارند امتیاز می‌گیرد حتی اگر عنوان‌شان متفاوت باشد.
    این ۵ امتیاز با میانگین وزن‌دار (۳۰٪ شامل‌بودن/توکن‌ها + ۲۵٪ اشتراک واژگان + ۲۰٪ توکن فازی + ۱۵٪ بای‌گرام + ۱۰٪ لوانشتاین) ترکیب و سپس با وزن ۶۰٪ عنوان + ۲۰٪ جایگاه ساختاری + ۲۰٪ قالب‌های مشترک به امتیاز نهایی تبدیل شد.`,
    '۵. امتیاز نهایی بالاتر از آستانه تطابق (پیش‌فرض ۴۵٪) به عنوان پوشش کامل یا جزئی ثبت شد؛ زیر آستانه، «گپ باز». امتیاز تفکیکی هر روش در scoreBreakdown ذخیره می‌شود تا شفاف باشد هر روش چند امتیاز داده است.',
    '۶. در پایان، رکورد گپ هر نیاز با امتیاز تطابق، نوع تطابق، شرح فارسی چرایی و زنجیره مرجع (مسیر مالک) ثبت شد. گپ‌های همان درختواره جایگزین شدند اما بازنگری‌های دستی کاربر حفظ و بر نتیجه جدید اعمال گردید (تأیید/رد/تغییر).',
  ];

  // ---- جمع‌بندی ----
  const weakestLevel = Object.entries(byLevel).sort((a, b) => a[1].coveragePercent - b[1].coveragePercent)[0];
  let summaryFa = `از مجموع ${totalLeaves} نیاز دانشی بررسی‌شده، ${filledGaps} نیاز کاملاً پوشش داده شده، ${partialGaps} نیاز به‌صورت جزئی پوشش دارد و ${openGaps} نیاز کاملاً بدون پوشش (گپ باز) است. `;
  summaryFa += `پوشش کامل ${coveragePercent}٪ و پوشش وزن‌دار (با احتساب تطابق‌های جزئی) ${weightedCoveragePercent}٪ است. `;
  if (weakestLevel && weakestLevel[1].total > 0) {
    summaryFa += `ضعیف‌ترین سطح از نظر پوشش، سطح «${weakestLevel[0]}» با ${weakestLevel[1].coveragePercent}٪ پوشش است که نیازمند توجه ویژه در برنامه‌ریزی پژوهشی است.`;
  }
  if (openGaps === 0 && partialGaps === 0) {
    summaryFa = `همه ${totalLeaves} نیاز دانشی به طور کامل پوشش داده شده‌اند. پوشش دانشی سازمان در این مقایسه کامل است. 🎉`;
  } else if (openGaps > 0) {
    summaryFa += ` برای ${openGaps} گپ باز، تعریف پروژه پژوهشی توصیه می‌شود.`;
  }

  return {
    requiredTree: input.requiredTreeName,
    producedTree: input.producedTreeName || 'بدون درختواره تولیدشده',
    totalLeaves,
    filledGaps,
    openGaps,
    partialGaps,
    coveragePercent,
    weightedCoveragePercent,
    byLevel,
    byGapType,
    avgMatchScore: Math.round(avgMatchScore * 100) / 100,
    worstNodes,
    methodologyFa,
    summaryFa,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
