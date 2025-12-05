import { Transform } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Min } from "class-validator";

export class TimeReportQueryDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) =>
    value ? Number.parseInt(String(value), 10) : undefined,
  )
  year?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) =>
    value ? Number.parseInt(String(value), 10) : undefined,
  )
  month?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) =>
    value ? Number.parseInt(String(value), 10) : undefined,
  )
  week?: number;
}
