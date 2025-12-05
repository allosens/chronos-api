import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

import {
  type ITimeConflict,
  type IWorkSessionWithRelations,
} from "../interfaces";
import {
  ClockInDto,
  ClockOutDto,
  EndBreakDto,
  FilterWorkSessionsDto,
  StartBreakDto,
  UpdateWorkSessionDto,
  ValidateWorkSessionDto,
  type ValidationResultDto,
  type WorkSessionsListResponseDto,
} from "../models";
import { TimeTrackingService } from "../services/time-tracking.service";

@Controller("v1/work-sessions")
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  private readonly logger = new Logger(TimeTrackingController.name);

  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post("clock-in")
  @HttpCode(HttpStatus.CREATED)
  async clockIn(
    @CurrentUser() user: IAuthUser,
    @Body() dto: ClockInDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Clock in request for user ${user.id}`);
    return this.timeTrackingService.clockIn(user, dto);
  }

  @Patch(":id/clock-out")
  async clockOut(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ClockOutDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Clock out request for session ${id}`);
    return this.timeTrackingService.clockOut(user, id, dto);
  }

  @Post(":id/breaks/start")
  @HttpCode(HttpStatus.OK)
  async startBreak(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StartBreakDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Start break request for session ${id}`);
    return this.timeTrackingService.startBreak(user, id, dto);
  }

  @Patch(":id/breaks/end")
  async endBreak(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EndBreakDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`End break request for session ${id}`);
    return this.timeTrackingService.endBreak(user, id, dto);
  }

  @Get()
  async getWorkSessions(
    @CurrentUser() user: IAuthUser,
    @Query() filters: FilterWorkSessionsDto,
  ): Promise<WorkSessionsListResponseDto> {
    this.logger.log(`Get work sessions for company ${user.companyId}`);
    return this.timeTrackingService.getWorkSessions(user, filters);
  }

  @Get("active")
  async getActiveSession(
    @CurrentUser() user: IAuthUser,
  ): Promise<IWorkSessionWithRelations | null> {
    this.logger.log(`Get active session for user ${user.id}`);
    return this.timeTrackingService.getActiveSession(user);
  }

  @Get(":id")
  async getWorkSessionById(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Get work session ${id}`);
    return this.timeTrackingService.getWorkSessionById(user, id);
  }

  @Put(":id")
  async updateWorkSession(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkSessionDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Update work session ${id}`);
    return this.timeTrackingService.updateWorkSession(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkSession(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log(`Delete work session ${id}`);
    return this.timeTrackingService.deleteWorkSession(user, id);
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateWorkSession(
    @CurrentUser() user: IAuthUser,
    @Body() dto: ValidateWorkSessionDto,
  ): Promise<ValidationResultDto> {
    this.logger.log(`Validate work session for user ${user.id}`);
    return this.timeTrackingService.validateWorkSession(user, dto);
  }

  @Get("conflicts/check")
  async getConflicts(
    @CurrentUser() user: IAuthUser,
    @Query("clockIn") clockIn: string,
    @Query("excludeId") excludeId?: string,
  ): Promise<ITimeConflict[]> {
    this.logger.log(`Check conflicts for user ${user.id}`);
    return this.timeTrackingService.getConflicts(
      user,
      new Date(clockIn),
      excludeId,
    );
  }
}
