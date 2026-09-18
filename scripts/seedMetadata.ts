import { sqlite } from '../src/db/index.js';

console.log('Seeding Metadata and Templates...');

// داده‌های پایه - قالب‌ها (تعاریف)
const templatesData = [
  { type: 'سیاستی', title: 'سند چشم‌انداز' },
  { type: 'سیاستی', title: 'سند مأموریت' },
  { type: 'سیاستی', title: 'سیاست‌های کلان' },
  { type: 'راهبردی', title: 'سند راهبردی' },
  { type: 'عملیاتی', title: 'دستورالعمل' },
  { type: 'عملیاتی', title: 'آیین‌نامه' },
  { type: 'اجرایی', title: 'طرح تاکتیکی' },
  { type: 'اجرایی', title: 'برنامه عملیاتی' },
  { type: 'پژوهشی', title: 'گزارش پژوهشی' },
  { type: 'پژوهشی', title: 'مقاله علمی' },
  { type: 'پژوهشی', title: 'کتاب' },
  { type: 'آموزشی', title: 'بروشور' },
  { type: 'آموزشی', title: 'دستنامه' },
  { type: 'نظارتی', title: 'گزارش نظارتی' },
  { type: 'نظارتی', title: 'بازرسی' },
];

const distinctTypes = [...new Set(templatesData.map(t => t.type))];
distinctTypes.forEach(typeName => {
  let folder = sqlite.prepare("SELECT id FROM templates WHERE type = ? AND title = ? AND parent_id IS NULL").get(typeName, typeName) as any;
  if (!folder) {
    const info = sqlite.prepare(`
      INSERT INTO templates (type, title, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(typeName, typeName, 1, 0, new Date().toISOString(), new Date().toISOString());
    folder = { id: info.lastInsertRowid };
  }
  
  templatesData.filter(t => t.type === typeName).forEach(template => {
    const exists = sqlite.prepare(
      "SELECT id FROM templates WHERE type = ? AND title = ?"
    ).get(template.type, template.title);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO templates (type, title, parent_id, is_active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(template.type, template.title, folder.id, 1, 0, new Date().toISOString(), new Date().toISOString());
    }
  });
});

// داده‌های پایه - نمونه‌های قالب (برای شروع)
// ابتدا شناسه‌های قالب‌های ایجاد شده را پیدا می‌کنیم
const getTemplateId = (type: string, title: string) => {
  const result = sqlite.prepare(
    "SELECT id FROM templates WHERE type = ? AND title = ?"
  ).get(type, title);
  return result ? (result as any).id : null;
};

const templateInstancesData = [
  { template_type: 'سیاستی', template_title: 'سند چشم‌انداز', title: 'سند تحول راهبردی ۱۴۰۴', reference_code: '۱۲۳۴۵/الف' },
  { template_type: 'سیاستی', template_title: 'سند مأموریت', title: 'سند مأموریت نیروی زمینی', reference_code: '۱۲۳۴۶/ب' },
  { template_type: 'پژوهشی', template_title: 'گزارش پژوهشی', title: 'گزارش پژوهشی هوش مصنوعی در دفاع', reference_code: '۹۸۷۶۵/پ' },
  { template_type: 'پژوهشی', template_title: 'مقاله علمی', title: 'مقاله علمی - الگوی جدید نبرد', reference_code: '۵۴۳۲۱/ت' },
  { template_type: 'راهبردی', template_title: 'سند راهبردی', title: 'سند راهبردی دفاعی ۱۴۰۵', reference_code: '۷۶۵۴۳/ث' },
];

templateInstancesData.forEach(instance => {
  const templateId = getTemplateId(instance.template_type, instance.template_title);
  if (templateId) {
    const exists = sqlite.prepare(
      "SELECT id FROM template_instances WHERE title = ? AND template_id = ?"
    ).get(instance.title, templateId);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO template_instances (template_id, title, reference_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        templateId,
        instance.title,
        instance.reference_code,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  }
});


// Seed new metadata tables based on comprehensive requirement (s.txt)
const seedMetadata = (table: string, items: string[]) => {
  items.forEach((name: string, index: number) => {
    const exists = sqlite.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name);
    if (!exists) sqlite.prepare(`INSERT INTO ${table} (name, sort_order, is_active) VALUES (?, ?, ?)`).run(name, index, 1);
  });
};

seedMetadata('action_priorities', ['خیلی زیاد', 'زیاد', 'متوسط', 'پایین']);
seedMetadata('confidentiality_levels', ['عادی', 'محرمانه', 'خیلی محرمانه', 'سری', 'به کلی سری', 'عمومی']);
seedMetadata('project_levels', ['سطح راهبردی', 'سطح ۱', 'سطح ۲', 'سطح ۳', 'سطح ۴']);
seedMetadata('approval_authorities', ['نهاجا (رده دانشی و پژوهشی / شورای عالی دانش و پژوهش)', 'آجا (م. عتف)', 'ستاد کل (م. عتف)']);
seedMetadata('knowledge_project_types', ['مستندسازی', 'تجربه‌نگاری', 'تاریخ‌شفاهی', 'نشر کتاب', 'پیوست مدیریت دانش رخدادها', 'کتب مرجع (دانشنامه / فرهنگنامه / اطلس)']);
seedMetadata('scientific_diplomacy_levels', ['درون‌رده دانشی و پژوهشی', 'درون‌نیرویی', 'درون‌سازمانی', 'بین‌سازمانی', 'کشوری']);
seedMetadata('tree_node_types', ['نظریه', 'الگو', 'راهبرد', 'راه‌کار و توصیه', 'دانش نوظهور', 'معماری', 'دانش فنی', 'نقشه‌راه', 'ایده', 'سناریو', 'خلاقیت و نوآوری']);
seedMetadata('research_networks', ['شورای راهبردی علم فناوری و نوآوری', 'شورای هماهنگی پیاده‌سازی نقشه جامع علمی داجا', 'آزمایشگاه سیاست‌گذاری نفع', 'کلینیک نفع', 'دبیرخانه نقشه جامع علمی داجا', 'دبیرخانه تخصصی تصمیم‌سازی و تصمیم‌گیری', 'رصدخانه علم و فناوری', 'کمیسیون انسانی-اجتماعی', 'کمیسیون فنی مهندسی', 'کمیسیون زیست و سلامت', 'کمیسیون فرعی فاوا، سایبر و جنگال', 'کمیسیون فرعی امنیت، اطلاعات و حفاظت', 'کمیته مستقل علوم شناختی', 'کارگروه راهبری برنامه عمق بخشی و مهارت افزایی', 'شورای علمی بلوغ سطح 2', 'کمیته علمی نظارت بر روند فعالیت رده های دانشی و پژوهشی', 'شبکه همکاران پژوهشی', 'شبکه همکاران دانشی', 'شبکه خبرگان', 'شبکه همکاران ارزیاب', 'میز تخصصی نشر', 'میز تخصصی مدیریت دانش', 'میز تخصصی تحقیقات نظری']);
seedMetadata('knowledge_domains', ['حوزه علوم شناختی', 'حوزه سایبر و جنگال', 'حوزه فنی مهندسی', 'حوزه زیست و سلامت', 'حوزه انسانی و اجتماعی', 'حوزه علوم پایه', 'حوزه فناوری‌های نوین']);

// Updating existing event types with comprehensive ones
const moreEvents = ['همایش', 'جشنواره', 'سمینار', 'کارگاه', 'نشست های تخصصی و هم اندیشی', 'میزهای تخصصی'];
moreEvents.forEach((type, index) => {
  const exists = sqlite.prepare("SELECT id FROM event_types WHERE name = ?").get(type);
  if (!exists) {
    sqlite.prepare(`INSERT INTO event_types (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(type, index, 1, new Date().toISOString(), new Date().toISOString());
  }
});

// Update research project types with comprehensive ones
const moreResearchTypes = ['مأموریتی مرتبط با توان رزم', 'تبیین، آینده‌پژوهی', 'حمایت از پایان نامه یا رساله دانشجویی', 'نخبگان وظیفه جایگزین خدمت', 'همکاران تحقیقاتی کسر خدمت', 'اندیشه ورزی', 'بررسی ستادی', 'نقد و مناظره', 'نظریه‌پردازی', 'تدوین سازوکارها و نظامات', 'بازنگری در سازوکارها و نظامات', 'تعمیم فناوری نرم و قابلیت تثبیت شده'];
moreResearchTypes.forEach((type, index) => {
  const exists = sqlite.prepare("SELECT id FROM research_project_types WHERE name = ?").get(type);
  if (!exists) {
    sqlite.prepare(`INSERT INTO research_project_types (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(type, index, 1, new Date().toISOString(), new Date().toISOString());
  }
});

console.log('✅ Initial comprehensive data inserted successfully.');

// داده‌های پایه - سطوح سازمانی
const orgLevels = [
  { name: 'آجا', description: 'سطح کلان سازمانی - ستاد کل نیروهای مسلح' },
  { name: 'نیرو', description: 'سطح میانی سازمانی - نیروهای مسلح (نیروی زمینی، هوایی، دریایی)' },
  { name: 'رده', description: 'سطح اجرایی سازمانی - رده‌های دانشی و پژوهشی (مراکز مطالعات، دانشگاه‌ها)' },
];

orgLevels.forEach(level => {
  const exists = sqlite.prepare("SELECT id FROM organizational_levels WHERE name = ?").get(level.name);
  if (!exists) {
    sqlite.prepare(`INSERT INTO organizational_levels (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(level.name, level.description, 1, new Date().toISOString(), new Date().toISOString());
  }
});

// داده‌های پایه - سطوح دانش
const knowledgeLevels = [
  { name: 'راهبردی', description: 'کلان و کلی - سطح سیاست‌گذاری' },
  { name: 'عملیاتی', description: 'میانی - سطح برنامه‌ریزی و اجرا' },
  { name: 'اجرایی', description: 'خرد و جزئی - سطح عملیاتی و تاکتیکی' },
  { name: 'تاکتیکی', description: 'راهکنشی - سطح میدان و اقدام' },
];

knowledgeLevels.forEach(level => {
  const exists = sqlite.prepare("SELECT id FROM knowledge_levels WHERE name = ?").get(level.name);
  if (!exists) {
    sqlite.prepare(`INSERT INTO knowledge_levels (name, description, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(level.name, level.description, 1, 0, new Date().toISOString(), new Date().toISOString());
  }
});

// داده‌های پایه - انواع دانش
const knowledgeTypes = [
  'نظریه', 'الگو', 'راهبرد', 'راه‌کار و توصیه', 'دانش نوظهور',
  'معماری', 'دانش فنی', 'نقشه‌راه', 'ایده', 'سناریو', 'خلاقیت و نوآوری'
];

knowledgeTypes.forEach((type, index) => {
  const exists = sqlite.prepare("SELECT id FROM knowledge_types WHERE name = ?").get(type);
  if (!exists) {
    sqlite.prepare(`INSERT INTO knowledge_types (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(type, index, 1, new Date().toISOString(), new Date().toISOString());
  }
});

// داده‌های پایه - پروژه‌های پژوهشی
const researchProjectTypes = [
  'مأموریتی مرتبط با توان رزم', 'تبیین', 'آینده‌پژوهی', 'حمایت از پایان‌نامه',
  'نخبگان وظیفه', 'همکاران تحقیقاتی', 'اندیشه‌ورزی', 'بررسی ستادی',
  'نقد و مناظره', 'نظریه‌پردازی', 'تدوین سازوکارها', 'بازنگری در سازوکارها', 'تعمیم فناوری نرم'
];

researchProjectTypes.forEach((type, index) => {
  const exists = sqlite.prepare("SELECT id FROM research_project_types WHERE name = ?").get(type);
  if (!exists) {
    sqlite.prepare(`INSERT INTO research_project_types (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(type, index, 1, new Date().toISOString(), new Date().toISOString());
  }
});

// داده‌های پایه - انواع رویدادها (پایه)
const baseEventTypes = [
  'همایش', 'جشنواره', 'سمینار', 'کارگاه', 'نشست‌های تخصصی', 'هم‌اندیشی', 'میزهای تخصصی'
];

baseEventTypes.forEach((type, index) => {
  const exists = sqlite.prepare("SELECT id FROM event_types WHERE name = ?").get(type);
  if (!exists) {
    sqlite.prepare(`INSERT INTO event_types (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(type, index, 1, new Date().toISOString(), new Date().toISOString());
  }
});

console.log('✅ Base Metadata and Templates inserted successfully.');
