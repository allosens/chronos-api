import {
  type IDailySummary,
  type IMonthlySummary,
  type ITimeConflict,
  type ITimeEntryWithRelations,
  type IWeeklySummary,
} from "../interfaces";

export class TimeEntryResponseDto implements ITimeEntryWithRelations {
  id!: string;
  userId!: string;
  companyId!: string;
  projectId!: string | null;
  taskId!: string | null;
  description!: string | null;
  startTime!: Date;
  endTime!: Date | null;
  durationMinutes!: number | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
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

export class TimeEntriesListResponseDto {
  entries!: TimeEntryResponseDto[];
  total!: number;
  limit!: number;
  offset!: number;
}

export class ValidationResultDto {
  isValid!: boolean;
  conflicts!: ITimeConflict[];
  warnings!: string[];
}

export class DailySummaryResponseDto implements IDailySummary {
  date!: string;
  totalMinutes!: number;
  totalHours!: number;
  entries!: ITimeEntryWithRelations[];
}

export class WeeklySummaryResponseDto implements IWeeklySummary {
  weekStart!: string;
  weekEnd!: string;
  totalMinutes!: number;
  totalHours!: number;
  dailySummaries!: IDailySummary[];
}

export class MonthlySummaryResponseDto implements IMonthlySummary {
  month!: number;
  year!: number;
  totalMinutes!: number;
  totalHours!: number;
  weeklySummaries!: IWeeklySummary[];
}
