/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Calendar,
  SlidersHorizontal,
  Download,
  Printer,
  Sparkles,
  CheckCircle,
  Eye,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Search,
  School,
  AlertCircle
} from 'lucide-react';
import {
  StudentReport,
  ColumnMapping,
  DateRange,
  ProcessStatus,
} from './types';
import {
  DEFAULT_COLUMN_MAPPING,
  parseCSVData,
  detectColumnMapping,
  detectDateBounds,
  processStudentReports,
  generateSampleDiplomaCSV,
  formatDateForDisplay,
} from './utils/csvParser';
import {
  downloadStudentPDF,
  downloadAllStudentsAsZip,
  printAllReports,
} from './utils/pdfGenerator';
import { StudentReportCard } from './components/StudentReportCard';
import { ReportPreviewModal } from './components/ReportPreviewModal';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { StandaloneExportModal } from './components/StandaloneExportModal';

export default function App() {
  // Raw CSV data state
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  // Configuration
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  // Processing & Reports
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [totalFilteredTasks, setTotalFilteredTasks] = useState<number>(0);
  const [totalRawTasks, setTotalRawTasks] = useState<number>(0);
  const [status, setStatus] = useState<ProcessStatus>({
    step: 'idle',
    message: 'Ready to ingest Diploma Classes CSV',
    progressPercent: 0,
  });

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'table' | 'preview'>('table');
  const [selectedStudentIndex, setSelectedStudentIndex] = useState<number>(0);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [mappingModalOpen, setMappingModalOpen] = useState<boolean>(false);
  const [standaloneModalOpen, setStandaloneModalOpen] = useState<boolean>(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load sample data on startup for immediate experience
  useEffect(() => {
    handleLoadSampleData();
  }, []);

  // Handler: Parse incoming CSV text
  const handleCSVString = async (csvContent: string, name: string = 'diploma_classes.csv', sizeStr?: string) => {
    setStatus({
      step: 'parsing',
      message: 'Parsing CSV spreadsheet structure with PapaParse...',
      progressPercent: 20,
    });

    try {
      const result = await parseCSVData(csvContent);
      setRawRows(result.data);
      setAvailableHeaders(result.headers);
      setFileName(name);
      if (sizeStr) setFileSize(sizeStr);

      // Auto-detect column mappings
      const detectedMapping = detectColumnMapping(result.headers);
      setMapping(detectedMapping);

      // Detect date bounds if not already set
      const bounds = detectDateBounds(result.data, detectedMapping.dueDate);
      if (bounds) {
        setDateRange(bounds);
      }

      // Automatically generate reports
      generateReports(result.data, detectedMapping, bounds || dateRange);
    } catch (err: any) {
      setStatus({
        step: 'error',
        message: `Failed to parse CSV: ${err.message || err}`,
        progressPercent: 0,
        error: String(err),
      });
    }
  };

  // Handler: File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleCSVString(content, file.name, sizeKB);
      }
    };
    reader.readAsText(file);
  };

  // Handler: Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handler: Load Sample Data
  const handleLoadSampleData = () => {
    const sampleCsv = generateSampleDiplomaCSV();
    handleCSVString(sampleCsv, 'diploma_classes_october_sample.csv', '3.4 KB');
  };

  // Core Generator function
  const generateReports = (
    rowsToProcess: any[] = rawRows,
    colMap: ColumnMapping = mapping,
    dates: DateRange = dateRange
  ) => {
    if (rowsToProcess.length === 0) {
      setStatus({
        step: 'error',
        message: 'No CSV data loaded. Please upload a file or load sample data.',
        progressPercent: 0,
      });
      return;
    }

    setStatus({
      step: 'filtering',
      message: 'Filtering records by date range and grouping students...',
      progressPercent: 60,
    });

    try {
      const { reports: generatedReports, totalFilteredTasks: filteredCount, totalRawTasks: rawCount } =
        processStudentReports(rowsToProcess, colMap, dates);

      setReports(generatedReports);
      setTotalFilteredTasks(filteredCount);
      setTotalRawTasks(rawCount);
      setSelectedStudentIndex(0);

      setStatus({
        step: 'ready',
        message: `Successfully generated ${generatedReports.length} student progress reports!`,
        progressPercent: 100,
        totalStudents: generatedReports.length,
      });
    } catch (err: any) {
      setStatus({
        step: 'error',
        message: `Error generating reports: ${err.message || err}`,
        progressPercent: 0,
      });
    }
  };

  // Date Presets
  const applyDatePreset = (preset: 'month' | 'past30' | 'oct2026' | 'all') => {
    if (preset === 'all') {
      const bounds = detectDateBounds(rawRows, mapping.dueDate);
      if (bounds) {
        setDateRange(bounds);
        generateReports(rawRows, mapping, bounds);
      } else {
        setDateRange({ startDate: '', endDate: '' });
        generateReports(rawRows, mapping, { startDate: '', endDate: '' });
      }
      return;
    }

    if (preset === 'oct2026') {
      const range = { startDate: '2026-10-01', endDate: '2026-10-31' };
      setDateRange(range);
      generateReports(rawRows, mapping, range);
      return;
    }

    const now = new Date();
    if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const range = {
        startDate: first.toISOString().slice(0, 10),
        endDate: last.toISOString().slice(0, 10),
      };
      setDateRange(range);
      generateReports(rawRows, mapping, range);
    } else if (preset === 'past30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const range = {
        startDate: past.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
      };
      setDateRange(range);
      generateReports(rawRows, mapping, range);
    }
  };

  // Date Range Text for Report Header
  const getDateRangeText = () => {
    if (!dateRange.startDate && !dateRange.endDate) return 'Full Academic Term';
    const s = dateRange.startDate ? formatDateForDisplay(dateRange.startDate) : 'Term Start';
    const e = dateRange.endDate ? formatDateForDisplay(dateRange.endDate) : 'Term End';
    return `${s} — ${e}`;
  };

  // Individual PDF Download
  const handleDownloadSinglePDF = async (report: StudentReport) => {
    setStatus({
      step: 'generating',
      message: `Exporting PDF for ${report.studentName}...`,
      progressPercent: 50,
      currentStudent: report.studentName,
    });

    try {
      await downloadStudentPDF(report, getDateRangeText());
      setStatus({
        step: 'done',
        message: `Downloaded progress report for ${report.studentName}!`,
        progressPercent: 100,
      });
    } catch (err: any) {
      setStatus({
        step: 'error',
        message: `Failed to generate PDF: ${err.message || err}`,
        progressPercent: 0,
      });
    }
  };

  // Batch ZIP Download
  const handleDownloadAllZip = async () => {
    if (reports.length === 0) return;

    setStatus({
      step: 'generating',
      message: `Starting batch PDF compilation for ${reports.length} students...`,
      progressPercent: 10,
      totalStudents: reports.length,
      completedStudents: 0,
    });

    try {
      await downloadAllStudentsAsZip(reports, getDateRangeText(), (done, total, studentName) => {
        const pct = Math.round((done / total) * 90);
        setStatus({
          step: 'generating',
          message: `Processed ${done} of ${total} student reports (${studentName})...`,
          progressPercent: pct,
          completedStudents: done,
          totalStudents: total,
          currentStudent: studentName,
        });
      });

      setStatus({
        step: 'done',
        message: `Successfully bundled all ${reports.length} reports into ZIP archive!`,
        progressPercent: 100,
      });
    } catch (err: any) {
      setStatus({
        step: 'error',
        message: `Batch download failed: ${err.message || err}`,
        progressPercent: 0,
      });
    }
  };

  // Print All Reports
  const handlePrintAll = () => {
    if (reports.length === 0) return;
    printAllReports(reports, getDateRangeText());
  };

  // Download Sample CSV
  const handleDownloadSampleCSV = () => {
    const csvContent = generateSampleDiplomaCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_diploma_classes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered reports by search string
  const filteredReports = reports.filter((r) =>
    r.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    r.classes.some((c) => c.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  // Overall statistics
  const avgCompletionRate =
    reports.length > 0
      ? Math.round(reports.reduce((acc, r) => acc + r.stats.completionRate, 0) / reports.length)
      : 0;

  const currentPreviewReport = reports[selectedStudentIndex] || reports[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navigation Bar adhering to Universal Frontend Design Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <School className="w-4 h-4" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Student Monthly Progress Report Generator
            </span>
          </div>

          {/* Zone 2: Clean action links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('table')}
              className={`hover:text-slate-900 transition-colors ${activeTab === 'table' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''}`}
            >
              Summary Table
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`hover:text-slate-900 transition-colors ${activeTab === 'preview' ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5' : ''}`}
            >
              PDF Document View
            </button>
            <button
              onClick={handleDownloadSampleCSV}
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </nav>

          {/* Zone 3: Primary action button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStandaloneModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Get single-file index.html ready for GitHub Pages hosting"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">GitHub Pages</span>
              <span>Standalone HTML</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Data Ingestion & Filter Controls (4 cols) */}
          <aside className="lg:col-span-4 space-y-5">
            
            {/* 1. File Upload Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-slate-500" />
                  1. Ingest CSV Spreadsheet
                </h2>
                <button
                  onClick={() => setMappingModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  title="Configure CSV column matching"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Column Mapping
                </button>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-600">
                  <FileText className="w-5 h-5 text-slate-700" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Click to select or drop CSV file
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Expected export from "Diploma Classes" tab
                </div>
              </div>

              {/* File Info & Sample Button */}
              {fileName ? (
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="font-semibold text-slate-800 block truncate">{fileName}</span>
                    <span className="text-[11px] text-slate-500">{rawRows.length} rows loaded {fileSize ? `(${fileSize})` : ''}</span>
                  </div>
                  <button
                    onClick={handleLoadSampleData}
                    className="shrink-0 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-2 py-1 rounded"
                    title="Reload sample dataset"
                  >
                    Reset Sample
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLoadSampleData}
                  className="mt-3 w-full py-2 px-3 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Load Sample Diploma Classes CSV
                </button>
              )}

              {/* Column detected indicator */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Active Columns:</span>
                <span className="font-mono text-slate-700 truncate max-w-[180px]">
                  {mapping.studentName}, {mapping.className}
                </span>
              </div>
            </div>

            {/* 2. Date Range Filter Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  2. Monthly Period Filter
                </h2>
                <span className="text-[11px] text-slate-500 font-mono">
                  {totalFilteredTasks} tasks matched
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      const newRange = { ...dateRange, startDate: e.target.value };
                      setDateRange(newRange);
                      generateReports(rawRows, mapping, newRange);
                    }}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      const newRange = { ...dateRange, endDate: e.target.value };
                      setDateRange(newRange);
                      generateReports(rawRows, mapping, newRange);
                    }}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => applyDatePreset('oct2026')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  October 2026 (Sample)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('month')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('past30')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Past 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('all')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  All Available
                </button>
              </div>
            </div>

            {/* 3. Action & Processing Status Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <button
                type="button"
                onClick={() => generateReports()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Reports
              </button>

              {/* Status Message and Progress Bar */}
              <div className="mt-3.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {status.step === 'ready' || status.step === 'done' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : status.step === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    )}
                    {status.step === 'error' ? 'Error' : 'Status'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {status.progressPercent}%
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-600 leading-normal mb-2">
                  {status.message}
                </p>

                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status.step === 'error' ? 'bg-rose-500' : 'bg-slate-900'
                    }`}
                    style={{ width: `${status.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

          </aside>

          {/* Right Column: Reports Summary & Output (8 cols) */}
          <section className="lg:col-span-8 space-y-5">
            
            {/* Quantitative Snapshot Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Students Found
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {reports.length}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Filtered Tasks
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {totalFilteredTasks}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total CSV Rows
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {totalRawTasks}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Avg Completion
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                  {avgCompletionRate}%
                </div>
              </div>
            </div>

            {/* Reports Card Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              
              {/* Card Header & Bulk Actions */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Generated Progress Reports ({reports.length} Students)
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Filter: <span className="font-semibold text-slate-700">{getDateRangeText()}</span>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={handleDownloadAllZip}
                    disabled={reports.length === 0}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    title="Generate and bundle all individual student PDFs into a single ZIP file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All (ZIP)</span>
                  </button>

                  <button
                    onClick={handlePrintAll}
                    disabled={reports.length === 0}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    title="Print or Save All Reports into a single multi-page PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save All</span>
                  </button>
                </div>
              </div>

              {/* View Switcher & Search Bar */}
              <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student or class..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Segmented Tab Controls */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'table'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Table List
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Interactive Document Preview
                  </button>
                </div>
              </div>

              {/* Tab 1: Table List */}
              {activeTab === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3">Classes</th>
                        <th className="py-2.5 px-3">Tasks in Period</th>
                        <th className="py-2.5 px-3">Completion Rate</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No students match your search or date criteria. Try adjusting the date range.
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map((report, idx) => (
                          <tr
                            key={report.studentName}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {report.studentName}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {report.grade || '11/12'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-slate-700 font-medium">
                                {report.classes.length} classes
                              </span>
                              <div className="text-[10.5px] text-slate-400 truncate max-w-[160px]">
                                {report.classes.slice(0, 2).join(', ')}
                                {report.classes.length > 2 ? '...' : ''}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 tabular-nums">
                              {report.tasks.length}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums text-slate-800">
                                  {report.stats.completionRate}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      report.stats.completionRate >= 85
                                        ? 'bg-emerald-600'
                                        : report.stats.completionRate >= 60
                                        ? 'bg-blue-600'
                                        : 'bg-amber-600'
                                    }`}
                                    style={{ width: `${report.stats.completionRate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const origIndex = reports.findIndex(
                                      (r) => r.studentName === report.studentName
                                    );
                                    setSelectedStudentIndex(origIndex >= 0 ? origIndex : idx);
                                    setPreviewModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Preview
                                </button>
                                <button
                                  onClick={() => handleDownloadSinglePDF(report)}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 flex items-center gap-1 shadow-xs"
                                >
                                  <FileText className="w-3 h-3" />
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Interactive Document Preview */}
              {activeTab === 'preview' && (
                <div className="p-4 sm:p-6 bg-slate-100/70">
                  {reports.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      No reports generated yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Student Picker Segment */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-semibold text-slate-700">
                          Viewing Student ({selectedStudentIndex + 1} of {reports.length}):
                        </div>
                        <select
                          value={selectedStudentIndex}
                          onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                          className="text-xs font-semibold border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-900 focus:outline-none"
                        >
                          {reports.map((r, i) => (
                            <option key={r.studentName} value={i}>
                              {r.studentName} ({r.grade}th Grade) — {r.tasks.length} tasks
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Actual Document Component */}
                      {currentPreviewReport && (
                        <StudentReportCard
                          report={currentPreviewReport}
                          dateRangeText={getDateRangeText()}
                          onDownloadPDF={() => handleDownloadSinglePDF(currentPreviewReport)}
                          onPrint={() => printAllReports([currentPreviewReport], getDateRangeText())}
                          isCompact={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Student Monthly Progress Report Generator &middot; Client-Side Browser Engine
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setStandaloneModalOpen(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Export Standalone index.html
            </button>
            <span className="text-slate-300">&middot;</span>
            <button
              onClick={() => setMappingModalOpen(true)}
              className="text-slate-600 hover:text-slate-900"
            >
              Column Mapper
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        reports={reports}
        currentIndex={selectedStudentIndex}
        onSelectIndex={(newIdx) => setSelectedStudentIndex(newIdx)}
        dateRangeText={getDateRangeText()}
        onDownloadSinglePDF={handleDownloadSinglePDF}
        onPrintSingle={(r) => printAllReports([r], getDateRangeText())}
      />

      <ColumnMappingModal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        mapping={mapping}
        onSaveMapping={(newMap) => {
          setMapping(newMap);
          generateReports(rawRows, newMap, dateRange);
        }}
        availableHeaders={availableHeaders}
      />

      <StandaloneExportModal
        isOpen={standaloneModalOpen}
        onClose={() => setStandaloneModalOpen(false)}
      />

    </div>
  );
}
