import * as ExcelJS from 'exceljs';
import toast from 'react-hot-toast';

const getReportTitle = (fallback: string) => {
  const heading = document.querySelector('main h1, main h2');
  return heading?.textContent?.trim() || fallback;
};

const cloneReportContent = () => {
  const content = document.querySelector('main');
  if (!content) throw new Error('محتوای صفحه برای خروجی پیدا نشد');

  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(
    'button, input, select, textarea, [role="dialog"], [data-page-toolbar], [data-no-export], [data-pdf-export-only], script, iframe, object, embed, .no-export'
  ).forEach(element => element.remove());

  clone.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    for (const attribute of ['href', 'src', 'xlink:href']) {
      const value = element.getAttribute(attribute);
      if (value?.trim().toLowerCase().startsWith('javascript:')) {
        element.removeAttribute(attribute);
      }
    }
  });

  return clone;
};

const sanitizeReportNode = (node: Element): string => {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(
    'button, input, select, textarea, form, [role="dialog"], script, iframe, object, embed, [data-no-export], .no-export'
  ).forEach(element => element.remove());
  const revealExportOnly = (element: Element) => {
    if (!element.hasAttribute('data-pdf-export-only')) return;
    element.removeAttribute('data-pdf-export-only');
    element.classList.remove('hidden', 'sr-only');
    element.removeAttribute('aria-hidden');
  };
  revealExportOnly(clone);
  clone.querySelectorAll('[data-pdf-export-only]').forEach(revealExportOnly);
  clone.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    for (const attribute of ['href', 'src', 'xlink:href']) {
      const value = element.getAttribute(attribute);
      if (value?.trim().toLowerCase().startsWith('javascript:')) element.removeAttribute(attribute);
    }
  });
  return clone.outerHTML;
};

const getReportTables = (content: HTMLElement) => {
  return Array.from(content.querySelectorAll('table')).flatMap((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr'))
      .map(row => Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || ''))
      .filter(row => row.some(Boolean));

    return rows.length ? [{ name: `جدول ${index + 1}`, rows }] : [];
  });
};

const safeSheetName = (name: string, index: number) =>
  `${name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 24) || 'گزارش'} ${index + 1}`;

export async function exportCurrentPageToExcel(fallbackTitle: string) {
  try {
    const content = cloneReportContent();
    const title = getReportTitle(fallbackTitle);
    const tables = getReportTables(content);

    if (!tables.length) {
      const lines = (content.innerText || '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);
      if (!lines.length) throw new Error('اطلاعاتی برای خروجی اکسل در این صفحه وجود ندارد');
      tables.push({ name: 'محتوای صفحه', rows: [['محتوا'], ...lines.map(line => [line])] });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سامانه دانا';
    workbook.created = new Date();

    tables.forEach((table, index) => {
      const worksheet = workbook.addWorksheet(safeSheetName(table.name, index), {
        views: [{ rightToLeft: true }],
      });
      const columnCount = Math.max(1, ...table.rows.map(row => row.length));
      worksheet.mergeCells(1, 1, 1, columnCount);
      worksheet.getCell(1, 1).value = title;
      worksheet.getCell(1, 1).font = { name: 'Vazirmatn', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell(1, 1).alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      worksheet.getRow(1).height = 32;
      worksheet.mergeCells(2, 1, 2, columnCount);
      worksheet.getCell(2, 1).value = `تاریخ تهیه: ${new Date().toLocaleDateString('fa-IR')}`;
      worksheet.getCell(2, 1).font = { name: 'Vazirmatn', size: 10, color: { argb: 'FF64748B' } };

      table.rows.forEach((row, rowIndex) => {
        const excelRow = worksheet.addRow(row);
        excelRow.height = 24;
        excelRow.eachCell({ includeEmpty: true }, cell => {
          cell.font = { name: 'Vazirmatn', size: 10, bold: rowIndex === 0, color: { argb: rowIndex === 0 ? 'FFFFFFFF' : 'FF1E293B' } };
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (rowIndex === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
          } else if (rowIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          }
        });
      });

      worksheet.views = [{ state: 'frozen', ySplit: 3, rightToLeft: true }];
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: table.rows.length + 2, column: columnCount },
      };
      worksheet.columns = Array.from({ length: columnCount }, (_, columnIndex) => {
        const longest = Math.max(
          12,
          ...table.rows.map(row => String(row[columnIndex] ?? '').length)
        );
        return { width: Math.min(48, longest + 3) };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('فایل اکسل صفحه آماده شد');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'ساخت فایل اکسل ناموفق بود');
  }
}

export interface PdfReportSnapshot {
  title: string;
  html: string;
}

export function createPdfReportSnapshot(fallbackTitle: string): PdfReportSnapshot | null {
  const main = document.querySelector('main');
  if (!main) return null;
  const declaredSections = Array.from(main.querySelectorAll('[data-pdf-content]'));
  const reportCandidates = (declaredSections.length
    ? declaredSections.filter(section => section.getAttribute('data-pdf-has-data') !== 'false')
    : Array.from(main.querySelectorAll('[data-pdf-has-data="true"]')));
  const reportSections = reportCandidates.filter(section =>
    !reportCandidates.some(parentCandidate => parentCandidate !== section && parentCandidate.contains(section))
  );
  const tableAndChartSections = reportSections.length
    || declaredSections.length
    ? []
    : Array.from(main.querySelectorAll('table, .recharts-wrapper, [data-pdf-chart]'));
  const sections = reportSections.length || declaredSections.length ? reportSections : tableAndChartSections;
  const usableSections = sections.filter(hasExportableReportData);
  if (!usableSections.length) return null;
  const html = usableSections.map(sanitizeReportNode).join('');
  return { title: getReportTitle(fallbackTitle), html };
}

export function hasCurrentPagePdfData(): boolean {
  const main = document.querySelector('main');
  if (!main) return false;
  const declaredSections = Array.from(main.querySelectorAll('[data-pdf-content]'));
  if (declaredSections.length) {
    return declaredSections.some(section =>
      section.getAttribute('data-pdf-has-data') !== 'false' && hasExportableReportData(section)
    );
  }
  const sections = Array.from(main.querySelectorAll('[data-pdf-has-data="true"]'));
  return sections.length
    ? sections.some(hasExportableReportData)
    : hasExportableReportData(main);
}

function hasExportableReportData(content: ParentNode): boolean {
  const dataRows = Array.from(content.querySelectorAll('tbody tr')).filter(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    return cells.length > 0
      && !cells.some(cell => cell.hasAttribute('colspan'))
      && cells.some(cell => Boolean(cell.textContent?.trim()));
  });
  if (dataRows.length > 0) return true;
  if (content.querySelector('[data-pdf-item], [data-pdf-has-data="true"]')) return true;
  if (content instanceof Element && (content.hasAttribute('data-pdf-item') || content.getAttribute('data-pdf-has-data') === 'true')) return true;

  const chart = content instanceof Element && content.matches('.recharts-wrapper, [data-pdf-chart]')
    ? content
    : content.querySelector('.recharts-wrapper, [data-pdf-chart]');
  return Boolean(chart?.querySelector('svg path, svg rect, svg circle, canvas'));
}
