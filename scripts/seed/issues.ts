import { sqlite, initDb } from '../../src/db/index.js';

console.log("Seeding Issues (rich scenario)...");
initDb();

sqlite.transaction(() => {
    // گره‌های برگ درختواره مورد نیاز
    const lNode1 = sqlite.prepare("SELECT id FROM tree_nodes WHERE title = 'الگوریتم‌های توزیع هوشمند' LIMIT 1").get() as any;
    const lNode2 = sqlite.prepare("SELECT id FROM tree_nodes WHERE title = 'موتور تحلیل متن فارسی' LIMIT 1").get() as any;
    const lNode3 = sqlite.prepare("SELECT id FROM tree_nodes WHERE title = 'سیستم پرسش و پاسخ' LIMIT 1").get() as any;

    const template = sqlite.prepare("SELECT id FROM templates WHERE title = 'سند راهبردی' LIMIT 1").get() as any;

    const insertIssue = (
        nodeId: number | undefined,
        title: string,
        solution: string,
        unit: string,
        confidentiality: string,
        priority: string,
        approvalDate: string,
        budget: string,
        months: number,
        percent: number
    ) => {
        if (!nodeId) return;
        const exists = sqlite.prepare("SELECT id FROM issues WHERE title = ?").get(title);
        if (exists) return;
        sqlite.prepare(`
            INSERT INTO issues (
                domain_node_id, title, solution_direction, responsible_unit, 
                confidentiality_level, action_priority, approval_date,
                required_budget, expected_months, completion_percent,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            nodeId, title, solution, unit, confidentiality, priority,
            approvalDate, budget, months, percent,
            new Date().toISOString(), new Date().toISOString()
        );
    };

    // مسئله ۱ — گپ باز (درخت توزیع هوشمند)
    insertIssue(
        lNode1?.id,
        'طراحی الگوریتم توزیع هوشمند پردازش',
        'استفاده از معماری میکروسرویس و کوبرنتیز با توزیع بار پویا',
        'مرکز تحقیقات فاوا',
        'محرمانه',
        'خیلی زیاد',
        '1403/05/10',
        '5000000000',
        6,
        20
    );

    // مسئله ۲ — در حال اجرا (موتور تحلیل متن فارسی)
    insertIssue(
        lNode2?.id,
        'ارتقاء دقت موتور تحلیل متون تخصصی فارسی',
        'بهینه‌سازی مدل‌های NLP بومی و توسعه واژه‌نامه تخصصی نظامی',
        'مرکز پردازش هوشمند داده',
        'عادی',
        'زیاد',
        '1403/03/22',
        '3200000000',
        9,
        55
    );

    // مسئله ۳ — نزدیک به تکمیل (پرسش و پاسخ)
    insertIssue(
        lNode3?.id,
        'توسعه سیستم پرسش و پاسخ هوشمند سازمانی',
        'پیاده‌سازی RAG با استناددهی دقیق بر اسناد سازمانی',
        'پژوهشکده هوش مصنوعی',
        'محرمانه',
        'متوسط',
        '1403/01/15',
        '1800000000',
        12,
        85
    );

    void template;
})();
console.log("✅ Rich Issues seeded.");
