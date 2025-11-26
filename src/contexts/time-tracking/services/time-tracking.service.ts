/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/no-negated-condition */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/database/prisma.service";

import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import {
  type IDailySummary,
  type IMonthlySummary,
  type ITimeConflict,
  type ITimeEntryWithRelations,
  type IWeeklySummary,
} from "../interfaces";
import {
  type CreateTimeEntryDto,
  type FilterTimeEntriesDto,
  type TimeEntriesListResponseDto,
  type UpdateTimeEntryDto,
  type ValidateTimeEntryDto,
  type ValidationResultDto,
} from "../models";

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTimeEntry(
    user: IAuthUser,
    dto: CreateTimeEntryDto,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Creating time entry for user ${user.id}`);

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;

    // Validate time range
    if (endTime && endTime <= startTime) {
      throw new BadRequestException("End time must be after start time");
    }

    // Check for overlapping entries
    const conflicts = await this.findConflicts(
      user.id,
      user.companyId,
      startTime,
      endTime,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        "Time entry overlaps with existing entries",
      );
    }

    // Validate project belongs to company if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.projectId,
          companyId: user.companyId,
          isActive: true,
          deletedAt: null,
        },
      });
      if (!project) {
        throw new BadRequestException(
          "Project not found or does not belong to your company",
        );
      }
    }

    // Validate task belongs to project if provided
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: {
          id: dto.taskId,
          projectId: dto.projectId ?? undefined,
          isActive: true,
        },
      });
      if (!task) {
        throw new BadRequestException(
          "Task not found or does not belong to the specified project",
        );
      }
    }

    // Calculate duration if end time is provided
    const durationMinutes = endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 60_000)
      : undefined;

    // Determine if entry is active (no end time means it's running)
    const isActive = !endTime;

    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        projectId: dto.projectId ?? null,
        taskId: dto.taskId ?? null,
        description: dto.description ?? null,
        startTime,
        endTime: endTime ?? null,
        durationMinutes: durationMinutes ?? null,
        isActive,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Time entry created: ${timeEntry.id}`);
    return timeEntry;
  }

  async getTimeEntries(
    user: IAuthUser,
    filters: FilterTimeEntriesDto,
  ): Promise<TimeEntriesListResponseDto> {
    this.logger.log(`Fetching time entries for company ${user.companyId}`);

    // Build where clause
    const where: Prisma.TimeEntryWhereInput = {
      companyId: user.companyId,
      deletedAt: null,
    };

    // Users can only see their own entries unless they are admin/manager
    if (user.role === "EMPLOYEE") {
      where.userId = user.id;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime = {
          ...where.startTime,
          gte: new Date(filters.startDate),
        };
      }
      if (filters.endDate) {
        where.startTime = {
          ...where.startTime,
          lte: new Date(filters.endDate),
        };
      }
    }

    const [entries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
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
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
        skip: filters.offset,
        take: filters.limit,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      entries,
      total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    };
  }

  async getTimeEntryById(
    user: IAuthUser,
    id: string,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Fetching time entry ${id}`);

    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!timeEntry) {
      throw new NotFoundException("Time entry not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && timeEntry.userId !== user.id) {
      throw new ForbiddenException("You can only view your own time entries");
    }

    return timeEntry;
  }

  async updateTimeEntry(
    user: IAuthUser,
    id: string,
    dto: UpdateTimeEntryDto,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Updating time entry ${id}`);

    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException("Time entry not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && timeEntry.userId !== user.id) {
      throw new ForbiddenException("You can only update your own time entries");
    }

    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : timeEntry.startTime;

    let endTime: Date | null;
    if (dto.endTime === undefined) {
      endTime = timeEntry.endTime;
    } else if (dto.endTime === null) {
      endTime = null;
    } else {
      endTime = new Date(dto.endTime);
    }

    // Validate time range
    if (endTime && endTime <= startTime) {
      throw new BadRequestException("End time must be after start time");
    }

    // Check for overlapping entries (excluding current entry)
    const conflicts = await this.findConflicts(
      timeEntry.userId,
      user.companyId,
      startTime,
      endTime ?? undefined,
      id,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        "Time entry overlaps with existing entries",
      );
    }

    // Validate project if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.projectId,
          companyId: user.companyId,
          isActive: true,
          deletedAt: null,
        },
      });
      if (!project) {
        throw new BadRequestException(
          "Project not found or does not belong to your company",
        );
      }
    }

    // Validate task if provided
    const taskProjectId =
      dto.projectId !== undefined ? dto.projectId : timeEntry.projectId;
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: {
          id: dto.taskId,
          projectId: taskProjectId ?? undefined,
          isActive: true,
        },
      });
      if (!task) {
        throw new BadRequestException(
          "Task not found or does not belong to the specified project",
        );
      }
    }

    // Calculate duration if end time is provided
    const durationMinutes = endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 60_000)
      : null;

    const isActive = !endTime;

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        projectId: dto.projectId !== undefined ? dto.projectId : undefined,
        taskId: dto.taskId !== undefined ? dto.taskId : undefined,
        description:
          dto.description !== undefined ? dto.description : undefined,
        startTime: dto.startTime ? startTime : undefined,
        endTime: dto.endTime !== undefined ? endTime : undefined,
        durationMinutes,
        isActive,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Time entry updated: ${id}`);
    return updated;
  }

  async deleteTimeEntry(user: IAuthUser, id: string): Promise<void> {
    this.logger.log(`Deleting time entry ${id}`);

    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException("Time entry not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && timeEntry.userId !== user.id) {
      throw new ForbiddenException("You can only delete your own time entries");
    }

    // Soft delete
    await this.prisma.timeEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Time entry deleted: ${id}`);
  }

  async stopTimeEntry(
    user: IAuthUser,
    id: string,
  ): Promise<ITimeEntryWithRelations> {
    this.logger.log(`Stopping time entry ${id}`);

    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException("Time entry not found");
    }

    // Check authorization
    if (user.role === "EMPLOYEE" && timeEntry.userId !== user.id) {
      throw new ForbiddenException("You can only stop your own time entries");
    }

    if (!timeEntry.isActive) {
      throw new BadRequestException("Time entry is not active");
    }

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - timeEntry.startTime.getTime()) / 60_000,
    );

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        durationMinutes,
        isActive: false,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Time entry stopped: ${id}`);
    return updated;
  }

  async validateTimeEntry(
    user: IAuthUser,
    dto: ValidateTimeEntryDto,
  ): Promise<ValidationResultDto> {
    this.logger.log(`Validating time entry for user ${user.id}`);

    const warnings: string[] = [];
    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;

    // Check time range
    if (endTime && endTime <= startTime) {
      return {
        isValid: false,
        conflicts: [],
        warnings: ["End time must be after start time"],
      };
    }

    // Check for conflicts
    const conflicts = await this.findConflicts(
      user.id,
      user.companyId,
      startTime,
      endTime,
      dto.timeEntryId,
    );

    // Add warnings
    if (endTime) {
      const duration = (endTime.getTime() - startTime.getTime()) / 60_000;
      if (duration > 12 * 60) {
        warnings.push("Time entry exceeds 12 hours");
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
    startTime: Date,
    endTime?: Date,
    excludeId?: string,
  ): Promise<ITimeConflict[]> {
    return this.findConflicts(
      user.id,
      user.companyId,
      startTime,
      endTime,
      excludeId,
    );
  }

  async getDailySummary(user: IAuthUser, date: Date): Promise<IDailySummary> {
    this.logger.log(`Getting daily summary for ${date.toISOString()}`);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Prisma.TimeEntryWhereInput = {
      companyId: user.companyId,
      deletedAt: null,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    // Employees can only see their own entries
    if (user.role === "EMPLOYEE") {
      where.userId = user.id;
    }

    const entries = await this.prisma.timeEntry.findMany({
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const totalMinutes = entries.reduce(
      (sum, entry) => sum + (entry.durationMinutes ?? 0),
      0,
    );

    return {
      date: startOfDay.toISOString().split("T")[0],
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      entries,
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

  private async findConflicts(
    userId: string,
    companyId: string,
    startTime: Date,
    endTime?: Date,
    excludeId?: string,
  ): Promise<ITimeConflict[]> {
    // Find overlapping entries
    // An entry overlaps if:
    // 1. It starts before the new entry ends AND ends after the new entry starts
    // 2. For active entries (no end time), any entry that starts before them or is also active

    const where: Prisma.TimeEntryWhereInput = {
      userId,
      companyId,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingEntries = await this.prisma.timeEntry.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        description: true,
      },
    });

    const conflicts: ITimeConflict[] = [];

    for (const entry of existingEntries) {
      const entryStart = entry.startTime;
      const entryEnd = entry.endTime;

      let hasConflict = false;

      if (endTime) {
        if (entryEnd) {
          // Both have end times - Standard overlap check
          if (startTime < entryEnd && endTime > entryStart) {
            hasConflict = true;
          }
        } else {
          // Existing entry has no end time (is active)
          // Conflict if new entry overlaps with start of existing
          if (endTime > entryStart) {
            hasConflict = true;
          }
        }
      } else {
        // New entry has no end time (is active)
        // Conflict if existing entry is also active or ends after new entry starts
        if (entryEnd) {
          if (entryEnd > startTime) {
            hasConflict = true;
          }
        } else {
          hasConflict = true;
        }
      }

      if (hasConflict) {
        conflicts.push({
          conflictingEntryId: entry.id,
          startTime: entry.startTime,
          endTime: entry.endTime,
          description: entry.description,
        });
      }
    }

    return conflicts;
  }

  private getWeekBounds(
    year: number,
    week: number,
  ): { startOfWeek: Date; endOfWeek: Date } {
    const jan1 = new Date(year, 0, 1);
    const days = (week - 1) * 7;
    const dayOfWeek = jan1.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const startOfWeek = new Date(year, 0, 1 + diff + days);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

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
      ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
    );
  }
}
