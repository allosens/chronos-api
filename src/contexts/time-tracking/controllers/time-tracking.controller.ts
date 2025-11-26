import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "@/contexts/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "@/contexts/auth/guards/jwt-auth.guard";
import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import { type ITimeEntryWithRelations } from "../interfaces";
import {
  CreateTimeEntryDto,
  type DailySummaryResponseDto,
  FilterTimeEntriesDto,
  type MonthlySummaryResponseDto,
  type TimeEntriesListResponseDto,
  TimeReportQueryDto,
  UpdateTimeEntryDto,
  ValidateTimeEntryDto,
  type ValidationResultDto,
  type WeeklySummaryResponseDto,
} from "../models";
import { TimeTrackingService } from "../services/time-tracking.service";

@Controller("v1/time-entries")
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(
    @Inject(Logger) private readonly logger: Logger,
    private readonly timeTrackingService: TimeTrackingService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateTimeEntryDto,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Creating time entry for user: ${user.id}`);
    return this.timeTrackingService.createTimeEntry(user, dto);
  }

  @Get()
  async getTimeEntries(
    @CurrentUser() user: IAuthUser,
    @Query() filters: FilterTimeEntriesDto,
  ): Promise<TimeEntriesListResponseDto> {
    this.logger.log(`Fetching time entries for company: ${user.companyId}`);
    return this.timeTrackingService.getTimeEntries(user, filters);
  }

  @Get(":id")
  async getTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Fetching time entry: ${id}`);
    return this.timeTrackingService.getTimeEntryById(user, id);
  }

  @Put(":id")
  async updateTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Updating time entry: ${id}`);
    return this.timeTrackingService.updateTimeEntry(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log(`Deleting time entry: ${id}`);
    await this.timeTrackingService.deleteTimeEntry(user, id);
  }

  @Patch(":id/stop")
  async stopTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Stopping time entry: ${id}`);
    return this.timeTrackingService.stopTimeEntry(user, id);
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateTimeEntry(
    @CurrentUser() user: IAuthUser,
    @Body() dto: ValidateTimeEntryDto,
  ): Promise<ValidationResultDto> {
    this.logger.log(`Validating time entry for user: ${user.id}`);
    return this.timeTrackingService.validateTimeEntry(user, dto);
  }

  @Get("conflicts/check")
  async getConflicts(
    @CurrentUser() user: IAuthUser,
    @Query("startTime") startTime: string,
    @Query("endTime") endTime?: string,
    @Query("excludeId") excludeId?: string,
  ): Promise<{ conflicts: unknown[] }> {
    this.logger.log(`Checking conflicts for user: ${user.id}`);
    const conflicts = await this.timeTrackingService.getConflicts(
      user,
      new Date(startTime),
      endTime ? new Date(endTime) : undefined,
      excludeId,
    );
    return { conflicts };
  }
}

@Controller("v1/time-reports")
@UseGuards(JwtAuthGuard)
export class TimeReportsController {
  constructor(
    @Inject(Logger) private readonly logger: Logger,
    private readonly timeTrackingService: TimeTrackingService,
  ) {}

  @Get("daily")
  async getDailyReport(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<DailySummaryResponseDto> {
    const date = query.date ? new Date(query.date) : new Date();
    this.logger.log(`Getting daily report for ${date.toISOString()}`);
    return this.timeTrackingService.getDailySummary(user, date);
  }

  @Get("weekly")
  async getWeeklyReport(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<WeeklySummaryResponseDto> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const week = query.week ?? this.getCurrentWeek();
    this.logger.log(`Getting weekly report for week ${week} of ${year}`);
    return this.timeTrackingService.getWeeklySummary(user, year, week);
  }

  @Get("monthly")
  async getMonthlyReport(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<MonthlySummaryResponseDto> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    this.logger.log(`Getting monthly report for ${month}/${year}`);
    return this.timeTrackingService.getMonthlySummary(user, year, month);
  }

  private getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil(diff / msPerWeek);
  }
}
