import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { RequestStatus } from "@prisma/client";
import { Type } from "class-transformer";

export class CreateTimeCorrectionRequestDto {
  @IsUUID()
  @IsNotEmpty()
  workSessionId!: string;

  @IsDateString()
  @IsOptional()
  requestedClockIn?: string;

  @IsDateString()
  @IsOptional()
  requestedClockOut?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

export class UpdateTimeCorrectionRequestDto {
  @IsDateString()
  @IsOptional()
  requestedClockIn?: string;

  @IsDateString()
  @IsOptional()
  requestedClockOut?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}

export class ApproveTimeCorrectionRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reviewNotes?: string;
}

export class RejectTimeCorrectionRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reviewNotes!: string;
}

export class FilterTimeCorrectionRequestsDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  workSessionId?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export interface TimeCorrectionRequestResponseDto {
  id: string;
  userId: string;
  companyId: string;
  workSessionId: string;
  originalClockIn: Date | null;
  originalClockOut: Date | null;
  requestedClockIn: Date | null;
  requestedClockOut: Date | null;
  reason: string;
  status: RequestStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  workSession?: {
    id: string;
    date: Date;
    clockIn: Date;
    clockOut: Date | null;
    status: string;
  };
}

export interface TimeCorrectionRequestsListResponseDto {
  requests: TimeCorrectionRequestResponseDto[];
  total: number;
  limit: number;
  offset: number;
}
