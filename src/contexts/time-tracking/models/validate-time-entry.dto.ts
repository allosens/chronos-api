import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class ValidateTimeEntryDto {
  @IsUUID()
  @IsOptional()
  timeEntryId?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
