import React from 'react';
import { ColumnMapping } from '../types';
import { DEFAULT_COLUMN_MAPPING } from '../utils/csvParser';
import { X, Check, RotateCcw } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ColumnMapping;
  onSaveMapping: (newMapping: ColumnMapping) => void;
  availableHeaders: string[];
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  mapping,
  onSaveMapping,
  availableHeaders,
}) => {
  const [current, setCurrent] = React.useState<ColumnMapping>(mapping);

  React.useEffect(() => {
    setCurrent(mapping);
  }, [mapping, isOpen]);

  if (!isOpen) return null;

  const fields: Array<{
    key: keyof ColumnMapping;
    label: string;
    description: string;
    example: string;
  }> = [
    {
      key: 'studentName',
      label: 'Student Name',
      description: 'Full name of the student',
      example: 'Alex Mercer',
    },
    {
      key: 'grade',
      label: 'Grade Level',
      description: 'Grade level or academic year',
      example: '11 or 12',
    },
    {
      key: 'className',
      label: 'Class Name',
      description: 'Course or subject name (e.g. class.name)',
      example: 'IB English A: Literature HL',
    },
    {
      key: 'taskName',
      label: 'Task / Assignment Name',
      description: 'Name of the task or assignment (e.g. name)',
      example: 'Comparative Essay: Postcolonial Perspectives',
    },
    {
      key: 'category',
      label: 'Assessment Type / Category',
      description: 'Category name (e.g. category.name)',
      example: 'Summative Assessment, Unit Exam',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      description: 'Date used for monthly range filtering',
      example: '2026-10-15 or 10/15/2026',
    },
    {
      key: 'dropboxStatus',
      label: 'Dropbox / Submission Status',
      description: 'Submission or grading status',
      example: 'Completed & Graded, Submitted On Time, Late',
    },
    {
      key: 'notes',
      label: 'Teacher Comments / Notes',
      description: 'Specific teacher feedback on the task',
      example: 'Strong analytical thesis; clear citations.',
    },
  ];

  const handleReset = () => {
    setCurrent({ ...DEFAULT_COLUMN_MAPPING });
  };

  const handleSave = () => {
    onSaveMapping(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">CSV Column Header Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Match the generator fields to the exact column names from your "Diploma Classes" spreadsheet export.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pb-3 border-b border-slate-100 last:border-b-0">
              <div className="sm:col-span-5">
                <label className="text-xs font-bold text-slate-800 block">
                  {f.label}
                </label>
                <div className="text-[11px] text-slate-500">{f.description}</div>
                <div className="text-[10px] text-slate-400 font-mono">e.g. {f.example}</div>
              </div>
              <div className="sm:col-span-7">
                {availableHeaders.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={current[f.key]}
                      onChange={(e) => setCurrent({ ...current, [f.key]: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- Select detected CSV column --</option>
                      {availableHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                      {!availableHeaders.includes(current[f.key]) && current[f.key] && (
                        <option value={current[f.key]}>{current[f.key]} (Custom)</option>
                      )}
                    </select>
                    <input
                      type="text"
                      placeholder="Or type custom header name..."
                      value={current[f.key]}
                      onChange={(e) => setCurrent({ ...current, [f.key]: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-mono bg-slate-50"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={current[f.key]}
                    onChange={(e) => setCurrent({ ...current, [f.key]: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={handleReset}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard Headers
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
