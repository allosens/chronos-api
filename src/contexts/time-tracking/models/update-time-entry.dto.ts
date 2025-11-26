import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateTimeEntryDto {
  @IsUUID()
  @IsOptional()
  projectId?: string | null;

  @IsUUID()
  @IsOptional()
  taskId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string | null;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string | null;
}
