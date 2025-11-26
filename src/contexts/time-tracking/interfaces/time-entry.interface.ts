export interface ITimeEntry {
  id: string;
  userId: string;
  companyId: string;
  projectId: string | null;
  taskId: string | null;
  description: string | null;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ITimeEntryWithRelations extends ITimeEntry {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  task?: {
    id: string;
    name: string;
  } | null;
}

export interface ITimeConflict {
  conflictingEntryId: string;
  startTime: Date;
  endTime: Date | null;
  description: string | null;
}

export interface ITimeSummary {
  date: string;
  totalMinutes: number;
  totalHours: number;
  entries: number;
}

export interface IDailySummary {
  date: string;
  totalMinutes: number;
  totalHours: number;
  entries: ITimeEntryWithRelations[];
}

export interface IWeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  totalHours: number;
  dailySummaries: IDailySummary[];
}

export interface IMonthlySummary {
  month: number;
  year: number;
  totalMinutes: number;
  totalHours: number;
  weeklySummaries: IWeeklySummary[];
}
