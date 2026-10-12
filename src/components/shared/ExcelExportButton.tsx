import { FileSpreadsheet } from 'lucide-react';
import { exportCurrentPageToExcel } from '../../utils/reportExport';

interface ExcelExportButtonProps {
  title?: string;
  className?: string;
}

export function ExcelExportButton({
  title = 'گزارش صفحه',
  className = '',
}: ExcelExportButtonProps) {
  return (
    <button
      type="button"
      onClick={() => { void exportCurrentPageToExcel(title); }}
      className={`inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 ${className}`}
      title="دریافت داده‌های قابل مشاهدهٔ صفحه در قالب اکسل"
    >
      <FileSpreadsheet size={16} />
      خروجی اکسل
    </button>
  );
}
