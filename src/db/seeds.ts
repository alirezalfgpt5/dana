// src/db/seeds.ts
// پکیج جامع و کامل سیدر داده‌های اولیه و واقع‌گرایانه سامانه دانا (DANA)
// پوشش کامل ۱۰۰٪ جداول، ماژول‌ها و بخش‌های سیستم با داده‌های استاندارد

import BetterSqlite3Compat from './sqlite-adapter.js';

export function runComprehensiveSeed(sqlite: BetterSqlite3Compat) {
  console.log('🌱 Starting comprehensive database seed for DANA system...');
  const now = new Date().toISOString();

  // ====================================================================
  // ۱. ساختار سازمانی کامل (Bases & Units)
  // ====================================================================
  const basesList = [
    { id: 1, name: 'ستاد کل آجا', location: 'تهران', level: 'base', description: 'ستاد فرماندهی کل ارتش جمهوری اسلامی ایران', sortOrder: 1 },
    { id: 2, name: 'نیروی زمینی (نزاجا)', location: 'تهران - لویزان', level: 'base', description: 'فرماندهی نیروی زمینی ارتش', sortOrder: 2 },
    { id: 3, name: 'نیروی هوایی (نهاجا)', location: 'تهران - پیروزی', level: 'base', description: 'فرماندهی نیروی هوایی ارتش', sortOrder: 3 },
    { id: 4, name: 'نیروی دریایی (نداجا)', location: 'بندرعباس', level: 'base', description: 'فرماندهی نیروی دریایی ارتش', sortOrder: 4 },
    { id: 5, name: 'نیروی پدافند هوایی (پداجا)', location: 'تهران', level: 'base', description: 'قرارگاه پدافند هوایی خاتم‌الانبیاء', sortOrder: 5 },
    { id: 6, name: 'دانشگاه فرماندهی و ستاد (دافوس)', location: 'تهران', level: 'base', description: 'مرکز آموزش عالی و پژوهش‌های راهبردی جنگ', sortOrder: 6 },
    { id: 7, name: 'مرکز مطالعات راهبردی آجا', location: 'تهران', level: 'base', description: 'اندیشکده عالی آینده‌پژوهی و نظریه‌پردازی دفاعی', sortOrder: 7 },
  ];

  for (const b of basesList) {
    const exists = sqlite.prepare("SELECT id FROM bases WHERE id = ?").get(b.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO bases (id, name, location, level, parent_id, description, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)
      `).run(b.id, b.name, b.location, b.level, b.description, b.sortOrder, now, now);
    }
  }

  const unitsList = [
    // ستاد کل آجا (Base 1)
    { id: 1, baseId: 1, name: 'شورای عالی دانش و پژوهش', level: 'unit', description: 'سیاست‌گذاری کلان دانش و پژوهش آجا', sortOrder: 1 },
    { id: 2, baseId: 1, name: 'معاونت فناوری اطلاعات و ارتباطات (فاوا)', level: 'unit', description: 'راهبری سامانه‌ها، شبکه و امنیت سایبری', sortOrder: 2 },
    { id: 3, baseId: 1, name: 'معاونت آموزش و پژوهش ستاد کل', level: 'unit', description: 'مدیریت و پایش برنامه‌های آموزشی و دوره‌ها', sortOrder: 3 },
    
    // نزاجا (Base 2)
    { id: 4, baseId: 2, name: 'مرکز مطالعات و تحقیقات راهبردی نزاجا', level: 'unit', description: 'تحقیقات رزم زمینی و بهینه‌سازی ادوات', sortOrder: 1 },
    { id: 5, baseId: 2, name: 'مدیریت دانش و تجربیات میدانی نزاجا', level: 'unit', description: 'ثبت درس‌آموخته‌های رزمایش‌ها و مرزداری', sortOrder: 2 },
    
    // نهاجا (Base 3)
    { id: 6, baseId: 3, name: 'مرکز مطالعات، تحول و خودکفایی نهاجا', level: 'unit', description: 'طراحی، شبیه‌سازی پروازی و سامانه‌های اویونیک', sortOrder: 1 },
    { id: 7, baseId: 3, name: 'پایگاه یکم شکاری مهرآباد', level: 'unit', description: 'عملیات هوایی ترابری و شکاری', sortOrder: 2 },
    
    // نداجا (Base 4)
    { id: 8, baseId: 4, name: 'پژوهشکده علوم دریایی نداجا', level: 'unit', description: 'توسعه ناوبری و جنگ الکترونیک سطحی و زیرسطحی', sortOrder: 1 },
    { id: 9, baseId: 4, name: 'منطقه یکم امامت بندرعباس', level: 'unit', description: 'پایش و اشراف دریایی آب‌های آزاد', sortOrder: 2 },

    // پداجا (Base 5)
    { id: 10, baseId: 5, name: 'مرکز تحقیقات راداری و کشف هوایی', level: 'unit', description: 'پژوهش سامانه‌های راداری پسیو و اکتیو', sortOrder: 1 },
    
    // دافوس (Base 6)
    { id: 11, baseId: 6, name: 'گروه پژوهش‌های جنگ نوین و عملیات مشترک', level: 'unit', description: 'تدوین سناریوهای دکترین رزم ترکیبی', sortOrder: 1 },
    
    // مرکز مطالعات راهبردی (Base 7)
    { id: 12, baseId: 7, name: 'میز تخصصی آینده‌پژوهی و سناریوپردازی', level: 'unit', description: 'پایش تهدیدات نوظهور و فناوری‌های شناختی', sortOrder: 1 },
  ];

  for (const u of unitsList) {
    const exists = sqlite.prepare("SELECT id FROM units WHERE id = ?").get(u.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO units (id, base_id, name, level, parent_id, description, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)
      `).run(u.id, u.baseId, u.name, u.level, u.description, u.sortOrder, now, now);
    }
  }

  // ====================================================================
  // ۲. کاربران سازمانی با نقش‌های متفاوت (Users & Credentials)
  // Password for all: admin123 ($2b$10$xTmwp6HbtEEU3Yuz7xgA4ujFIpzU4kC/FDGMAA4HFK3hVnbfCfGpu)
  // ====================================================================
  const sampleUsers = [
    { username: 'admin_army', fullName: 'امیر سرتیپ محمد سلیمانی', role: 'admin', orgLevel: 'نیرو', baseId: 2, unitId: 4, rank: 'سرتیپ', phone: '09121110001' },
    { username: 'km_manager', fullName: 'دکتر علیرضا رضایی (مدیر دانش)', role: 'knowledge_manager', orgLevel: 'آجا', baseId: 1, unitId: 1, rank: 'کارمند', phone: '09121110002' },
    { username: 'expert_cyber', fullName: 'سرهنگ مهندس کیانوش راد', role: 'expert', orgLevel: 'رده', baseId: 1, unitId: 2, rank: 'سرهنگ', phone: '09121110003' },
    { username: 'expert_navy', fullName: 'ناخدا یکم حمید دریادار', role: 'expert', orgLevel: 'رده', baseId: 4, unitId: 8, rank: 'سرهنگ', phone: '09121110004' },
    { username: 'expert_air', fullName: 'سرگرد خلبان بابک پارسا', role: 'expert', orgLevel: 'رده', baseId: 3, unitId: 6, rank: 'سرگرد', phone: '09121110005' },
    { username: 'researcher1', fullName: 'دکتر مریم شفیعی (پژوهشگر ارشد)', role: 'user', orgLevel: 'رده', baseId: 6, unitId: 11, rank: 'کارمند', phone: '09121110006' },
  ];

  for (const u of sampleUsers) {
    const exists = sqlite.prepare("SELECT id FROM users WHERE username = ?").get(u.username);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO users (username, password, full_name, role, organization_level, base_id, unit_id, phone, rank, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        u.username,
        '$2b$10$xTmwp6HbtEEU3Yuz7xgA4ujFIpzU4kC/FDGMAA4HFK3hVnbfCfGpu',
        u.fullName,
        u.role,
        u.orgLevel,
        u.baseId,
        u.unitId,
        u.phone,
        u.rank,
        now,
        now
      );
    }
  }

  // ====================================================================
  // ۳. نمونه‌های اسناد و مصوبات الگوها (Template Instances)
  // ====================================================================
  const sampleInstances = [
    { templateId: 2, title: 'سند چشم‌انداز افق ۱۴۱۴ نیروی دفاعی هوشمند', code: 'POL-VIS-1414-01', desc: 'اهداف راهبردی فناوری‌های کلیدی دفاع هوشمند' },
    { templateId: 3, title: 'بیانیه مأموریت توسعه رزم سایبری و پردازش موازی', code: 'POL-MIS-CYB-02', desc: 'تبیین الزامات چابک‌سازی زیرساخت‌های محاسباتی' },
    { templateId: 4, title: 'سیاست‌نامه بهره‌گیری از هوش مصنوعی در صحنه نبرد', code: 'POL-GEN-AI-01', desc: 'چارچوب اصول اخلاقی و حاکمیتی الگوریتم‌های خودران' },
    { templateId: 6, title: 'طرح جامع راهبردی اشراف اطلاعاتی آب‌های دوردست', code: 'STR-NAV-2025', desc: 'برنامه پنج‌ساله ارتقای توان حسگری و ماهواره‌ای دریایی' },
    { templateId: 8, title: 'دستورالعمل جامع کشف و خنثی‌سازی جنگال الکترونیک', code: 'OPS-EW-SOP-09', desc: 'شیوه‌نامه استاندارد یگان‌های تاکتیکی در شرایط اختلال' },
    { templateId: 9, title: 'آیین‌نامه مدیریت درس‌آموخته‌ها و تجارب رزمایش‌ها', code: 'OPS-LL-REG-03', desc: 'فرآیند ثبت، بازنگری و توزیع تجارب میدانی فرماندهان' },
    { templateId: 11, title: 'طرح تاکتیکی دفاع لایه‌ای رادارهای پسیو', code: 'EXE-RAD-TAC-12', desc: 'آرایش دفاعی شبکه‌ای حسگرهای فرکانس پایین' },
    { templateId: 12, title: 'برنامه عملیاتی مهاجرت سامانه‌ها به پردازش ابری بومی', code: 'EXE-CLD-ACT-04', desc: 'جدول زمانی استقرار مخازن توزیع‌شده داده دفاعی' },
    { templateId: 14, title: 'گزارش ارزیابی دقت مدل‌های زبانی فارسی در اصطلاحات رزمی', code: 'RES-REP-NLP-2024', desc: 'نتایج آزمایش مدل‌های زبانی بومی روی متون گزارش نبرد' },
    { templateId: 15, title: 'مقاله علمی: الگوریتم توزیع بهینه بار در شبکه‌های نظیر به نظیر نظامی', code: 'RES-PAP-P2P-88', desc: 'چاپ شده در فصلنامه علوم و فناوری‌های دفاعی' },
    { templateId: 16, title: 'کتاب مرجع مبانی تحلیل سناریو و بازی‌های جنگ سایبرنتیک', code: 'RES-BOK-WARG-01', desc: 'انتشارات دافوس آجا - تألیف گروه مطالعات نوین' },
    { templateId: 19, title: 'دستنامه کاربری سامانه نظام مسائل و درخت دانش (دانا)', code: 'EDU-HAN-DANA-V3', desc: 'راهنمای مرحله به مرحله ثبت شکاف، مسائل و فرآیند Rollover' },
    { templateId: 21, title: 'گزارش نظارتی بازرسی میدانی مراکز داده نهاجا', code: 'SUP-REP-DAT-102', desc: 'ممیزی زیرساخت سرورها، ذخیره‌سازها و خطوط امن' },
  ];

  for (const inst of sampleInstances) {
    const exists = sqlite.prepare("SELECT id FROM template_instances WHERE reference_code = ?").get(inst.code);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO template_instances (template_id, title, reference_code, description, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        inst.templateId,
        inst.title,
        inst.code,
        inst.desc,
        JSON.stringify({ classification: 'confidential', verifiedBy: 'کمیته ممیزی اسناد', status: 'approved' }),
        now,
        now
      );
    }
  }

  // ====================================================================
  // ۴. انتساب قالب‌ها و نمونه‌های اسناد به گره‌های درختواره‌های موجود
  // ====================================================================
  try {
    // گره 14: الگوریتم‌های توزیع هوشمند
    sqlite.prepare(`
      UPDATE tree_nodes 
      SET template_ids = '14,15', instance_ids = '10', knowledge_type = 'الگو', level_id = 2, description = 'روش‌های توازن بار خودکار و بهینه‌سازی محاسبات ابری'
      WHERE id = 14;
    `).run();

    // گره 15: موتور تحلیل متن فارسی
    sqlite.prepare(`
      UPDATE tree_nodes 
      SET template_ids = '14,19', instance_ids = '9', knowledge_type = 'دانش فنی', level_id = 3, description = 'موتور پردازش ساخت‌یافته و معنایی داده‌های اسنادی'
      WHERE id = 15;
    `).run();

    // گره 16: موتور تحلیل متن فارسی در درخت تولید شده
    sqlite.prepare(`
      UPDATE tree_nodes 
      SET instance_ids = '9', knowledge_type = 'دانش فنی', level_id = 3
      WHERE id = 16;
    `).run();

    // گره 18: سیستم پرسش و پاسخ تولیدشده
    sqlite.prepare(`
      UPDATE tree_nodes 
      SET instance_ids = '9', knowledge_type = 'دانش نوظهور', level_id = 3
      WHERE id = 18;
    `).run();
  } catch (e) {
    console.error('Error linking templates to nodes:', e);
  }

  // ====================================================================
  // ۵. ایجاد درختواره‌های دانشی جدید در سایر حوزه‌ها (سایبر، پدافند، دریا)
  // ====================================================================
  const newTrees = [
    {
      id: 3,
      name: 'درختواره جامع امنیت سایبری و پدافند الکترونیک - مورد نیاز',
      type: 'required',
      description: 'نیازهای دانشی و مهارتی در مقابله با تهدیدات سایبرنتیک و جنگال',
      periodId: 1,
      baseId: 1,
      unitId: 2,
    },
    {
      id: 4,
      name: 'درختواره جامع امنیت سایبری و پدافند الکترونیک - تولید شده',
      type: 'produced',
      description: 'دستاوردهای پیاده‌سازی شده، تجارب عملیاتی و سپرهای دفاعی فعال',
      periodId: 1,
      baseId: 1,
      unitId: 2,
    },
    {
      id: 5,
      name: 'درختواره عملیات ترکیبی و پهپادی - مورد نیاز',
      type: 'required',
      description: 'نیازسنجی دانش هدایت، ناوبری امن و پرواز جمع پهپادهای خودران',
      periodId: 2,
      baseId: 3,
      unitId: 6,
    },
    {
      id: 6,
      name: 'درختواره پایش هوشمند سطحی و زیرسطحی خلیج فارس و دریای عمان',
      type: 'required',
      description: 'سامانه‌های یکپارچه کشف آکوستیک، سونار و نظارت ماهواره‌ای ساحلی',
      periodId: 2,
      baseId: 4,
      unitId: 8,
    }
  ];

  for (const t of newTrees) {
    const exists = sqlite.prepare("SELECT id FROM knowledge_trees WHERE id = ?").get(t.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO knowledge_trees (id, name, type, description, period_id, base_id, unit_id, is_active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)
      `).run(t.id, t.name, t.type, t.description, t.periodId, t.baseId, t.unitId, now, now);
    }
  }

  // ====================================================================
  // ۶. گره‌های درختواره سایبر و پدافند الکترونیک (Tree 3 & 4)
  // ====================================================================
  const cyberNodes = [
    // Tree 3 (Required)
    { id: 21, treeId: 3, parentId: null, level: 'R', title: 'دفاع همه‌جانبه سایبری و جنگ الکترونیک', kType: 'راهبرد', sort: 0 },
    { id: 22, treeId: 3, parentId: 21, level: 'T', title: 'امنیت زیرساخت‌های حیاتی و ارتباطات امن', kType: 'معماری', sort: 0 },
    { id: 23, treeId: 3, parentId: 21, level: 'T', title: 'کشف و پاسخ به تهدیدات پیشرفته مستمر (APT)', kType: 'دانش نوظهور', sort: 1 },
    { id: 24, treeId: 3, parentId: 22, level: 'B', title: 'رمزنگاری مقاوم در برابر محاسبات کوانتومی (PQC)', kType: 'نظریه', sort: 0 },
    { id: 25, treeId: 3, parentId: 23, level: 'B', title: 'هوش مصنوعی در تحلیل بدافزار و شکار تهدیدات', kType: 'دانش فنی', sort: 0 },
    { id: 26, treeId: 3, parentId: 24, level: 'SB', title: 'الگوریتم‌های رمزنگاری مشبکه‌ای (Lattice-based)', kType: 'نظریه', sort: 0 },
    { id: 27, treeId: 3, parentId: 25, level: 'SB', title: 'فایروال‌های شناختی و تحلیل رفتاری شبکه', kType: 'دانش فنی', sort: 0 },
    { id: 28, treeId: 3, parentId: 26, level: 'L', title: 'استانداردسازی پروتکل تبادل کلید امن کوانتومی', kType: 'آیین‌نامه و دستورالعمل', sort: 0 },
    { id: 29, treeId: 3, parentId: 27, level: 'L', title: 'سامانه هشدار زودهنگام نفوذ بر پایه یادگیری ماشین', kType: 'الگو', sort: 0 },

    // Tree 4 (Produced)
    { id: 30, treeId: 4, parentId: null, level: 'R', title: 'دفاع همه‌جانبه سایبری و جنگ الکترونیک', kType: 'راهبرد', sort: 0 },
    { id: 31, treeId: 4, parentId: 30, level: 'T', title: 'امنیت زیرساخت‌های حیاتی و ارتباطات امن', kType: 'معماری', sort: 0 },
    { id: 32, treeId: 4, parentId: 30, level: 'T', title: 'کشف و پاسخ به تهدیدات پیشرفته مستمر (APT)', kType: 'دانش نوظهور', sort: 1 },
    { id: 33, treeId: 4, parentId: 32, level: 'B', title: 'هوش مصنوعی در تحلیل بدافزار و شکار تهدیدات', kType: 'دانش فنی', sort: 0 },
    { id: 34, treeId: 4, parentId: 33, level: 'SB', title: 'فایروال‌های شناختی و تحلیل رفتاری شبکه', kType: 'دانش فنی', sort: 0 },
    { id: 35, treeId: 4, parentId: 34, level: 'L', title: 'سامانه هشدار زودهنگام نفوذ بر پایه یادگیری ماشین', kType: 'الگو', sort: 0 },
  ];

  for (const cn of cyberNodes) {
    const exists = sqlite.prepare("SELECT id FROM tree_nodes WHERE id = ?").get(cn.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO tree_nodes (id, tree_id, parent_id, level, title, description, knowledge_type, template_ids, instance_ids, level_id, sort_order, is_gap, gap_status, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 2, ?, 0, NULL, NULL, ?, ?)
      `).run(cn.id, cn.treeId, cn.parentId, cn.level, cn.title, `گره تخصصی در حوزه ${cn.title}`, cn.kType, cn.sort, now, now);
    }
  }

  // ====================================================================
  // ۷. دارایی‌های دانشی واقعی (Knowledge Assets)
  // ====================================================================
  const sampleAssets = [
    {
      nodeId: 14,
      title: 'سند راهنمای پیاده‌سازی خوشه‌بندی توزیع بار در دیتاسنترهای نظامی',
      templateId: 8,
      levelId: 2,
      description: 'دستورالعمل جامع پیکربندی کوبرنتیز و توزیع بار همزمان با رمزنگاری ترافیک',
      filePath: '/storage/assets/k8s_loadbalancer_guide.pdf',
      fileType: 'pdf',
      fileSize: 4250000,
      status: 'approved'
    },
    {
      nodeId: 15,
      title: 'واژه‌نامه تخصصی دفاعی و اختصارات رزمی برای پردازش زبان طبیعی',
      templateId: 14,
      levelId: 3,
      description: 'مجموعه داده حاوی بیش از ۲۵ هزار واژه و سرواژه استاندارد نظامی جهت پیش‌آموزش مدل‌ها',
      filePath: '/storage/assets/military_persian_corpus.xlsx',
      fileType: 'xlsx',
      fileSize: 1820000,
      status: 'published'
    },
    {
      nodeId: 28,
      title: 'پیش‌نویس استاندارد رمزنگاری پسا-کوانتومی آجا',
      templateId: 9,
      levelId: 1,
      description: 'آیین‌نامه الزامات تعویض الگوریتم‌های RSA با خانواده Kyber و Dilithium',
      filePath: '/storage/assets/pqc_standards_v1.docx',
      fileType: 'docx',
      fileSize: 3100000,
      status: 'review'
    },
    {
      nodeId: 35,
      title: 'گزارش تست نفوذ و ارزیابی فایروال شناختی در برابر حملات DDoS',
      templateId: 21,
      levelId: 3,
      description: 'نتایج ثبت رویدادها در سناریوی شبیه‌سازی شده رزمایش ذوالفقار',
      filePath: '/storage/assets/cognitive_firewall_eval.pdf',
      fileType: 'pdf',
      fileSize: 6400000,
      status: 'approved'
    }
  ];

  for (const a of sampleAssets) {
    const exists = sqlite.prepare("SELECT id FROM knowledge_assets WHERE title = ?").get(a.title);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO knowledge_assets (node_id, title, template_id, level_id, description, file_path, file_type, file_size, status, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        a.nodeId,
        a.title,
        a.templateId,
        a.levelId,
        a.description,
        a.filePath,
        a.fileType,
        a.fileSize,
        a.status,
        JSON.stringify({ author: 'مدیریت دانش آجا', securityLevel: 'محرمانه', checksum: 'sha256-verified' }),
        now,
        now
      );
    }
  }

  // ====================================================================
  // ۸. شکاف‌های دانشی جدید و تکمیل وضعیت‌ها (Gaps)
  // ====================================================================
  const newGaps = [
    {
      id: 3,
      periodId: 1,
      requiredNodeId: 28, // استانداردسازی رمزنگاری پسا-کوانتومی
      producedNodeId: null,
      status: 'open',
      gapType: 'missing',
      priority: 'بحرانی',
      matchScore: 0,
      desc: 'فقدان دکترین و الگوریتم‌های پیاده‌سازی شده در حوزه رمزنگاری پسا-کوانتومی در برابر تهدیدات رمزگشایی سریع'
    },
    {
      id: 4,
      periodId: 1,
      requiredNodeId: 29, // سامانه هشدار زودهنگام نفوذ
      producedNodeId: 35,
      status: 'partial',
      gapType: 'incomplete',
      priority: 'زیاد',
      matchScore: 0.72,
      desc: 'فایروال در لایه پایه پیاده‌سازی شده اما فاقد ماژول خودکار همبستگی رویدادهای راداری و سایبری است'
    },
    {
      id: 5,
      periodId: 2,
      requiredNodeId: 19, // سوال چگونه دقت تحلیل متون را افزایش دهیم
      producedNodeId: null,
      status: 'open',
      gapType: 'methodological',
      priority: 'متوسط',
      matchScore: 0,
      desc: 'نبود مدل اعتبارسنجی مستقل جهت سنجش خطای ادراک سامانه‌های تصمیم‌یار'
    }
  ];

  for (const g of newGaps) {
    const exists = sqlite.prepare("SELECT id FROM gaps WHERE id = ?").get(g.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO gaps (id, period_id, required_node_id, produced_node_id, status, gap_type, priority, match_score, description, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        g.id,
        g.periodId,
        g.requiredNodeId,
        g.producedNodeId,
        g.status,
        g.gapType,
        g.priority,
        g.matchScore,
        g.desc,
        JSON.stringify({ identifiedBy: 'تحلیل تطبیقی موتور v2', verifiedByCommittee: true }),
        now,
        now
      );
    }
  }

  // ====================================================================
  // ۹. آیتم‌های پژوهشی متصل به گپ‌ها (Research Items)
  // ====================================================================
  const newResearch = [
    {
      id: 2,
      gapId: 1,
      nodeId: 14,
      periodId: 1,
      plan7: 1,
      annualPlan: 1,
      directives: 1,
      warExp: 0,
      importance: 'راهبردی',
      combatImpact: 88,
      costBenefit: 92,
      priority: 'خیلی زیاد',
      timeFrame: '۱۲ ماهه',
      coverages: JSON.stringify(['برنامه پنج ساله', 'برنامه سالیانه', 'ابلاغیات']),
      meta: JSON.stringify({
        title: 'طراحی پروتکل توزیع بار محاسباتی رادارهای مرزی بر بستر محاسبات لبه (Edge Computing)',
        type: 'مأموریتی مرتبط با توان رزم',
        status: 'in_progress',
        director: 'سرهنگ مهندس کیانوش راد',
        executiveUnit: 'معاونت فاوا آجا'
      })
    },
    {
      id: 3,
      gapId: 3,
      nodeId: 28,
      periodId: 1,
      plan7: 1,
      annualPlan: 1,
      directives: 1,
      warExp: 0,
      importance: 'راهبردی',
      combatImpact: 95,
      costBenefit: 85,
      priority: 'بحرانی',
      timeFrame: '۲۴ ماهه',
      coverages: JSON.stringify(['برنامه پنج ساله', 'ابلاغیات']),
      meta: JSON.stringify({
        title: 'بومی‌سازی و پیاده‌سازی سخت‌افزاری تراشه رمزنگاری پسا-کوانتومی کیبر (Kyber-1024)',
        type: 'بنیادین و توسعه‌ای دفاعی',
        status: 'pending',
        director: 'دکتر علیرضا رضایی',
        executiveUnit: 'مرکز مطالعات راهبردی آجا'
      })
    },
    {
      id: 4,
      gapId: 4,
      nodeId: 29,
      periodId: 1,
      plan7: 0,
      annualPlan: 1,
      directives: 1,
      warExp: 1,
      importance: 'عملیاتی',
      combatImpact: 80,
      costBenefit: 89,
      priority: 'زیاد',
      timeFrame: '۶ ماهه',
      coverages: JSON.stringify(['برنامه سالیانه', 'تجربیات جنگ']),
      meta: JSON.stringify({
        title: 'پیاده‌سازی ماژول یادگیری تقویتی در سنسورهای شبکه برای تشخیص رفتارهای نفوذ ناشناخته',
        type: 'کاربردی تاکتیکی',
        status: 'completed',
        director: 'سرگرد بابک پارسا',
        executiveUnit: 'مرکز تحقیقات خودکفایی نهاجا'
      })
    }
  ];

  for (const r of newResearch) {
    const exists = sqlite.prepare("SELECT id FROM research_items WHERE id = ?").get(r.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO research_items (id, gap_id, node_id, period_id, is_part_of_seven_year_plan, is_part_of_annual_plan, is_part_of_directives, is_part_of_war_experience, importance, combat_impact, cost_benefit, priority, time_frame, program_coverages, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        r.id,
        r.gapId,
        r.nodeId,
        r.periodId,
        r.plan7,
        r.annualPlan,
        r.directives,
        r.warExp,
        r.importance,
        r.combatImpact,
        r.costBenefit,
        r.priority,
        r.timeFrame,
        r.coverages,
        r.meta,
        now,
        now
      );
    }
  }

  // ====================================================================
  // ۱۰. ثبت سوابق اجرای تحلیل شکاف (Gap Analysis Runs)
  // ====================================================================
  const existingRuns = sqlite.prepare("SELECT count(*) as c FROM gap_analysis_runs").get() as any;
  if (existingRuns.c === 0) {
    sqlite.prepare(`
      INSERT INTO gap_analysis_runs (required_tree_id, produced_tree_id, total_leaves, filled, partial, open_count, coverage_percent, carried_reviews, report, created_by, created_at)
      VALUES 
      (1, 2, 4, 1, 1, 2, 25, 1, ?, 1, ?),
      (3, 4, 3, 1, 1, 1, 33, 0, ?, 1, ?)
    `).run(
      JSON.stringify({ summary: 'تحلیل دوره‌ای پاییز - درخت هوش مصنوعی سازمانی', durationMs: 420 }),
      now,
      JSON.stringify({ summary: 'تحلیل هم‌سطح درخت امنیت سایبری نزاجا و فاوا ستاد کل', durationMs: 380 }),
      now
    );
  }

  // ====================================================================
  // ۱۱. سوابق بازنگری‌های دستی شکاف‌ها (Gap Reviews)
  // ====================================================================
  const existingReviews = sqlite.prepare("SELECT count(*) as c FROM gap_reviews").get() as any;
  if (existingReviews.c === 0) {
    sqlite.prepare(`
      INSERT INTO gap_reviews (gap_id, required_node_id, verdict, previous_status, new_status, note, reviewed_by, created_at)
      VALUES 
      (1, 11, 'confirmed_gap', 'open', 'open', 'تایید گپ توسط شورای علمی فاوا - اولویت حیاتی برای ارتقاء توان پردازشی', 1, ?),
      (2, 17, 'adjusted', 'open', 'partial', 'بخشی از ماژول توسط دانشگاه صنعتی مالک اشتر تحویل شده است', 1, ?)
    `).run(now, now);
  }

  // ====================================================================
  // ۱۲. تکمیل جامع اطلاعات مسائل موجود و افزودن مسائل جدید (Issues - 40+ فیلد کامل)
  // ====================================================================
  // آپدیت مسئله ۱ با جزئیات کامل و مقاطع پرداختی
  try {
    sqlite.prepare(`
      UPDATE issues 
      SET 
        solution_direction = 'به‌کارگیری چارچوب‌های توازن بار توزیع‌شده با الگوریتم ژنتیک و بهینه‌سازی ازدحام ذرات در مراکز فرماندهی متحرک',
        responsible_unit = 'معاونت فاوا آجا - مدیریت زیرساخت ابری',
        confidentiality_level = 'خیلی محرمانه',
        action_priority = 'بحرانی',
        approval_date = '1403/04/15',
        knowledge_type = 'دانش فنی',
        project_level = 'راهبردی',
        approval_authority = 'شورای عالی دانش و پژوهش',
        research_project_type = 'طرح پژوهشی راهبردی',
        knowledge_project_type = 'مستندسازی و تدوین دانش',
        events = 'همایش سراسری فناوری‌های نوین رزم مشترک',
        macro_project = ?,
        scientific_diplomacy = 'ملی و کشوری (دانشگاه‌ها و مراکز تحقیقاتی)',
        collaborators = 'دانشگاه صنعتی شریف، دانشگاه صنعتی مالک اشتر، مرکز پدافند سایبری',
        collaboration_network = ?,
        reference_document = 'ابلاغیه شماره ۱۰۴/۸۸ ستاد کل - تدابیر فرماندهی معظم کل قوا',
        approved_budget = 4800000000,
        assigned_budget = 2400000000,
        expected_months = 18,
        completion_percent = 35,
        actions_taken = 'تدوین سند معماری سیستم، تست آزمایشگاهی پروتکل در بستر آزمایشی ایزوله، انتخاب تیم پیمانکار',
        bottlenecks = 'تأمین تجهیزات سوئیچینگ سرعت بالا و بردهای FPGA ساخت داخل',
        orders = 'تسریع در ارزیابی میدانی و تکمیل مقطع دوم تا پایان آذرماه',
        issue_resolution_team = ?,
        need_statement = ?,
        contract = ?,
        executive_contract = ?,
        stage_20 = ?,
        stage_50 = ?,
        stage_100 = ?,
        application = ?,
        status = 'in_progress',
        category = 'فناوری‌های نوین'
      WHERE id = 1;
    `).run(
      JSON.stringify({ name: 'شبکه یکپارچه ابری فرماندهی و کنترل هوشمند آجا', code: 'PRJ-MACRO-01' }),
      JSON.stringify(['کمیسیون فرعی فاوا، سایبر و جنگال', 'شبکه همکاران پژوهشی', 'شبکه خبرگان']),
      JSON.stringify([
        { name: 'دکتر کیانوش راد', role: 'مدیر پروژه', phone: '09121110003' },
        { name: 'مهندس حسینی', role: 'معمار ارشد سیستم', phone: '09121110011' }
      ]),
      JSON.stringify({ statement: 'نیاز مبرم به پایداری پردازش در مواجهه با قطعی ارتباطات در خط مقدم و توازن بار بر روی گره‌های مجاور', verifiedBy: 'شورای عالی' }),
      JSON.stringify({ contractNumber: 'CNT-1403-889', company: 'صنایع الکترونیک زعیم', amount: 4800000000, signDate: '1403/05/01' }),
      JSON.stringify({ contractNumber: 'EXEC-9910', executor: 'دانشگاه مالک اشتر', startDate: '1403/05/10' }),
      JSON.stringify({ percent: 20, description: 'تحویل مستندات معماری نرم‌افزار', approvedDate: '1403/06/15', isApproved: true, paidAmount: 960000000 }),
      JSON.stringify({ percent: 50, description: 'ارائه نمونه اولیه پایلوت رزمایشی', approvedDate: null, isApproved: false, paidAmount: 0 }),
      JSON.stringify({ percent: 100, description: 'استقرار عملیاتی و آموزش کارکنان یگان‌ها', approvedDate: null, isApproved: false, paidAmount: 0 }),
      JSON.stringify({ battlefieldImpact: 'افزایش ۴۵ درصدی پایداری شبکه در شرایط اغتشاش الکترونیک', operationalUnit: 'یگان‌های واکنش سریع نزاجا' })
    );

    // به‌روزرسانی مسئله ۲
    sqlite.prepare(`
      UPDATE issues 
      SET 
        solution_direction = 'fine-tuning مدل‌های ترانسفورمر سبک با استفاده از داده‌های استاندارد شده نامه‌ها و گزارش‌های اطلاعاتی',
        responsible_unit = 'مرکز مطالعات راهبردی آجا - میز هوش مصنوعی',
        confidentiality_level = 'محرمانه',
        action_priority = 'زیاد',
        approval_date = '1403/02/20',
        knowledge_type = 'الگو',
        project_level = 'سطح ۱',
        approval_authority = 'معاونت دانش و پژوهش',
        research_project_type = 'طرح ارتقا و بهینه‌سازی فنی',
        knowledge_project_type = 'شناسایی و اکتساب دانش نوین',
        approved_budget = 3000000000,
        assigned_budget = 2000000000,
        expected_months = 12,
        completion_percent = 60,
        status = 'in_progress',
        stage_20 = ?,
        stage_50 = ?
      WHERE id = 2;
    `).run(
      JSON.stringify({ percent: 20, description: 'جمع‌آوری و پیش‌پردازش متون پایگاه دانش', isApproved: true, paidAmount: 600000000 }),
      JSON.stringify({ percent: 50, description: 'آموزش مدل اولیه و تست دقت F1-Score', isApproved: true, paidAmount: 900000000 })
    );

    // به‌روزرسانی مسئله ۳
    sqlite.prepare(`
      UPDATE issues 
      SET 
        solution_direction = 'ترکیب موتور جستجوی برداری کلمات با پایگاه دانش گرافی سازمانی (RAG ترکیبی)',
        responsible_unit = 'دافوس آجا - مرکز نوآوری',
        confidentiality_level = 'عادی',
        action_priority = 'متوسط',
        approval_date = '1402/11/10',
        knowledge_type = 'راه‌کار و توصیه',
        project_level = 'تاکتیکی',
        approval_authority = 'شورای پژوهشی پایگاه / یگان',
        research_project_type = 'مطالعات تطبیقی و الگوبرداری',
        approved_budget = 1800000000,
        assigned_budget = 1800000000,
        expected_months = 9,
        completion_percent = 90,
        status = 'in_progress',
        stage_20 = ?,
        stage_50 = ?,
        stage_100 = ?
      WHERE id = 3;
    `).run(
      JSON.stringify({ percent: 20, isApproved: true, paidAmount: 360000000 }),
      JSON.stringify({ percent: 50, isApproved: true, paidAmount: 540000000 }),
      JSON.stringify({ percent: 100, isApproved: false, paidAmount: 0 })
    );
  } catch (e) {
    console.error('Error enhancing existing issues:', e);
  }

  // افزودن مسائل جدید برای سال ۱۴۰۳ (دوره ۲) و تکمیل خط سیر زمانی (Lineage)
  const additionalIssues = [
    {
      id: 4,
      periodId: 2, // سال ۱۴۰۳
      sourceIssueId: 1, // پیوند خط سیر به مسئله ۱ (Audit Item 7 Lineage!)
      domainNodeId: 14,
      title: 'پیاده‌سازی پایلوت میدانی خوشه‌بندی توزیع بار در رزمایش ذوالفقار',
      solutionDirection: 'اجرای الگوریتم توزیع هوشمند پردازش در خودروهای تاکتیکی C4I',
      responsibleUnit: 'نزاجا - مرکز ارتباطات و جنگال',
      confidentialityLevel: 'خیلی محرمانه',
      actionPriority: 'بحرانی',
      approvalDate: '1403/06/01',
      knowledgeType: 'دانش فنی',
      projectLevel: 'عملیاتی',
      approvalAuthority: 'فرماندهی نیرو',
      researchProjectType: 'طرح ارتقا و بهینه‌سازی فنی',
      knowledgeProjectType: 'تجربه‌نگاری و ثبت خاطرات عملیاتی',
      scientificDiplomacy: 'درون‌سازمانی (یگانی و نیرویی)',
      collaborators: 'یگان ارتباطات نزاجا، قرارگاه پدافند هوایی',
      requiredBudget: 2800000000,
      approvedBudget: 2800000000,
      assignedBudget: 1500000000,
      expectedMonths: 8,
      completionPercent: 40,
      status: 'in_progress',
      category: 'فناوری‌های نوین',
      metadata: JSON.stringify({
        snapshotSource: { issueId: 1, periodName: 'برنامه هفتم توسعه' },
        lineageNote: 'فاز دوم پیاده‌سازی پروژه توزیع بار مصوب برنامه هفتم'
      })
    },
    {
      id: 5,
      periodId: 1,
      sourceIssueId: null,
      domainNodeId: 28, // PQC
      title: 'طراحی چیپ رمزنگاری سخت‌افزاری مقاوم در برابر حملات کوانتومی',
      solutionDirection: 'طراحی مدار مجتمع ASIC با پیاده‌سازی الگوریتم Dilithium برای تجهیزات بی‌سیم رمزکننده',
      responsibleUnit: 'ستاد کل آجا - پژوهشکده سامانه‌های امن',
      confidentialityLevel: 'به‌کلی سری',
      actionPriority: 'بحرانی',
      approvalDate: '1403/03/10',
      knowledgeType: 'نظریه',
      projectLevel: 'راهبردی',
      approvalAuthority: 'شورای عالی دانش و پژوهش',
      researchProjectType: 'طرح پژوهشی راهبردی',
      knowledgeProjectType: 'شناسایی و اکتساب دانش نوین',
      scientificDiplomacy: 'بین‌سازمانی (نیروهای مسلح)',
      collaborators: 'دانشگاه صنعتی شریف، پژوهشگاه صاایران',
      requiredBudget: 8500000000,
      approvedBudget: 8000000000,
      assignedBudget: 4000000000,
      expectedMonths: 24,
      completionPercent: 15,
      status: 'pending',
      category: 'سایبر و جنگال',
      metadata: JSON.stringify({ priorityRank: 1, nationalDefenseImpact: 'حیاتی' })
    },
    {
      id: 6,
      periodId: 1,
      sourceIssueId: null,
      domainNodeId: 29, // فایروال شناختی
      title: 'استقرار حسگرهای رفتاری شبکه برای کشف نفوذ بدافزارهای ناشناخته',
      solutionDirection: 'تحلیل خودکار ترافیک درگاه‌های داده با مدل یادگیری عمیق نامتقارن',
      responsibleUnit: 'نهاجا - مرکز فناوری اطلاعات',
      confidentialityLevel: 'محرمانه',
      actionPriority: 'زیاد',
      approvalDate: '1403/01/25',
      knowledgeType: 'الگو',
      projectLevel: 'سطح ۲',
      approvalAuthority: 'فرماندهی نیرو',
      researchProjectType: 'طرح ارتقا و بهینه‌سازی فنی',
      knowledgeProjectType: 'استانداردسازی و الگوبرداری',
      scientificDiplomacy: 'ملی و کشوری (دانشگاه‌ها و مراکز تحقیقاتی)',
      collaborators: 'شرکت‌های دانش‌بنیان امنیت شبکه',
      requiredBudget: 2200000000,
      approvedBudget: 2200000000,
      assignedBudget: 2200000000,
      expectedMonths: 6,
      completionPercent: 100,
      status: 'completed',
      category: 'سایبر و جنگال',
      metadata: JSON.stringify({ verifiedOutcome: 'دقت کشف ۹۸.۲ درصد' })
    }
  ];

  for (const iss of additionalIssues) {
    const exists = sqlite.prepare("SELECT id FROM issues WHERE id = ?").get(iss.id);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO issues (
          id, period_id, source_issue_id, domain_node_id, title, solution_direction, responsible_unit,
          confidentiality_level, action_priority, approval_date, knowledge_type, project_level,
          approval_authority, research_project_type, knowledge_project_type, scientific_diplomacy,
          collaborators, required_budget, approved_budget, assigned_budget, expected_months,
          completion_percent, status, category, metadata, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `).run(
        iss.id, iss.periodId, iss.sourceIssueId, iss.domainNodeId, iss.title, iss.solutionDirection, iss.responsibleUnit,
        iss.confidentialityLevel, iss.actionPriority, iss.approvalDate, iss.knowledgeType, iss.projectLevel,
        iss.approvalAuthority, iss.researchProjectType, iss.knowledgeProjectType, iss.scientificDiplomacy,
        iss.collaborators, iss.requiredBudget, iss.approvedBudget, iss.assignedBudget, iss.expectedMonths,
        iss.completionPercent, iss.status, iss.category, iss.metadata, now, now
      );
    }
  }

  // ====================================================================
  // ۱۳. پیوند مسائل به قالب‌ها (Issue Templates)
  // ====================================================================
  const issueTemplatesData = [
    { issueId: 1, templateId: 8 },
    { issueId: 1, templateId: 14 },
    { issueId: 2, templateId: 14 },
    { issueId: 2, templateId: 19 },
    { issueId: 3, templateId: 15 },
    { issueId: 4, templateId: 8 },
    { issueId: 5, templateId: 6 },
    { issueId: 5, templateId: 14 },
    { issueId: 6, templateId: 12 },
  ];

  for (const it of issueTemplatesData) {
    const exists = sqlite.prepare("SELECT id FROM issue_templates WHERE issue_id = ? AND template_id = ?").get(it.issueId, it.templateId);
    if (!exists) {
      sqlite.prepare("INSERT INTO issue_templates (issue_id, template_id) VALUES (?, ?)").run(it.issueId, it.templateId);
    }
  }

  // ====================================================================
  // ۱۴. فایل‌های پیوست مسائل و تاریخچه تغییرات (Attachments & History)
  // ====================================================================
  const attachments = [
    { issueId: 1, filePath: '/storage/issues/arch_doc_v1.pdf', fileName: 'سند معماری توزیع پردازش v1.pdf', fileSize: 3450000, fileType: 'pdf' },
    { issueId: 1, filePath: '/storage/issues/contract_signed.pdf', fileName: 'قرارداد امضا شده فاز نخست.pdf', fileSize: 1890000, fileType: 'pdf' },
    { issueId: 2, filePath: '/storage/issues/test_eval_f1.xlsx', fileName: 'نتایج ارزیابی ماتریس درهم‌ریختگی.xlsx', fileSize: 850000, fileType: 'xlsx' },
    { issueId: 5, filePath: '/storage/issues/kyber_asic_specs.pdf', fileName: 'مشخصات فنی ماسک سیلیکونی چیپ کیبر.pdf', fileSize: 5200000, fileType: 'pdf' },
  ];

  for (const att of attachments) {
    const exists = sqlite.prepare("SELECT id FROM issue_attachments WHERE file_name = ? AND issue_id = ?").get(att.fileName, att.issueId);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO issue_attachments (issue_id, file_path, file_name, file_size, file_type, uploaded_at, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(att.issueId, att.filePath, att.fileName, att.fileSize, att.fileType, now);
    }
  }

  const histories = [
    { issueId: 1, field: 'status', oldValue: 'pending', newValue: 'in_progress' },
    { issueId: 1, field: 'completionPercent', oldValue: '0', newValue: '35' },
    { issueId: 2, field: 'status', oldValue: 'pending', newValue: 'in_progress' },
    { issueId: 6, field: 'status', oldValue: 'in_progress', newValue: 'completed' },
  ];

  for (const h of histories) {
    const exists = sqlite.prepare("SELECT id FROM issue_history WHERE issue_id = ? AND field = ? AND new_value = ?").get(h.issueId, h.field, h.newValue);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO issue_history (issue_id, field, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(h.issueId, h.field, h.oldValue, h.newValue, now);
    }
  }

  // ====================================================================
  // ۱۵. فایل‌های عمومی سیستم در تب مدیریت فایل (Files table)
  // ====================================================================
  const publicFiles = [
    { name: 'دستورالعمل_فرمت_اکسل_تبادل_داده_یگانها.xlsx', path: '/storage/exports/unit_data_exchange_template.xlsx', size: 45200, type: 'spreadsheet', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', module: 'excel_exchange' },
    { name: 'شیوه_نامه_ارزیابی_و_امتیازدهی_شکافهای_دانشی.pdf', path: '/storage/general/gap_assessment_sop.pdf', size: 1250000, type: 'document', mime: 'application/pdf', module: 'general' },
    { name: 'سند_راهنمای_جامع_کاربری_سامانه_دانا.pdf', path: '/storage/general/dana_user_manual.pdf', size: 3820000, type: 'document', mime: 'application/pdf', module: 'general' },
    { name: 'خروجی_آماری_وضعیت_دانش_یگانهای_آجا_1403.xlsx', path: '/storage/exports/ajaa_knowledge_report_1403.xlsx', size: 78500, type: 'spreadsheet', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', module: 'exports' }
  ];

  for (const f of publicFiles) {
    const exists = sqlite.prepare("SELECT id FROM files WHERE name = ?").get(f.name);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO files (name, path, size, type, mime_type, module, module_id, uploaded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
      `).run(f.name, f.path, f.size, f.type, f.mime, f.module, now, now);
    }
  }

  // ====================================================================
  // ۱۶. سوابق تلفیق لایه‌ای درختواره‌ها (Tree Merges)
  // ====================================================================
  const existingMerges = sqlite.prepare("SELECT count(*) as c FROM tree_merges").get() as any;
  if (existingMerges.c === 0) {
    sqlite.prepare(`
      INSERT INTO tree_merges (tree_id, source_label, source_type, source_tree_id, added, updated, conflicts, skipped, details, created_by, created_at)
      VALUES 
      (1, 'تلفیق اکسل یگان فاوا نزاجا با درخت ستاد کل', 'excel', NULL, 3, 2, 0, 8, ?, 1, ?),
      (3, 'ادغام درختواره امنیت سایبری نهاجا و نداجا', 'tree', 4, 4, 1, 1, 5, ?, 1, ?)
    `).run(
      JSON.stringify({ notes: 'همگام‌سازی شاخه‌های هوش مصنوعی و پردازش موازی', conflictCount: 0 }),
      now,
      JSON.stringify({ notes: 'تلفیق شاخه‌های شبکه امن و رمزنگاری پسا-کوانتومی', resolvedConflicts: 1 }),
      now
    );
  }

  // ====================================================================
  // ۱۷. تاریخچه نسخه‌های همگام‌سازی آفلاین سی‌دی و لاگ رکوردها (Sync Versions)
  // ====================================================================
  const existingSyncVersions = sqlite.prepare("SELECT count(*) as c FROM sync_versions").get() as any;
  if (existingSyncVersions.c === 0) {
    const svRes = sqlite.prepare(`
      INSERT INTO sync_versions (unit_id, period_id, version_number, version_label, file_name, source_type, applied_by, user_name, summary, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      4, // مرکز مطالعات نزاجا
      1,
      1,
      'نسخه پاییز ۱۴۰۳ - تبادل داده رزمایش نزاجا',
      'NEZAJA_KNOWLEDGE_EXCHANGE_FALL_1403.xlsx',
      'excel_cd',
      1,
      'مدیر کل سیستم',
      JSON.stringify({
        totalNodesImported: 12,
        totalIssuesImported: 4,
        conflictsResolved: 1,
        matchRatePercent: 94
      }),
      'active',
      now
    );

    const versionId = svRes.lastInsertRowid;
    sqlite.prepare(`
      INSERT INTO record_version_logs (version_id, entity_type, entity_id, entity_title, action, field_name, old_value, new_value, conflict_detected, resolution_choice, resolved_by, created_at)
      VALUES 
      (?, 'tree_node', 14, 'الگوریتم‌های توزیع هوشمند', 'update', 'templateIds', '14', '14,15', 0, 'smart_merge', 'مدیر کل سیستم', ?),
      (?, 'issue', 1, 'طراحی الگوریتم توزیع هوشمند پردازش', 'update', 'completionPercent', '20', '35', 1, 'incoming', 'مدیر کل سیستم', ?)
    `).run(versionId, now, versionId, now);
  }

  // ====================================================================
  // ۱۸. تنظیمات عمومی و تنظیمات پایه‌ای سیستم (System Settings)
  // ====================================================================
  const defaultSettings = [
    { key: 'system_title', value: 'سیستم جامع مدیریت دانش و نظام مسائل (دانا)' },
    { key: 'organization_name', value: 'ارتش جمهوری اسلامی ایران (آجا)' },
    { key: 'academic_center', value: 'معاونت دانش و پژوهش' },
    { key: 'default_currency', value: 'ریال' },
    { key: 'active_language', value: 'fa' },
    { key: 'calendar_type', value: 'jalali' },
    { key: 'offline_mode', value: 'true' },
    { key: 'session_timeout_minutes', value: '480' },
    { key: 'data_classification_default', value: 'confidential' },
  ];

  for (const s of defaultSettings) {
    const exists = sqlite.prepare("SELECT key FROM system_settings WHERE key = ?").get(s.key);
    if (!exists) {
      sqlite.prepare("INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)").run(s.key, s.value, now);
    }
  }

  // ====================================================================
  // ۱۹. لاگ‌های حسابرسی نمونه جهت پایش داشبورد (Audit Logs)
  // ====================================================================
  const auditEntries = [
    { action: 'UPDATE', entityName: 'مسئله', entityId: 1, changes: JSON.stringify({ field: 'completionPercent', from: 20, to: 35 }) },
    { action: 'CREATE', entityName: 'شکاف دانشی', entityId: 3, changes: JSON.stringify({ title: 'رمزنگاری پسا-کوانتومی' }) },
    { action: 'CREATE', entityName: 'دارایی دانشی', entityId: 1, changes: JSON.stringify({ title: 'سند راهنمای پیاده‌سازی خوشه‌بندی توزیع بار' }) },
    { action: 'IMPORT', entityName: 'تبادل داده یگان', entityId: 4, changes: JSON.stringify({ file: 'NEZAJA_KNOWLEDGE_EXCHANGE_FALL_1403.xlsx' }) },
  ];

  for (const a of auditEntries) {
    sqlite.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_name, entity_id, changes, ip, user_agent, timestamp)
      VALUES (1, ?, ?, ?, ?, '127.0.0.1', 'DANA-Client/3.2 (Offline)', ?)
    `).run(a.action, a.entityName, a.entityId, a.changes, now);
  }

  console.log('✅ Comprehensive database seed completed successfully!');
}
