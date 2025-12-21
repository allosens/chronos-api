/* eslint-disable unicorn/no-null */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma, RequestStatus, WorkStatus } from "@prisma/client";

import { PrismaService } from "@/shared/database/prisma.service";

import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import {
  type ApproveTimeCorrectionRequestDto,
  type CreateTimeCorrectionRequestDto,
  type FilterTimeCorrectionRequestsDto,
  type RejectTimeCorrectionRequestDto,
  type TimeCorrectionRequestResponseDto,
  type TimeCorrectionRequestsListResponseDto,
  type UpdateTimeCorrectionRequestDto,
} from "../models";

/** Milliseconds in a minute */
const MS_PER_MINUTE = 60_000;

@Injectable()
export class TimeCorrectionService {
  private readonly logger = new Logger(TimeCorrectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCorrectionRequest(
    user: IAuthUser,
    dto: CreateTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(
      `Creating time correction request for work session ${dto.workSessionId}`,
    );

    // Validate at least one correction is requested
    if (!dto.requestedClockIn && !dto.requestedClockOut) {
      throw new BadRequestException(
        "At least one time correction (clockIn or clockOut) must be requested",
      );
    }

    // Fetch work session with company validation
    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id: dto.workSessionId,
        companyId: user.companyId,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Employees can only create corrections for their own sessions
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException(
        "You can only create correction requests for your own work sessions",
      );
    }

    // Validate requested times
    const requestedClockIn = dto.requestedClockIn
      ? new Date(dto.requestedClockIn)
      : null;
    const requestedClockOut = dto.requestedClockOut
      ? new Date(dto.requestedClockOut)
      : null;

    // If both times are provided, validate clock out is after clock in
    if (requestedClockIn && requestedClockOut) {
      if (requestedClockOut <= requestedClockIn) {
        throw new BadRequestException(
          "Requested clock out time must be after clock in time",
        );
      }
    }

    // If only clock in is changed, validate against existing clock out
    if (requestedClockIn && !requestedClockOut && workSession.clockOut) {
      if (workSession.clockOut <= requestedClockIn) {
        throw new BadRequestException(
          "Requested clock in time must be before existing clock out time",
        );
      }
    }

    // If only clock out is changed, validate against existing clock in
    if (!requestedClockIn && requestedClockOut) {
      if (requestedClockOut <= workSession.clockIn) {
        throw new BadRequestException(
          "Requested clock out time must be after existing clock in time",
        );
      }
    }

    // Create the correction request
    const correctionRequest = await this.prisma.timeCorrectionRequest.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        workSessionId: dto.workSessionId,
        originalClockIn: workSession.clockIn,
        originalClockOut: workSession.clockOut,
        requestedClockIn,
        requestedClockOut,
        reason: dto.reason,
        status: RequestStatus.PENDING,
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
        workSession: {
          select: {
            id: true,
            date: true,
            clockIn: true,
            clockOut: true,
            status: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "TimeCorrectionRequest",
        entityId: correctionRequest.id,
        action: AuditAction.CREATED,
        newValues: {
          workSessionId: dto.workSessionId,
          requestedClockIn,
          requestedClockOut,
          reason: dto.reason,
        },
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(
      `Time correction request created: ${correctionRequest.id}`,
    );

    return {
      ...correctionRequest,
      reviewer: null,
    };
  }

  async getCorrectionRequests(
    user: IAuthUser,
    filters: FilterTimeCorrectionRequestsDto,
  ): Promise<TimeCorrectionRequestsListResponseDto> {
    this.logger.log(
      `Fetching time correction requests for company ${user.companyId}`,
    );

    const where: Prisma.TimeCorrectionRequestWhereInput = {
      companyId: user.companyId,
    };

    // Employees can only see their own requests
    if (user.role === "EMPLOYEE") {
      where.userId = user.id;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.workSessionId) {
      where.workSessionId = filters.workSessionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(filters.startDate),
        };
      }
      if (filters.endDate) {
        where.createdAt = {
          ...where.createdAt,
          lte: new Date(filters.endDate),
        };
      }
    }

    const [requests, total] = await Promise.all([
      this.prisma.timeCorrectionRequest.findMany({
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
          reviewer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          workSession: {
            select: {
              id: true,
              date: true,
              clockIn: true,
              clockOut: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: filters.offset,
        take: filters.limit,
      }),
      this.prisma.timeCorrectionRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    };
  }

  async getCorrectionRequestById(
    user: IAuthUser,
    id: string,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Fetching time correction request ${id}`);

    const request = await this.prisma.timeCorrectionRequest.findFirst({
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
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        workSession: {
          select: {
            id: true,
            date: true,
            clockIn: true,
            clockOut: true,
            status: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException("Time correction request not found");
    }

    // Employees can only view their own requests
    if (user.role === "EMPLOYEE" && request.userId !== user.id) {
      throw new ForbiddenException(
        "You can only view your own correction requests",
      );
    }

    return request;
  }

  async updateCorrectionRequest(
    user: IAuthUser,
    id: string,
    dto: UpdateTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Updating time correction request ${id}`);

    const request = await this.prisma.timeCorrectionRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        workSession: true,
      },
    });

    if (!request) {
      throw new NotFoundException("Time correction request not found");
    }

    // Only the requester can update their request
    if (request.userId !== user.id) {
      throw new ForbiddenException(
        "You can only update your own correction requests",
      );
    }

    // Can only update pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        "Can only update pending correction requests",
      );
    }

    // Validate at least one correction is provided
    const requestedClockIn = dto.requestedClockIn
      ? new Date(dto.requestedClockIn)
      : request.requestedClockIn;
    const requestedClockOut = dto.requestedClockOut
      ? new Date(dto.requestedClockOut)
      : request.requestedClockOut;

    if (!requestedClockIn && !requestedClockOut) {
      throw new BadRequestException(
        "At least one time correction must be requested",
      );
    }

    // Validate times
    if (requestedClockIn && requestedClockOut) {
      if (requestedClockOut <= requestedClockIn) {
        throw new BadRequestException(
          "Requested clock out time must be after clock in time",
        );
      }
    }

    const updated = await this.prisma.timeCorrectionRequest.update({
      where: { id },
      data: {
        requestedClockIn: dto.requestedClockIn
          ? requestedClockIn
          : undefined,
        requestedClockOut: dto.requestedClockOut
          ? requestedClockOut
          : undefined,
        reason: dto.reason,
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
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        workSession: {
          select: {
            id: true,
            date: true,
            clockIn: true,
            clockOut: true,
            status: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "TimeCorrectionRequest",
        entityId: id,
        action: AuditAction.UPDATED,
        oldValues: {
          requestedClockIn: request.requestedClockIn,
          requestedClockOut: request.requestedClockOut,
          reason: request.reason,
        },
        newValues: {
          requestedClockIn,
          requestedClockOut,
          reason: dto.reason ?? request.reason,
        },
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(`Time correction request updated: ${id}`);
    return updated;
  }

  async cancelCorrectionRequest(user: IAuthUser, id: string): Promise<void> {
    this.logger.log(`Cancelling time correction request ${id}`);

    const request = await this.prisma.timeCorrectionRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!request) {
      throw new NotFoundException("Time correction request not found");
    }

    // Only the requester can cancel their request
    if (request.userId !== user.id) {
      throw new ForbiddenException(
        "You can only cancel your own correction requests",
      );
    }

    // Can only cancel pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        "Can only cancel pending correction requests",
      );
    }

    await this.prisma.timeCorrectionRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CANCELLED,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "TimeCorrectionRequest",
        entityId: id,
        action: AuditAction.UPDATED,
        oldValues: { status: RequestStatus.PENDING },
        newValues: { status: RequestStatus.CANCELLED },
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(`Time correction request cancelled: ${id}`);
  }

  async approveCorrectionRequest(
    user: IAuthUser,
    id: string,
    dto: ApproveTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Approving time correction request ${id}`);

    const request = await this.prisma.timeCorrectionRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        workSession: {
          include: {
            breaks: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException("Time correction request not found");
    }

    // Only managers/admins can approve
    if (user.role === "EMPLOYEE") {
      throw new ForbiddenException(
        "Only managers and administrators can approve correction requests",
      );
    }

    // Can only approve pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        "Can only approve pending correction requests",
      );
    }

    // Prevent self-approval
    if (request.userId === user.id) {
      throw new ForbiddenException(
        "You cannot approve your own correction requests",
      );
    }

    // Apply the time corrections to work session
    const newClockIn = request.requestedClockIn ?? request.workSession.clockIn;
    const newClockOut =
      request.requestedClockOut ?? request.workSession.clockOut;

    // Recalculate total hours
    let totalHours: number | null = null;
    if (newClockOut) {
      const totalBreakMinutes = request.workSession.breaks.reduce(
        (sum, b) => sum + (b.durationMinutes ?? 0),
        0,
      );
      const totalMinutes =
        Math.round((newClockOut.getTime() - newClockIn.getTime()) / MS_PER_MINUTE) -
        totalBreakMinutes;
      totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    }

    // Update work session with approved times
    await this.prisma.workSession.update({
      where: { id: request.workSessionId },
      data: {
        clockIn: newClockIn,
        clockOut: newClockOut,
        totalHours,
        status:
          newClockOut !== null
            ? WorkStatus.CLOCKED_OUT
            : request.workSession.status,
      },
    });

    // Update correction request status
    const updated = await this.prisma.timeCorrectionRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        reviewNotes: dto.reviewNotes ?? null,
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
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        workSession: {
          select: {
            id: true,
            date: true,
            clockIn: true,
            clockOut: true,
            status: true,
          },
        },
      },
    });

    // Create audit logs
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "TimeCorrectionRequest",
        entityId: id,
        action: AuditAction.UPDATED,
        oldValues: { status: RequestStatus.PENDING },
        newValues: {
          status: RequestStatus.APPROVED,
          reviewedBy: user.id,
          reviewNotes: dto.reviewNotes,
        },
        ipAddress: null,
        userAgent: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "WorkSession",
        entityId: request.workSessionId,
        action: AuditAction.UPDATED,
        oldValues: {
          clockIn: request.originalClockIn,
          clockOut: request.originalClockOut,
        },
        newValues: {
          clockIn: newClockIn,
          clockOut: newClockOut,
          totalHours,
        },
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(`Time correction request approved: ${id}`);
    return updated;
  }

  async rejectCorrectionRequest(
    user: IAuthUser,
    id: string,
    dto: RejectTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Rejecting time correction request ${id}`);

    const request = await this.prisma.timeCorrectionRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!request) {
      throw new NotFoundException("Time correction request not found");
    }

    // Only managers/admins can reject
    if (user.role === "EMPLOYEE") {
      throw new ForbiddenException(
        "Only managers and administrators can reject correction requests",
      );
    }

    // Can only reject pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        "Can only reject pending correction requests",
      );
    }

    const updated = await this.prisma.timeCorrectionRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        reviewNotes: dto.reviewNotes,
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
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        workSession: {
          select: {
            id: true,
            date: true,
            clockIn: true,
            clockOut: true,
            status: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        entityType: "TimeCorrectionRequest",
        entityId: id,
        action: AuditAction.UPDATED,
        oldValues: { status: RequestStatus.PENDING },
        newValues: {
          status: RequestStatus.REJECTED,
          reviewedBy: user.id,
          reviewNotes: dto.reviewNotes,
        },
        ipAddress: null,
        userAgent: null,
      },
    });

    this.logger.log(`Time correction request rejected: ${id}`);
    return updated;
  }

  async getPendingApprovals(
    user: IAuthUser,
  ): Promise<TimeCorrectionRequestsListResponseDto> {
    this.logger.log(`Fetching pending approvals for company ${user.companyId}`);

    // Only managers/admins can view pending approvals
    if (user.role === "EMPLOYEE") {
      throw new ForbiddenException(
        "Only managers and administrators can view pending approvals",
      );
    }

    const where: Prisma.TimeCorrectionRequestWhereInput = {
      companyId: user.companyId,
      status: RequestStatus.PENDING,
      userId: { not: user.id }, // Exclude own requests
    };

    const [requests, total] = await Promise.all([
      this.prisma.timeCorrectionRequest.findMany({
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
          reviewer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          workSession: {
            select: {
              id: true,
              date: true,
              clockIn: true,
              clockOut: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      this.prisma.timeCorrectionRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      limit: total,
      offset: 0,
    };
  }

  async getCorrectionHistory(
    user: IAuthUser,
    workSessionId: string,
  ): Promise<TimeCorrectionRequestsListResponseDto> {
    this.logger.log(
      `Fetching correction history for work session ${workSessionId}`,
    );

    // Verify work session exists and belongs to company
    const workSession = await this.prisma.workSession.findFirst({
      where: {
        id: workSessionId,
        companyId: user.companyId,
      },
    });

    if (!workSession) {
      throw new NotFoundException("Work session not found");
    }

    // Employees can only view history for their own sessions
    if (user.role === "EMPLOYEE" && workSession.userId !== user.id) {
      throw new ForbiddenException(
        "You can only view correction history for your own work sessions",
      );
    }

    const where: Prisma.TimeCorrectionRequestWhereInput = {
      workSessionId,
      companyId: user.companyId,
    };

    const [requests, total] = await Promise.all([
      this.prisma.timeCorrectionRequest.findMany({
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
          reviewer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          workSession: {
            select: {
              id: true,
              date: true,
              clockIn: true,
              clockOut: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.timeCorrectionRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      limit: total,
      offset: 0,
    };
  }
}
