import React from 'react';
import { StudentReport } from '../types';
import { formatDateForDisplay } from '../utils/csvParser';
import { FileText, CheckCircle2, Clock, AlertCircle, BookOpen } from 'lucide-react';

interface StudentReportCardProps {
  report: StudentReport;
  dateRangeText: string;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  isCompact?: boolean;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  report,
  dateRangeText,
  onDownloadPDF,
  onPrint,
  isCompact = false,
}) => {
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('graded') || s.includes('turned in')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {status}
        </span>
      );
    }
    if (s.includes('late')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {status}
        </span>
      );
    }
    if (s.includes('resubmission') || s.includes('revision') || s.includes('missing')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white text-slate-900 border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden">
      {/* Visual Report Container (mimics A4 / Printed Page) */}
      <div className="p-8 sm:p-10 font-sans print:p-0">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              High School Diploma Program
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Monthly Progress Report
            </h1>
            <div className="text-sm font-medium text-slate-600 mt-1">
              Reporting Period: <span className="text-slate-900 font-semibold">{dateRangeText}</span>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="inline-block bg-slate-900 text-white text-xs uppercase font-bold tracking-wider px-3 py-1 rounded">
              Parent Summary
            </span>
            <div className="text-xs text-slate-500 mt-2 font-mono">
              Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Student Profile & Snapshot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student Profile</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{report.studentName}</div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Grade Level: <span className="font-bold text-slate-900">{report.grade || '11/12'}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Period Performance</div>
            <div className="flex items-center gap-6 mt-1">
              <div>
                <div className="text-xl font-extrabold text-slate-900 tabular-nums">{report.stats.totalTasks}</div>
                <div className="text-xs text-slate-500">Total Tasks</div>
              </div>
              <div className="border-l border-slate-300 pl-4">
                <div className="text-xl font-extrabold text-emerald-600 tabular-nums">{report.stats.completedTasks}</div>
                <div className="text-xs text-slate-500">Completed</div>
              </div>
              <div className="border-l border-slate-300 pl-4">
                <div className="text-xl font-extrabold text-blue-600 tabular-nums">{report.stats.completionRate}%</div>
                <div className="text-xs text-slate-500">Completion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Classes Summary */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            Enrolled Diploma Classes ({report.classes.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {report.classes.map((cls, i) => (
              <span
                key={i}
                className="inline-block bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium px-2.5 py-1 rounded"
              >
                {cls}
              </span>
            ))}
          </div>
        </div>

        {/* Task Records Table */}
        <div className="mb-8">
          <div className="flex justify-between items-baseline mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tasks & Assessment Records
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {report.tasks.length} {report.tasks.length === 1 ? 'record' : 'records'}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase font-semibold">
                  <th className="py-2.5 px-3 w-1/4">Class</th>
                  <th className="py-2.5 px-3 w-1/4">Task / Assignment</th>
                  <th className="py-2.5 px-3 w-1/6">Category</th>
                  <th className="py-2.5 px-3 w-1/6">Dropbox Status</th>
                  <th className="py-2.5 px-3 w-1/4">Teacher Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {report.tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No task submissions or assignments recorded in this period.
                    </td>
                  </tr>
                ) : (
                  report.tasks.map((task, idx) => {
                    const isEven = idx % 2 === 0;
                    const formattedDate = formatDateForDisplay(task.parsedDate || task.dueDate);

                    return (
                      <tr
                        key={task.id || idx}
                        className={`${isEven ? 'bg-white' : 'bg-slate-50/70'} hover:bg-blue-50/40 transition-colors`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 align-top">
                          {task.className}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-slate-900">{task.taskName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Due: {formattedDate}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top text-slate-600">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {task.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          {getStatusBadge(task.dropboxStatus)}
                        </td>
                        <td className="py-2.5 px-3 align-top text-slate-700 leading-relaxed">
                          {task.notes ? (
                            <span>{task.notes}</span>
                          ) : (
                            <span className="text-slate-400 italic">No specific comments recorded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parent Communication / Sign-Off Section */}
        <div className="pt-6 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600">
            <div className="sm:col-span-2">
              <span className="font-bold text-slate-900">Note for Parents & Guardians:</span>
              <p className="mt-1 leading-relaxed text-slate-600">
                This monthly summary reflects assignments recorded in the Diploma Classes system during this reporting period. If you have any inquiries regarding academic progress or specific assignments, please reach out to the relevant course teacher or school counselor.
              </p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2 sm:mt-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Parent / Guardian Signature & Date
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Footer Controls (Hidden when printing) */}
      {!isCompact && (onDownloadPDF || onPrint) && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center print:hidden">
          <div className="text-xs text-slate-500">
            Designed for 1–2 page parent summary export
          </div>
          <div className="flex gap-2">
            {onPrint && (
              <button
                onClick={onPrint}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
              >
                Print Report
              </button>
            )}
            {onDownloadPDF && (
              <button
                onClick={onDownloadPDF}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Download PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
