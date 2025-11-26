import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class ValidateWorkSessionDto {
  @IsUUID()
  @IsOptional()
  workSessionId?: string;

  @IsDateString()
  @IsNotEmpty()
  clockIn!: string;

  @IsDateString()
  @IsOptional()
  clockOut?: string;
}
