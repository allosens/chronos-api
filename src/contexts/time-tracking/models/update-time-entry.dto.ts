import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateWorkSessionDto {
  @IsDateString()
  @IsOptional()
  clockIn?: string;

  @IsDateString()
  @IsOptional()
  clockOut?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string | null;
}
