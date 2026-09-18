import { sqlite, initDb } from '../src/db/index.js';

console.log("Seeding Nezam Masael (Issues)...");
initDb();

// Clear existing issues to prevent duplicates
sqlite.prepare("DELETE FROM issue_templates").run();
sqlite.prepare("DELETE FROM issues").run();

// Sample JSON strings for JSON fields
const macroProject = JSON.stringify({ name: 'پروژه کلان هوشمندسازی', code: 'AI-100' });
const collaborationNetwork = JSON.stringify(['دانشگاه شریف', 'پژوهشگاه ارتباطات']);
const issueResolutionTeam = JSON.stringify([{ name: 'دکتر محمدی', role: 'مدیر پروژه' }, { name: 'مهندس رضایی', role: 'توسعه دهنده' }]);
const needStatement = JSON.stringify({ statement: 'نیاز به افزایش دقت پردازش متون در اسناد سازمانی', context: 'حجم بالای اسناد نیازمند تحلیل' });
const contract = JSON.stringify({ contractNumber: 'CTR-1404-001', contractor: 'شرکت فناوری نوین' });
const stage20 = JSON.stringify({ status: 'completed', description: 'تکمیل فاز مطالعاتی' });
const stage50 = JSON.stringify({ status: 'in_progress', description: 'توسعه نمونه اولیه' });
const stage100 = JSON.stringify({ status: 'pending', description: 'تست و استقرار نهایی' });
const application = JSON.stringify({ targetAudience: 'مدیران ارشد', expectedImpact: 'صرفه جویی در زمان' });

// Get a domain node id if possible
let domainNodeId = null;
const someNode = sqlite.prepare("SELECT id FROM tree_nodes WHERE level = 'L' LIMIT 1").get() as any;
if (someNode) {
    domainNodeId = someNode.id;
}

// Get some template ids
const templates = sqlite.prepare("SELECT id FROM templates LIMIT 2").all() as any[];

const issueStmt = sqlite.prepare(`
  INSERT INTO issues (
    title, solution_direction, responsible_unit, confidentiality_level, action_priority, approval_date,
    knowledge_type, project_level, approval_authority, research_project_type, knowledge_project_type, events,
    macro_project, scientific_diplomacy, collaborators, collaboration_network, reference_document,
    required_budget, approved_budget, assigned_budget, expected_months, completion_percent,
    actions_taken, bottlenecks, orders, issue_resolution_team, need_statement, contract,
    stage_20, stage_50, stage_100, application, status, created_at, updated_at, domain_node_id
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

const runIssue = (data: any[]) => {
    const info = issueStmt.run(data);
    const id = info.lastInsertRowid;
    if (templates.length > 0) {
        templates.forEach(t => {
            sqlite.prepare("INSERT INTO issue_templates (issue_id, template_id) VALUES (?, ?)").run(id, t.id);
        });
    }
};

runIssue([
    'فقدان زیرساخت ابری بومی امن برای پردازش داده‌های حساس', // title
    'توسعه و استقرار پلتفرم ابری ایزوله و بومی در مراکز داده سازمانی', // solution_direction
    'معاونت فاوا', // responsible_unit
    'خیلی محرمانه', // confidentiality_level
    'بحرانی', // action_priority
    '1404/02/15', // approval_date
    'دانش فنی', // knowledge_type
    'سطح راهبردی', // project_level
    'آجا (م. عتف)', // approval_authority
    'تبیین، آینده‌پژوهی', // research_project_type
    'پیوست مدیریت دانش رخدادها', // knowledge_project_type
    'نشست های تخصصی و هم اندیشی', // events
    macroProject, // macro_project
    'درون‌سازمانی', // scientific_diplomacy
    'مرکز تحقیقات امنیت', // collaborators
    collaborationNetwork, // collaboration_network
    'سند چشم‌انداز 1404', // reference_document
    1500000000, // required_budget
    1200000000, // approved_budget
    500000000, // assigned_budget
    18, // expected_months
    35, // completion_percent
    'مطالعات اولیه انجام شده و RFP تهیه گردیده است', // actions_taken
    'کمبود تجهیزات سخت‌افزاری به دلیل تحریم', // bottlenecks
    'دستور فرماندهی مبنی بر تسریع', // orders
    issueResolutionTeam, // issue_resolution_team
    needStatement, // need_statement
    contract, // contract
    stage20, // stage_20
    stage50, // stage_50
    stage100, // stage_100
    application, // application
    'in_progress', // status
    new Date().toISOString(), // created_at
    new Date().toISOString(), // updated_at
    domainNodeId // domain_node_id
]);

runIssue([
    'پایین بودن دقت در پردازش متون و زبان فارسی بومی', // title
    'آموزش مدل زبانی بومی با دیتاست‌های تخصصی سازمان', // solution_direction
    'معاونت پژوهش', // responsible_unit
    'محرمانه', // confidentiality_level
    'بالا', // action_priority
    '1404/01/20', // approval_date
    'معماری', // knowledge_type
    'سطح ۱', // project_level
    'نهاجا (رده دانشی و پژوهشی / شورای عالی دانش و پژوهش)', // approval_authority
    'مأموریتی مرتبط با توان رزم', // research_project_type
    'مستندسازی', // knowledge_project_type
    'کارگاه', // events
    macroProject, // macro_project
    'درون‌نیرویی', // scientific_diplomacy
    'دپارتمان هوش مصنوعی', // collaborators
    collaborationNetwork, // collaboration_network
    'نظام‌نامه جامع پژوهشی', // reference_document
    800000000, // required_budget
    800000000, // approved_budget
    800000000, // assigned_budget
    12, // expected_months
    85, // completion_percent
    'مدل اولیه توسعه یافته و در حال تست نهایی است', // actions_taken
    'عدم وجود دیتاست برچسب‌خورده کافی', // bottlenecks
    'نامه تاییدیه شماره 1234', // orders
    issueResolutionTeam, // issue_resolution_team
    needStatement, // need_statement
    contract, // contract
    stage20, // stage_20
    stage50, // stage_50
    stage100, // stage_100
    application, // application
    'pending', // status
    new Date().toISOString(), // created_at
    new Date().toISOString(), // updated_at
    domainNodeId // domain_node_id
]);

console.log("Issues seeded successfully with comprehensive data!");
