import { ArrowRight, FileDown, Printer, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatPersianDate } from '../../utils/persianDate';

interface PdfPreviewProps {
  title: string;
  html: string;
  onClose: () => void;
}

export function PdfPreview({ title, html, onClose }: PdfPreviewProps) {
  return createPortal(
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm; }
          body > * { display: none !important; }
          body > #dana-pdf-preview { display: block !important; position: static !important; inset: auto !important; width: 100% !important; height: auto !important; overflow: visible !important; padding: 0 !important; background: #fff !important; }
          #dana-pdf-preview .pdf-preview-toolbar { display: none !important; }
          #dana-pdf-preview .pdf-preview-document { display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
          #dana-pdf-preview table { width: 100%; border-collapse: collapse; }
          #dana-pdf-preview thead { display: table-header-group; }
          #dana-pdf-preview tr { break-inside: avoid; }
          #dana-pdf-preview button, #dana-pdf-preview input, #dana-pdf-preview select, #dana-pdf-preview textarea, #dana-pdf-preview form { display: none !important; }
          #dana-pdf-preview * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      <div
        id="dana-pdf-preview"
        className="fixed inset-0 z-[100000] overflow-y-auto bg-slate-100 p-3 sm:p-6"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dana-pdf-title"
      >
        <div className="pdf-preview-toolbar sticky top-0 z-10 mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight size={18} />
              بازگشت به صفحه
            </button>
            <div className="min-w-0">
              <h1 id="dana-pdf-title" className="truncate text-base font-bold text-slate-900">{title}</h1>
              <p className="text-xs text-slate-500">پیش‌نمایش محتوای انتخاب‌شده برای خروجی</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              title="بستن پیش‌نمایش"
            >
              <X size={17} />
              بستن
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              <FileDown size={17} />
              ایجاد / ذخیره PDF
              <Printer size={15} className="opacity-80" />
            </button>
          </div>
        </div>

        <article className="pdf-preview-document mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <header className="mb-6 rounded-xl bg-gradient-to-l from-blue-700 to-indigo-700 px-6 py-5 text-white">
            <div className="text-xs font-semibold text-blue-100">سامانه مدیریت دانش دانا</div>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <div className="mt-2 text-xs text-blue-100">
              تاریخ تهیه: {formatPersianDate(new Date())}
            </div>
          </header>
          <div
            className="pdf-report-content min-w-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </>,
    document.body
  );
}
