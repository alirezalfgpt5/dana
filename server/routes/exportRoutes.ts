import { Router } from 'express';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { db } from '../../src/db/index.js';
import { issues, treeNodes, knowledgeTrees } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns-jalali';

export const exportRoutes = Router();

exportRoutes.get('/issues/:id/word', async (req, res) => {
  try {
    const issueId = parseInt(req.params.id);
    const issueArr = await db.select().from(issues).where(eq(issues.id, issueId));
    if (issueArr.length === 0) return res.status(404).json({ error: 'Issue not found' });
    const issue = issueArr[0];

    // Create Word Document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "شناسنامه نظام مسائل",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "عنوان مسئله: ", bold: true }),
              new TextRun(issue.title || "نامشخص"),
            ],
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "وضعیت: ", bold: true }),
              new TextRun(issue.status || "-"),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "جهت‌گیری راه حل: ", bold: true }),
              new TextRun(issue.solutionDirection || "-"),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "شرح و توصیف: ", bold: true }),
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: "-",
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "سطح محرمانگی: ", bold: true }),
              new TextRun(issue.confidentialityLevel || "-"),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "گلوگاه‌ها و مشکلات: ", bold: true }),
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: issue.bottlenecks || "-",
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "تاریخ ثبت: ", bold: true }),
              new TextRun(issue.createdAt ? format(new Date(issue.createdAt), 'yyyy/MM/dd') : "-"),
            ],
            spacing: { after: 200 }
          })
        ],
      }],
    });

    const b64string = await Packer.toBase64String(doc);
    const buffer = Buffer.from(b64string, 'base64');

    res.setHeader('Content-Disposition', `attachment; filename=issue-${issueId}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting word:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});
