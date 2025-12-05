import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class FilterWorkSessionsDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(["CLOCKED_OUT", "WORKING", "ON_BREAK"])
  @IsOptional()
  status?: "CLOCKED_OUT" | "WORKING" | "ON_BREAK";

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(String(value), 10) : 20))
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(String(value), 10) : 0))
  offset?: number = 0;
}
