import {
  Controller,
  Get,
  Logger,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "@/contexts/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "@/contexts/auth/guards/jwt-auth.guard";
import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import {
  type IDailySummary,
  type IMonthlySummary,
  type IWeeklySummary,
} from "../interfaces";
import { TimeReportQueryDto } from "../models";
import { TimeTrackingService } from "../services/time-tracking.service";

@Controller("v1/time-reports")
@UseGuards(JwtAuthGuard)
export class TimeReportsController {
  private readonly logger = new Logger(TimeReportsController.name);

  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get("daily")
  async getDailySummary(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<IDailySummary> {
    const date = query.date ? new Date(query.date) : new Date();
    this.logger.log(`Getting daily report for ${date.toISOString()}`);
    return this.timeTrackingService.getDailySummary(user, date);
  }

  @Get("weekly")
  async getWeeklySummary(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<IWeeklySummary> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const week = query.week ?? this.getCurrentWeek();
    this.logger.log(`Getting weekly report for week ${week} of ${year}`);
    return this.timeTrackingService.getWeeklySummary(user, year, week);
  }

  @Get("monthly")
  async getMonthlySummary(
    @CurrentUser() user: IAuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<IMonthlySummary> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    this.logger.log(`Getting monthly report for ${month}/${year}`);
    return this.timeTrackingService.getMonthlySummary(user, year, month);
  }

  private getCurrentWeek(): number {
    // Delegate to the service to ensure ISO 8601 and UTC consistency
    return this.timeTrackingService.getWeekNumber(new Date());
  }
}
