import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ClockInDto {
  @IsDateString()
  @IsNotEmpty()
  clockIn!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class ClockOutDto {
  @IsDateString()
  @IsNotEmpty()
  clockOut!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class StartBreakDto {
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;
}

export class EndBreakDto {
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;
}
