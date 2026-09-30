import JSZip from 'jszip';
import { StudentReport } from '../types';
import { formatDateForDisplay } from './csvParser';

/**
 * Generate a standalone clean HTML string for a student's report.
 * This is used for:
 * 1. Rendering inside a hidden DOM container for html2pdf
 * 2. Instant printing via window.print() or iframe
 * 3. Standalone file exports
 */
export function renderReportHTML(
  report: StudentReport,
  dateRangeText: string,
  schoolName: string = 'High School Diploma Program'
): string {
  const sanitize = (str: string | undefined | null) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('graded') || s.includes('turned in')) {
      return 'background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;';
    }
    if (s.includes('late')) {
      return 'background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a;';
    }
    if (s.includes('resubmission') || s.includes('revision') || s.includes('missing')) {
      return 'background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca;';
    }
    return 'background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;';
  };

  const classBadges = report.classes
    .map(
      (c) =>
        `<span style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; color: #1e293b; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 6px; margin-bottom: 6px;">
          ${sanitize(c)}
        </span>`
    )
    .join('');

  const tableRows = report.tasks
    .map((task, index) => {
      const isEven = index % 2 === 0;
      const rowBg = isEven ? '#ffffff' : '#f8fafc';
      const formattedDate = formatDateForDisplay(task.parsedDate || task.dueDate);
      const badgeStyle = getStatusBadgeStyle(task.dropboxStatus);

      return `
        <tr style="background-color: ${rowBg}; page-break-inside: avoid; break-inside: avoid;">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #0f172a; vertical-align: top; width: 22%;">
            ${sanitize(task.className)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; vertical-align: top; width: 24%;">
            <div style="font-weight: 600; color: #0f172a;">${sanitize(task.taskName)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Due: ${sanitize(formattedDate)}</div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569; vertical-align: top; width: 16%;">
            <span style="display: inline-block; background-color: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500;">
              ${sanitize(task.category)}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; width: 16%;">
            <span style="display: inline-block; padding: 3px 7px; border-radius: 4px; font-weight: 600; font-size: 10.5px; ${badgeStyle}">
              ${sanitize(task.dropboxStatus)}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #334155; line-height: 1.45; vertical-align: top; width: 22%;">
            ${sanitize(task.notes) || '<span style="color: #94a3b8; font-style: italic;">No specific comments recorded</span>'}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="report-document" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px; line-height: 1.5;">
      
      <!-- Top Brand / Institute Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin-bottom: 4px;">
            ${sanitize(schoolName)}
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
            Student Monthly Progress Report
          </h1>
          <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 500;">
            Reporting Period: <strong style="color: #0f172a;">${sanitize(dateRangeText)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
            Official Summary
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
            Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <!-- Student Info & Class Summary Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 22px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">Student Name</div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px;">${sanitize(report.studentName)}</div>
          <div style="font-size: 12px; color: #334155; margin-top: 4px; font-weight: 500;">
            Grade Level: <strong style="color: #0f172a;">${sanitize(report.grade || '11/12')}</strong>
          </div>
        </div>
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 2px;">
            Monthly Performance Snapshot
          </div>
          <div style="display: flex; gap: 14px; margin-top: 4px;">
            <div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${report.stats.totalTasks}</div>
              <div style="font-size: 11px; color: #64748b;">Assigned Tasks</div>
            </div>
            <div style="border-left: 1px solid #cbd5e1; padding-left: 12px;">
              <div style="font-size: 18px; font-weight: 800; color: #059669;">${report.stats.completedTasks}</div>
              <div style="font-size: 11px; color: #64748b;">Completed</div>
            </div>
            <div style="border-left: 1px solid #cbd5e1; padding-left: 12px;">
              <div style="font-size: 18px; font-weight: 800; color: #2563eb;">${report.stats.completionRate}%</div>
              <div style="font-size: 11px; color: #64748b;">Completion</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Enrolled Classes Summary -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin-bottom: 8px;">
          Enrolled Diploma Classes (${report.classes.length})
        </div>
        <div style="display: flex; flex-wrap: wrap;">
          ${classBadges}
        </div>
      </div>

      <!-- Monthly Task Details Table -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155;">
            Assignments & Assessment Records
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Showing all ${report.tasks.length} entries in selected period
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; text-align: left;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #0f172a;">Class</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #0f172a;">Task / Assignment</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #0f172a;">Category</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #0f172a;">Dropbox Status</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #0f172a;">Teacher Comments</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : `
              <tr>
                <td colspan="5" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">
                  No task submissions or assignments recorded in this date range.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Parent Note & Sign-off Section -->
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; font-size: 11.5px; color: #475569;">
          <div>
            <strong style="color: #0f172a;">Note to Parents & Guardians:</strong>
            <p style="margin: 4px 0 0 0; line-height: 1.45;">
              This progress report provides an overview of coursework, submissions, and feedback for the current period. If you have questions regarding any assessment item or feedback, please contact the respective course instructor or academic counselor.
            </p>
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; margin-top: 18px; text-align: center;">
            <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
              Parent / Guardian Signature & Date
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * Generate PDF blob for a single student report using html2pdf.js
 */
export async function generateStudentPDFBlob(
  report: StudentReport,
  dateRangeText: string
): Promise<Blob> {
  const htmlContent = renderReportHTML(report, dateRangeText);

  // Create temporary offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // ~A4 width at 96 DPI
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      throw new Error('html2pdf.js library is not loaded. Please ensure the CDN script is reachable.');
    }

    const opt = {
      margin: [8, 8, 8, 8], // mm
      filename: `Progress_Report_${report.studentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Output as blob
    const pdfBlob: Blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Download a single student PDF file directly
 */
export async function downloadStudentPDF(
  report: StudentReport,
  dateRangeText: string
): Promise<void> {
  const blob = await generateStudentPDFBlob(report, dateRangeText);
  const cleanName = report.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Progress_Report_${cleanName}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Batch generate all student PDFs and package into a ZIP file
 */
export async function downloadAllStudentsAsZip(
  reports: StudentReport[],
  dateRangeText: string,
  onProgress?: (completed: number, total: number, studentName: string) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`Student_Progress_Reports_${new Date().toISOString().slice(0, 10)}`);

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    if (onProgress) {
      onProgress(i, reports.length, report.studentName);
    }
    const blob = await generateStudentPDFBlob(report, dateRangeText);
    const cleanName = report.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Progress_Report_${cleanName}.pdf`;
    
    if (folder) {
      folder.file(filename, blob);
    } else {
      zip.file(filename, blob);
    }
  }

  if (onProgress) {
    onProgress(reports.length, reports.length, 'Compressing archive...');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Student_Progress_Reports_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Print all reports in a single print window (vector-quality, multi-page)
 */
export function printAllReports(reports: StudentReport[], dateRangeText: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the print preview.');
    return;
  }

  const allHtml = reports.map((r, i) => `
    <div class="print-page" style="${i > 0 ? 'page-break-before: always; break-before: page;' : ''}">
      ${renderReportHTML(r, dateRangeText)}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Student Monthly Progress Reports</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
          }
          @media print {
            .print-page {
              page-break-after: always;
              break-after: page;
            }
            .print-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${allHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
