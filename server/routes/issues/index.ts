// server/routes/issues/index.ts
// ماژول اصلی روت‌های نظام مسائل با معماری تفکیک‌شده و ماژولار

import { Router } from 'express';
import { attachmentRouter } from './issueAttachments.js';
import { operationsRouter } from './issueOperations.js';
import { crudRouter } from './issueCrud.js';

export const issueRoutes = Router();

// اولویت نصب: روت‌های عملیاتی و استاتیک قبل از روت‌های پارامتردار /:id
issueRoutes.use(operationsRouter);
issueRoutes.use(attachmentRouter);
issueRoutes.use(crudRouter);

export default issueRoutes;
