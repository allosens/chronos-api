import { type Break, type WorkSession } from "@prisma/client";

import {
  type IDailySummary,
  type IMonthlySummary,
  type ITimeConflict,
  type IWeeklySummary,
  type IWorkSessionWithRelations,
} from "../interfaces";

export class WorkSessionResponseDto implements IWorkSessionWithRelations {
  id!: string;
  userId!: string;
  companyId!: string;
  date!: Date;
  clockIn!: Date;
  clockOut!: Date | null;
  status!: WorkSession["status"];
  totalHours!: WorkSession["totalHours"];
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  breaks?: Break[];
}

export class WorkSessionsListResponseDto {
  sessions!: WorkSessionResponseDto[];
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
  sessions!: IWorkSessionWithRelations[];
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
