// server/routes/issueRoutes.ts
// ماژول بازصادرات روت‌های نظام مسائل جهت حفظ سازگاری کامل به عقب

export { issueRoutes, default } from './issues/index.js';
export { hasIssueAccess, canUserAccessNode, canUserAccessResearchItem, buildIssueOrgConditions } from './issues/issueAccess.js';
