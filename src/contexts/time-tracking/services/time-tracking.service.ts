/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/no-negated-condition */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, WorkStatus } from "@prisma/client";

import { PrismaService } from "@/shared/database/prisma.service";

import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import {
  type IDailySummary,
  type IMonthlySummary,
  type ITimeConflict,
  type IWeeklySummary,
  type IWorkSessionWithRelations,
} from "../interfaces";
import {
  type ClockInDto,
  type ClockOutDto,
  type EndBreakDto,
  type FilterWorkSessionsDto,
  type StartBreakDto,
  type UpdateWorkSessionDto,
  type ValidateWorkSessionDto,
  type ValidationResultDto,
  type WorkSessionsListResponseDto,
} from "../models";

/** Milliseconds in a day */
const MS_PER_DAY = 86_400_000;

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async clockIn(
    user: IAuthUser,
    dto: ClockInDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Clocking in user ${user.id}`);

    const clockIn = new Date(dto.clockIn);
    // Extract the date in UTC to avoid timezone issues
    // The date field should represent the calendar date when the user clocked in
    const date = new Date(
      Date.UTC(
        clockIn.getUTCFullYear(),
        clockIn.getUTCMonth(),
        clockIn.getUTCDate(),
      ),
    );

    // Check if user already has an active session
    const activeSession = await this.prisma.workSession.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
        status: { in: [WorkStatus.WORKING, WorkStatus.ON_BREAK] },
      },
    });

    if (activeSession) {
      throw new BadRequestException(
        "You already have an active work session. Please clock out first.",
      );
    }

    // Check for conflicting sessions on the same day
    const conflicts = await this.findConflicts(
      user.id,
      user.companyId,
      clockIn,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        "A work session already exists for this date",
      );
    }

    const workSession = await this.prisma.workSession.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        date,
        clockIn,
        status: WorkStatus.WORKING,
        notes: dto.notes ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    this.logger.log(`Work session created: ${workSession.id}`);
    return workSession;
  }

  async clockOut(
    user: IAuthUser,
    id: string,
    dto: ClockOutDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Clocking out work session ${id}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        breaks: true,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException(
        "You can only clock out your own work sessions",
      );
    }

    if (workSession.status === WorkStatus.CLOCKED_OUT) {
      throw new BadRequestException("Work session is already clocked out");
    }

    // End any active breaks
    if (workSession.status === WorkStatus.ON_BREAK) {
      const activeBreak = workSession.breaks.find(b => !b.endTime);
      if (activeBreak) {
        const breakEndTime = new Date(dto.clockOut);
        const breakDuration = Math.round(
          (breakEndTime.getTime() - activeBreak.startTime.getTime()) / 60_000,
        );
        await this.prisma.break.update({
          where: { id: activeBreak.id },
          data: {
            endTime: breakEndTime,
            durationMinutes: breakDuration,
          },
        });
      }
    }

    const clockOut = new Date(dto.clockOut);

    // Validate clock out time is after clock in
    if (clockOut <= workSession.clockIn) {
      throw new BadRequestException(
        "Clock out time must be after clock in time",
      );
    }

    // Calculate total hours (excluding breaks)
    const totalBreakMinutes = workSession.breaks.reduce(
      (sum, b) => sum + (b.durationMinutes ?? 0),
      0,
    );
    const totalMinutes =
      Math.round(
        (clockOut.getTime() - workSession.clockIn.getTime()) / 60_000,
      ) - totalBreakMinutes;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    const updated = await this.prisma.workSession.update({
      where: { id },
      data: {
        clockOut,
        status: WorkStatus.CLOCKED_OUT,
        totalHours,
        notes: dto.notes ?? undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    this.logger.log(`Work session clocked out: ${id}`);
    return updated;
  }

  async startBreak(
    user: IAuthUser,
    sessionId: string,
    dto: StartBreakDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Starting break for session ${sessionId}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id: sessionId,
        companyId: user.companyId,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException("You can only manage your own breaks");
    }

    if (workSession.status !== WorkStatus.WORKING) {
      throw new BadRequestException(
        "Can only start a break when actively working",
      );
    }

    const startTime = new Date(dto.startTime);

    // Create the break
    await this.prisma.break.create({
      data: {
        workSessionId: sessionId,
        startTime,
      },
    });

    // Update session status
    const updated = await this.prisma.workSession.update({
      where: { id: sessionId },
      data: { status: WorkStatus.ON_BREAK },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    this.logger.log(`Break started for session ${sessionId}`);
    return updated;
  }

  async endBreak(
    user: IAuthUser,
    sessionId: string,
    dto: EndBreakDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Ending break for session ${sessionId}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id: sessionId,
        companyId: user.companyId,
      },
      include: {
        breaks: true,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException("You can only manage your own breaks");
    }

    if (workSession.status !== WorkStatus.ON_BREAK) {
      throw new BadRequestException("Not currently on a break");
    }

    // Find the active break
    const activeBreak = workSession.breaks.find(b => !b.endTime);
    if (!activeBreak) {
      throw new BadRequestException("No active break found");
    }

    const endTime = new Date(dto.endTime);
    const durationMinutes = Math.round(
      (endTime.getTime() - activeBreak.startTime.getTime()) / 60_000,
    );

    // Update the break
    await this.prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime,
        durationMinutes,
      },
    });

    // Update session status
    const updated = await this.prisma.workSession.update({
      where: { id: sessionId },
      data: { status: WorkStatus.WORKING },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    this.logger.log(`Break ended for session ${sessionId}`);
    return updated;
  }

  async getWorkSessions(
    user: IAuthUser,
    filters: FilterWorkSessionsDto,
  ): Promise<WorkSessionsListResponseDto> {
    this.logger.log(`Fetching work sessions for company ${user.companyId}`);

    // Build where clause
    const where: Prisma.WorkSessionWhereInput = {
      companyId: user.companyId,
    };

    // Users can only see their own sessions unless they are admin/manager
    if (user.role === "EMPLOYEE") {
      where.userId = user.id;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date = {
          ...where.date,
          gte: new Date(filters.startDate),
        };
      }
      if (filters.endDate) {
        where.date = {
          ...where.date,
          lte: new Date(filters.endDate),
        };
      }
    }

    const [sessions, total] = await Promise.all([
      this.prisma.workSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          breaks: true,
        },
        orderBy: {
          date: "desc",
        },
        skip: filters.offset,
        take: filters.limit,
      }),
      this.prisma.workSession.count({ where }),
    ]);

    return {
      sessions,
      total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    };
  }

  async getWorkSessionById(
    user: IAuthUser,
    id: string,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Fetching work session ${id}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException("You can only view your own work sessions");
    }

    return workSession;
  }

  async updateWorkSession(
    user: IAuthUser,
    id: string,
    dto: UpdateWorkSessionDto,
  ): Promise<IWorkSessionWithRelations> {
    this.logger.log(`Updating work session ${id}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization - only admins can update sessions
    if (user.role === "EMPLOYEE") {
      throw new ForbiddenException(
        "Only administrators can update work sessions",
      );
    }

    const clockIn = dto.clockIn ? new Date(dto.clockIn) : workSession.clockIn;

    let clockOut: Date | null;
    if (dto.clockOut === undefined) {
      clockOut = workSession.clockOut;
    } else if (dto.clockOut === null) {
      clockOut = null;
    } else {
      clockOut = new Date(dto.clockOut);
    }

    // Validate time range
    if (clockOut && clockOut <= clockIn) {
      throw new BadRequestException(
        "Clock out time must be after clock in time",
      );
    }

    const updated = await this.prisma.workSession.update({
      where: { id },
      data: {
        clockIn: dto.clockIn ? clockIn : undefined,
        clockOut: dto.clockOut !== undefined ? clockOut : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    this.logger.log(`Work session updated: ${id}`);
    return updated;
  }

  async deleteWorkSession(user: IAuthUser, id: string): Promise<void> {
    this.logger.log(`Deleting work session ${id}`);

    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Check authorization - only admins can delete sessions
    if (user.role === "EMPLOYEE") {
      throw new ForbiddenException(
        "Only administrators can delete work sessions",
      );
    }

    // Hard delete (with cascade to breaks)
    await this.prisma.workSession.delete({
      where: { id },
    });

    this.logger.log(`Work session deleted: ${id}`);
  }

  async validateWorkSession(
    user: IAuthUser,
    dto: ValidateWorkSessionDto,
  ): Promise<ValidationResultDto> {
    this.logger.log(`Validating work session for user ${user.id}`);

    const warnings: string[] = [];
    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : undefined;

    // Check time range
    if (clockOut && clockOut <= clockIn) {
      return {
        isValid: false,
        conflicts: [],
        warnings: ["Clock out time must be after clock in time"],
      };
    }

    // Check for conflicts
    const conflicts = await this.findConflicts(
      user.id,
      user.companyId,
      clockIn,
      dto.workSessionId,
    );

    // Add warnings
    if (clockOut) {
      const duration = (clockOut.getTime() - clockIn.getTime()) / 60_000;
      if (duration > 12 * 60) {
        warnings.push("Work session exceeds 12 hours");
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
    };
  }

  async getConflicts(
    user: IAuthUser,
    clockIn: Date,
    excludeId?: string,
  ): Promise<ITimeConflict[]> {
    return this.findConflicts(user.id, user.companyId, clockIn, excludeId);
  }

  async getDailySummary(user: IAuthUser, date: Date): Promise<IDailySummary> {
    this.logger.log(`Getting daily summary for ${date.toISOString()}`);

    // Use UTC-based date boundaries to avoid timezone issues
    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    const endOfDay = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const where: Prisma.WorkSessionWhereInput = {
      companyId: user.companyId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    // Employees can only see their own sessions
    if (user.role === "EMPLOYEE") {
      where.userId = user.id;
    }

    const sessions = await this.prisma.workSession.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
      orderBy: {
        clockIn: "asc",
      },
    });

    let totalMinutes = 0;
    for (const session of sessions) {
      if (session.totalHours) {
        totalMinutes += session.totalHours.toNumber() * 60;
      }
    }

    return {
      date: startOfDay.toISOString().split("T")[0],
      totalMinutes: Math.round(totalMinutes),
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      sessions,
    };
  }

  async getWeeklySummary(
    user: IAuthUser,
    year: number,
    week: number,
  ): Promise<IWeeklySummary> {
    this.logger.log(`Getting weekly summary for week ${week} of ${year}`);

    const { startOfWeek, endOfWeek } = this.getWeekBounds(year, week);

    const dailySummaries: IDailySummary[] = [];
    let totalMinutes = 0;

    const current = new Date(startOfWeek);
    while (current <= endOfWeek) {
      const dailySummary = await this.getDailySummary(user, current);
      dailySummaries.push(dailySummary);
      totalMinutes += dailySummary.totalMinutes;
      current.setDate(current.getDate() + 1);
    }

    return {
      weekStart: startOfWeek.toISOString().split("T")[0],
      weekEnd: endOfWeek.toISOString().split("T")[0],
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      dailySummaries,
    };
  }

  async getMonthlySummary(
    user: IAuthUser,
    year: number,
    month: number,
  ): Promise<IMonthlySummary> {
    this.logger.log(`Getting monthly summary for ${month}/${year}`);

    const weeklySummaries: IWeeklySummary[] = [];
    let totalMinutes = 0;

    // Get all weeks in the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let currentWeek = this.getWeekNumber(firstDay);
    const lastWeek = this.getWeekNumber(lastDay);

    while (currentWeek <= lastWeek) {
      const weeklySummary = await this.getWeeklySummary(
        user,
        year,
        currentWeek,
      );
      weeklySummaries.push(weeklySummary);
      totalMinutes += weeklySummary.totalMinutes;
      currentWeek++;
    }

    return {
      month,
      year,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      weeklySummaries,
    };
  }

  async getActiveSession(
    user: IAuthUser,
  ): Promise<IWorkSessionWithRelations | null> {
    const session = await this.prisma.workSession.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
        status: { in: [WorkStatus.WORKING, WorkStatus.ON_BREAK] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        breaks: true,
      },
    });

    return session;
  }

  private async findConflicts(
    userId: string,
    companyId: string,
    clockIn: Date,
    excludeId?: string,
  ): Promise<ITimeConflict[]> {
    // Find sessions on the same date using UTC to avoid timezone issues
    const date = new Date(
      Date.UTC(
        clockIn.getUTCFullYear(),
        clockIn.getUTCMonth(),
        clockIn.getUTCDate(),
      ),
    );

    const where: Prisma.WorkSessionWhereInput = {
      userId,
      companyId,
      date,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingSessions = await this.prisma.workSession.findMany({
      where,
      select: {
        id: true,
        date: true,
        clockIn: true,
        clockOut: true,
      },
    });

    return existingSessions.map(session => ({
      conflictingSessionId: session.id,
      date: session.date,
      clockIn: session.clockIn,
      clockOut: session.clockOut,
    }));
  }

  private getWeekBounds(
    year: number,
    week: number,
  ): { startOfWeek: Date; endOfWeek: Date } {
    // Use UTC to avoid timezone issues
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const days = (week - 1) * 7;
    const dayOfWeek = jan1.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const startOfWeek = new Date(Date.UTC(year, 0, 1 + diff + days));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7,
    );
  }
}
