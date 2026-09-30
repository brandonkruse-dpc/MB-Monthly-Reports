import Papa from 'papaparse';
import { ColumnMapping, DateRange, StudentReport, TaskItem } from '../types';

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  studentName: 'Student Name',
  grade: 'grade',
  className: 'class.name',
  taskName: 'name',
  category: 'category.name',
  notes: 'notes',
  dueDate: 'Due Date',
  dropboxStatus: 'Dropbox Status',
};

// Common aliases for automatic column resolution
const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  studentName: ['student name', 'student', 'student_name', 'name of student', 'full name', 'pupil'],
  grade: ['grade', 'grade level', 'year', 'class grade', 'year group'],
  className: ['class.name', 'class name', 'classname', 'class', 'course', 'subject', 'course name'],
  taskName: ['name', 'task name', 'task', 'assignment', 'assignment name', 'task.name', 'title'],
  category: ['category.name', 'category name', 'category', 'assessment type', 'type', 'assignment category'],
  notes: ['notes', 'teacher comments', 'comments', 'comment', 'teacher notes', 'feedback', 'remark'],
  dueDate: ['due date', 'duedate', 'due_date', 'date', 'task date', 'deadline', 'assigned date'],
  dropboxStatus: ['dropbox status', 'dropboxstatus', 'dropbox_status', 'status', 'submission status', 'completion status'],
};

/**
 * Detect matching column headers from parsed CSV headers
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ...DEFAULT_COLUMN_MAPPING };
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: h.trim().toLowerCase() }));

  (Object.keys(COLUMN_ALIASES) as Array<keyof ColumnMapping>).forEach((key) => {
    const aliases = COLUMN_ALIASES[key];
    const match = normalizedHeaders.find(h => 
      aliases.includes(h.normalized) ||
      aliases.some(alias => h.normalized === alias.replace('.', ''))
    );
    if (match) {
      mapping[key] = match.original;
    } else {
      // Direct exact check
      const exact = headers.find(h => h.trim().toLowerCase() === DEFAULT_COLUMN_MAPPING[key].toLowerCase());
      if (exact) {
        mapping[key] = exact;
      }
    }
  });

  return mapping;
}

/**
 * Robust date parser for varied formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
 */
export function parseDateString(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  const str = String(dateStr).trim();
  if (!str) return null;

  // Try standard ISO or new Date(str) first
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    // ensure year is valid
    if (d.getFullYear() > 1990 && d.getFullYear() < 2100) {
      return d;
    }
  }

  // Common US format MM/DD/YYYY or MM-DD-YYYY
  const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (usMatch) {
    let month = parseInt(usMatch[1], 10) - 1;
    let day = parseInt(usMatch[2], 10);
    let year = parseInt(usMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format YYYY/MM/DD or YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    let month = parseInt(isoMatch[2], 10) - 1;
    let day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Format a Date object to YYYY-MM-DD for standard comparisons
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format date for display in reports (e.g. Oct 14, 2026)
 */
export function formatDateForDisplay(dateStrOrObj: string | Date | null): string {
  if (!dateStrOrObj) return 'N/A';
  const d = typeof dateStrOrObj === 'string' ? parseDateString(dateStrOrObj) : dateStrOrObj;
  if (!d || isNaN(d.getTime())) return String(dateStrOrObj);
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Parse CSV file content or string using PapaParse
 */
export function parseCSVData(csvContent: string): Promise<{ data: any[]; headers: string[]; errors: any[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve({
          data: results.data,
          headers,
          errors: results.errors,
        });
      },
      error: (error: any) => reject(error),
    });
  });
}

/**
 * Detect date range bounds from data
 */
export function detectDateBounds(rows: any[], dueDateCol: string): DateRange | null {
  let minTime = Infinity;
  let maxTime = -Infinity;

  rows.forEach((row) => {
    const rawVal = row[dueDateCol];
    if (rawVal) {
      const d = parseDateString(rawVal);
      if (d) {
        const time = d.getTime();
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
      }
    }
  });

  if (minTime === Infinity || maxTime === -Infinity) {
    return null;
  }

  return {
    startDate: formatDateToYYYYMMDD(new Date(minTime)),
    endDate: formatDateToYYYYMMDD(new Date(maxTime)),
  };
}

/**
 * Filter rows by user selected date range and group by student
 */
export function processStudentReports(
  rows: any[],
  mapping: ColumnMapping,
  dateRange: DateRange
): { reports: StudentReport[]; totalFilteredTasks: number; totalRawTasks: number } {
  const startObj = dateRange.startDate ? new Date(`${dateRange.startDate}T00:00:00`) : null;
  const endObj = dateRange.endDate ? new Date(`${dateRange.endDate}T23:59:59`) : null;

  const studentMap: Record<string, { grade: string; tasks: TaskItem[] }> = {};
  let totalFilteredTasks = 0;
  let totalRawTasks = rows.length;

  rows.forEach((row, index) => {
    const rawStudent = row[mapping.studentName];
    if (!rawStudent || String(rawStudent).trim() === '') return;

    const studentName = String(rawStudent).trim();
    const rawDueDate = row[mapping.dueDate];
    const parsedDate = parseDateString(rawDueDate);

    // Apply Date Range Filter if dates provided
    if (parsedDate) {
      if (startObj && parsedDate < startObj) return;
      if (endObj && parsedDate > endObj) return;
    } else {
      // If no valid date found in the row and date range is strictly set,
      // skip or check if user specified empty filter
      if (startObj || endObj) return;
    }

    totalFilteredTasks++;

    const grade = row[mapping.grade] ? String(row[mapping.grade]).trim() : '';
    const className = row[mapping.className] ? String(row[mapping.className]).trim() : 'General Class';
    const taskName = row[mapping.taskName] ? String(row[mapping.taskName]).trim() : `Task ${index + 1}`;
    const category = row[mapping.category] ? String(row[mapping.category]).trim() : 'Assessment';
    const notes = row[mapping.notes] ? String(row[mapping.notes]).trim() : '';
    const dropboxStatus = row[mapping.dropboxStatus] ? String(row[mapping.dropboxStatus]).trim() : 'Submitted';

    const taskItem: TaskItem = {
      id: `task-${index}-${Math.random().toString(36).substring(2, 7)}`,
      className,
      taskName,
      category,
      dueDate: rawDueDate || 'N/A',
      parsedDate,
      dropboxStatus,
      notes,
      rawRow: row,
    };

    if (!studentMap[studentName]) {
      studentMap[studentName] = {
        grade: grade || '11',
        tasks: [],
      };
    } else if (grade && !studentMap[studentName].grade) {
      studentMap[studentName].grade = grade;
    }

    studentMap[studentName].tasks.push(taskItem);
  });

  // Build structured student reports
  const reports: StudentReport[] = Object.keys(studentMap)
    .sort((a, b) => a.localeCompare(b))
    .map((studentName) => {
      const data = studentMap[studentName];
      
      // Sort tasks by due date ascending
      const sortedTasks = [...data.tasks].sort((a, b) => {
        if (!a.parsedDate) return 1;
        if (!b.parsedDate) return -1;
        return a.parsedDate.getTime() - b.parsedDate.getTime();
      });

      // Extract unique classes
      const uniqueClasses = Array.from(new Set(sortedTasks.map(t => t.className))).filter(Boolean);

      // Calculate statistics
      const totalTasks = sortedTasks.length;
      const completedTasks = sortedTasks.filter(t => {
        const s = t.dropboxStatus.toLowerCase();
        return s.includes('completed') || s.includes('submitted') || s.includes('graded') || s.includes('turned in') || s.includes('done') || s.includes('received');
      }).length;

      const lateTasks = sortedTasks.filter(t => t.dropboxStatus.toLowerCase().includes('late')).length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        studentName,
        grade: data.grade,
        classes: uniqueClasses,
        tasks: sortedTasks,
        stats: {
          totalTasks,
          completedTasks,
          completionRate,
          pendingTasks,
          lateTasks,
        },
      };
    });

  return { reports, totalFilteredTasks, totalRawTasks };
}

/**
 * Generate a realistic Sample Diploma Classes CSV string for instant testing
 */
export function generateSampleDiplomaCSV(): string {
  const headers = [
    'Student Name',
    'grade',
    'class.name',
    'name',
    'category.name',
    'notes',
    'Due Date',
    'Dropbox Status'
  ];

  const sampleRows = [
    // Alex Mercer - Grade 12
    ['Alex Mercer', '12', 'IB English A: Literature HL', 'Comparative Essay: Postcolonial Perspectives', 'Summative Assessment', 'Strong analytical thesis; clear contextual textual synthesis across both novels.', '2026-10-05', 'Completed & Graded (6/7)'],
    ['Alex Mercer', '12', 'IB English A: Literature HL', 'Oral Commentary Recording', 'Internal Assessment', 'Delivered confident analysis with insightful thematic pacing and precise citations.', '2026-10-18', 'Submitted On Time'],
    ['Alex Mercer', '12', 'AP Calculus BC', 'Series Convergence & Taylor Polynomials Exam', 'Unit Exam', 'Scored 94%. Flawless mastery of ratio test and error bounds calculations.', '2026-10-12', 'Completed & Graded (94%)'],
    ['Alex Mercer', '12', 'AP Calculus BC', 'Euler Method Computational Lab', 'Lab Practicum', 'Code simulation verified; graph exhibits accurate trajectory approximations.', '2026-10-24', 'Submitted On Time'],
    ['Alex Mercer', '12', 'IB Physics HL', 'Electromagnetic Induction Lab Report', 'Lab Report', 'Data collection complete. Please verify uncertainty margins in table 2.', '2026-10-09', 'Submitted On Time'],
    ['Alex Mercer', '12', 'IB Physics HL', 'Wave Phenomena & Doppler Effect Quiz', 'Formative Assessment', 'Solid conceptual understanding; revisit question 4 on relativistic Doppler shift.', '2026-10-22', 'Completed & Graded (88%)'],
    ['Alex Mercer', '12', 'AP World History: Modern', 'DBQ Essay: Decolonization in South Asia', 'Document-Based Essay', 'Exceptional sourcing and historical nuance demonstrated throughout body paragraphs.', '2026-10-15', 'Submitted On Time'],
    ['Alex Mercer', '12', 'AP World History: Modern', 'Cold War Ideology Seminar Discussion', 'Participation & Discussion', 'Active participant; led discussion segment on non-aligned movement.', '2026-10-28', 'Completed (Full Credit)'],

    // Maya Lin - Grade 11
    ['Maya Lin', '11', 'IB English A: Literature HL', 'Poetry Commentary: Sylvia Plath Stanza Analysis', 'Summative Assessment', 'Nuanced reading of recurring motifs. Excellent close-reading and syntax breakdown.', '2026-10-04', 'Completed & Graded (7/7)'],
    ['Maya Lin', '11', 'IB English A: Literature HL', 'Independent Reading Journal #4', 'Formative Assessment', 'Thoughtful reflections submitted on time with text references.', '2026-10-19', 'Submitted On Time'],
    ['Maya Lin', '11', 'AP Calculus BC', 'Optimization & Related Rates Problem Set', 'Homework Set', 'Neat derivations and step-by-step calculus work shown clearly.', '2026-10-08', 'Completed & Graded (98%)'],
    ['Maya Lin', '11', 'AP Calculus BC', 'Derivative Applications Midterm', 'Summative Assessment', 'Outstanding analytical rigor across all free-response items.', '2026-10-21', 'Completed & Graded (96%)'],
    ['Maya Lin', '11', 'IB Chemistry HL', 'Acid-Base Titration Investigation', 'Lab Report', 'Accurate equivalence point calculation; thorough error analysis included.', '2026-10-11', 'Submitted On Time'],
    ['Maya Lin', '11', 'IB Chemistry HL', 'Thermodynamics & Gibbs Free Energy Problem Set', 'Formative Assessment', 'All problems completed accurately. Ready for the upcoming summative.', '2026-10-26', 'Completed & Graded (100%)'],
    ['Maya Lin', '11', 'Visual Arts HL', 'Comparative Study Exhibition Portfolio Piece 1', 'Studio Portfolio', 'Impressive conceptual cohesion and thoughtful medium exploration.', '2026-10-16', 'Submitted On Time'],

    // Carlos Rodriguez - Grade 12
    ['Carlos Rodriguez', '12', 'IB English A: Literature HL', 'Drama Analysis: Oedipus Rex Motifs', 'Summative Assessment', 'Good grasp of dramatic irony. Remember to cite specific line numbers.', '2026-10-06', 'Submitted Late (Approved)'],
    ['Carlos Rodriguez', '12', 'IB English A: Literature HL', 'Literary Devices Quiz', 'Formative Assessment', 'Review metonymy vs synecdoche definitions for next assessment.', '2026-10-20', 'Completed & Graded (82%)'],
    ['Carlos Rodriguez', '12', 'AP Calculus BC', 'Integration Techniques Master Problem Set', 'Homework Set', 'Integration by parts is solid; review trigonometric substitution workflows.', '2026-10-10', 'Submitted On Time'],
    ['Carlos Rodriguez', '12', 'AP Calculus BC', 'Differential Equations Assessment', 'Summative Assessment', 'Separation of variables executed cleanly. Commendable improvement shown.', '2026-10-25', 'Completed & Graded (85%)'],
    ['Carlos Rodriguez', '12', 'IB Physics HL', 'Rotational Mechanics Lab Report', 'Lab Report', 'Moment of inertia calculations need brief revision before final grade.', '2026-10-14', 'Resubmission Requested'],
    ['Carlos Rodriguez', '12', 'IB Physics HL', 'Thermal Physics Problem Set', 'Formative Assessment', 'Great effort on calorimetry exercises. Minor unit conversion note provided.', '2026-10-27', 'Submitted On Time'],
    ['Carlos Rodriguez', '12', 'AP World History: Modern', 'Decolonization Primary Source Analysis', 'Formative Assessment', 'Solid historical contextualization. Work turned in promptly.', '2026-10-17', 'Completed & Graded (90%)'],

    // Sophia Patel - Grade 11
    ['Sophia Patel', '11', 'IB English A: Literature HL', 'Prose Passage Commentary Draft', 'Formative Assessment', 'Engaging introduction. Expand on the author\'s use of shifting narrative voice.', '2026-10-03', 'Submitted On Time'],
    ['Sophia Patel', '11', 'IB English A: Literature HL', 'Vocabulary & Literary Terminology Check', 'Quiz', 'Full credit achieved. Consistent attention to technical literary vocabulary.', '2026-10-17', 'Completed & Graded (100%)'],
    ['Sophia Patel', '11', 'AP Calculus BC', 'Implicit Differentiation Challenge Tasks', 'Homework Set', 'Very clean algebraic manipulations; well-organized solutions.', '2026-10-07', 'Submitted On Time'],
    ['Sophia Patel', '11', 'AP Calculus BC', 'Mean Value Theorem Application Tasks', 'Formative Assessment', 'Conditions checked appropriately before applying the theorem. Good rigor.', '2026-10-23', 'Completed & Graded (92%)'],
    ['Sophia Patel', '11', 'IB Chemistry HL', 'Spectrophotometry Beer-Lambert Law Lab', 'Lab Practicum', 'Calibration curve plotted with high precision (R^2 = 0.998). Superb report.', '2026-10-13', 'Submitted On Time'],
    ['Sophia Patel', '11', 'IB Chemistry HL', 'Kinetics Reaction Rate Order Determination', 'Summative Assessment', 'Method of initial rates solved accurately across all three trials.', '2026-10-29', 'Completed & Graded (95%)'],
    ['Sophia Patel', '11', 'Visual Arts HL', 'Process Journal Entry: Mixed Media Studies', 'Studio Journal', 'Rich visual inquiry and reflective annotations regarding cultural identity.', '2026-10-18', 'Submitted On Time']
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...sampleRows.map(row => row.map(escapeCSV).join(','))
  ];

  return csvLines.join('\n');
}
