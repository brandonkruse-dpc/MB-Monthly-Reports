import React from 'react';
import { StudentReport } from '../types';
import { StudentReportCard } from './StudentReportCard';
import { X, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: StudentReport[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  dateRangeText: string;
  onDownloadSinglePDF: (report: StudentReport) => void;
  onPrintSingle: (report: StudentReport) => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reports,
  currentIndex,
  onSelectIndex,
  dateRangeText,
  onDownloadSinglePDF,
  onPrintSingle,
}) => {
  if (!isOpen || reports.length === 0) return null;

  const currentReport = reports[currentIndex] || reports[0];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < reports.length - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-slate-100 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        
        {/* Modal Top Bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900 truncate">
              {currentReport.studentName}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Student {currentIndex + 1} of {reports.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Student Pagination Buttons */}
            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden mr-2">
              <button
                onClick={() => hasPrev && onSelectIndex(currentIndex - 1)}
                disabled={!hasPrev}
                title="Previous Student"
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => hasNext && onSelectIndex(currentIndex + 1)}
                disabled={!hasNext}
                title="Next Student"
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 border-l border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onPrintSingle(currentReport)}
              className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 text-xs font-medium flex items-center gap-1.5 px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={() => onDownloadSinglePDF(currentReport)}
              className="p-1.5 text-white bg-slate-900 hover:bg-slate-800 rounded text-xs font-semibold flex items-center gap-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-200/60 flex justify-center">
          <StudentReportCard
            report={currentReport}
            dateRangeText={dateRangeText}
            onDownloadPDF={() => onDownloadSinglePDF(currentReport)}
            onPrint={() => onPrintSingle(currentReport)}
            isCompact={false}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-2.5 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div>
            Formatted for standard Letter / A4 1-2 page parent summary
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => hasPrev && onSelectIndex(currentIndex - 1)}
              disabled={!hasPrev}
              className="px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous Student
            </button>
            <button
              onClick={() => hasNext && onSelectIndex(currentIndex + 1)}
              disabled={!hasNext}
              className="px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next Student
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
