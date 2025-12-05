import { type Break, type WorkSession } from "@prisma/client";

// Re-export Prisma types
export type IBreak = Break;
export type IWorkSession = WorkSession;

export interface IWorkSessionWithRelations extends WorkSession {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  breaks?: Break[];
}

export interface ITimeConflict {
  conflictingSessionId: string;
  date: Date;
  clockIn: Date;
  clockOut: Date | null;
}

export interface ITimeSummary {
  date: string;
  totalMinutes: number;
  totalHours: number;
  sessions: number;
}

export interface IDailySummary {
  date: string;
  totalMinutes: number;
  totalHours: number;
  sessions: IWorkSessionWithRelations[];
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
