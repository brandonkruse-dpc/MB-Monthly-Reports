export interface TaskItem {
  id: string;
  className: string;
  taskName: string;
  category: string;
  dueDate: string;
  parsedDate: Date | null;
  dropboxStatus: string;
  notes: string;
  rawRow: Record<string, any>;
}

export interface StudentReport {
  studentName: string;
  grade: string;
  classes: string[];
  tasks: TaskItem[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    pendingTasks: number;
    lateTasks: number;
  };
}

export interface ColumnMapping {
  studentName: string;
  grade: string;
  className: string;
  taskName: string;
  category: string;
  notes: string;
  dueDate: string;
  dropboxStatus: string;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ProcessStatus {
  step: 'idle' | 'parsing' | 'filtering' | 'ready' | 'generating' | 'done' | 'error';
  message: string;
  progressPercent: number;
  currentStudent?: string;
  totalStudents?: number;
  completedStudents?: number;
  error?: string;
}
