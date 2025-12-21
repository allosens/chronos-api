/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable unicorn/no-null */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { RequestStatus } from "@prisma/client";

import { createMock, type Mock } from "@/tests/utils/mock";

import { PrismaService } from "@/shared/database/prisma.service";

import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";
import { TimeCorrectionService } from "@/contexts/time-tracking/services/time-correction.service";

describe("TimeCorrectionService", () => {
  let service: TimeCorrectionService;
  let prismaService: Mock<PrismaService>;

  const mockUser: IAuthUser = {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: "EMPLOYEE",
    companyId: "company-123",
  };

  const mockAdminUser: IAuthUser = {
    id: "admin-123",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "COMPANY_ADMIN",
    companyId: "company-123",
  };

  const mockWorkSession = {
    id: "session-123",
    userId: mockUser.id,
    companyId: mockUser.companyId,
    date: new Date("2024-01-15"),
    clockIn: new Date("2024-01-15T09:00:00Z"),
    clockOut: new Date("2024-01-15T17:00:00Z"),
    status: "CLOCKED_OUT",
    totalHours: 8,
    breaks: [],
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaService = createMock<PrismaService>({
      timeCorrectionRequest: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      } as any,
      workSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      } as any,
      auditLog: {
        create: vi.fn(),
      } as any,
    });
    service = new TimeCorrectionService(prismaService);
  });

  describe("createCorrectionRequest", () => {
    it("should create a correction request successfully", async () => {
      const dto = {
        workSessionId: mockWorkSession.id,
        requestedClockIn: "2024-01-15T08:30:00Z",
        reason: "Forgot to clock in earlier",
      };

      const mockCorrectionRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        workSessionId: mockWorkSession.id,
        originalClockIn: mockWorkSession.clockIn,
        originalClockOut: mockWorkSession.clockOut,
        requestedClockIn: new Date(dto.requestedClockIn),
        requestedClockOut: null,
        reason: dto.reason,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        workSession: {
          id: mockWorkSession.id,
          date: mockWorkSession.date,
          clockIn: mockWorkSession.clockIn,
          clockOut: mockWorkSession.clockOut,
          status: mockWorkSession.status,
        },
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockWorkSession,
      );
      (prismaService.timeCorrectionRequest.create as any).mockResolvedValue(
        mockCorrectionRequest,
      );
      (prismaService.auditLog.create as any).mockResolvedValue({});

      const result = await service.createCorrectionRequest(mockUser, dto);

      expect(result.status).toBe(RequestStatus.PENDING);
      expect(result.reason).toBe(dto.reason);
      expect(prismaService.timeCorrectionRequest.create).toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException when no corrections are requested", async () => {
      const dto = {
        workSessionId: mockWorkSession.id,
        reason: "Test",
      };

      await expect(
        service.createCorrectionRequest(mockUser, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when work session does not exist", async () => {
      const dto = {
        workSessionId: "non-existent",
        requestedClockIn: "2024-01-15T08:30:00Z",
        reason: "Test",
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(null);

      await expect(
        service.createCorrectionRequest(mockUser, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when employee tries to correct another user's session", async () => {
      const otherUserSession = { ...mockWorkSession, userId: "other-user" };
      const dto = {
        workSessionId: mockWorkSession.id,
        requestedClockIn: "2024-01-15T08:30:00Z",
        reason: "Test",
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        otherUserSession,
      );

      await expect(
        service.createCorrectionRequest(mockUser, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when requested clock out is before clock in", async () => {
      const dto = {
        workSessionId: mockWorkSession.id,
        requestedClockIn: "2024-01-15T17:00:00Z",
        requestedClockOut: "2024-01-15T08:00:00Z",
        reason: "Test",
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockWorkSession,
      );

      await expect(
        service.createCorrectionRequest(mockUser, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getCorrectionRequests", () => {
    it("should get correction requests for employee (only their own)", async () => {
      const filters = {};

      const mockRequests = [
        {
          id: "correction-123",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          status: RequestStatus.PENDING,
          user: { id: mockUser.id, email: mockUser.email },
          reviewer: null,
          workSession: { id: mockWorkSession.id },
        },
      ];

      (prismaService.timeCorrectionRequest.findMany as any).mockResolvedValue(
        mockRequests,
      );
      (prismaService.timeCorrectionRequest.count as any).mockResolvedValue(1);

      const result = await service.getCorrectionRequests(mockUser, filters);

      expect(result.requests).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(
        prismaService.timeCorrectionRequest.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUser.id }),
        }),
      );
    });

    it("should get all correction requests for admin", async () => {
      const filters = {};

      const mockRequests = [
        {
          id: "correction-123",
          userId: mockUser.id,
          companyId: mockUser.companyId,
        },
        {
          id: "correction-456",
          userId: "other-user",
          companyId: mockUser.companyId,
        },
      ];

      (prismaService.timeCorrectionRequest.findMany as any).mockResolvedValue(
        mockRequests,
      );
      (prismaService.timeCorrectionRequest.count as any).mockResolvedValue(2);

      const result = await service.getCorrectionRequests(
        mockAdminUser,
        filters,
      );

      expect(result.requests).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("approveCorrectionRequest", () => {
    it("should approve correction request and update work session", async () => {
      const dto = { reviewNotes: "Approved" };

      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        workSessionId: mockWorkSession.id,
        originalClockIn: mockWorkSession.clockIn,
        originalClockOut: mockWorkSession.clockOut,
        requestedClockIn: new Date("2024-01-15T08:30:00Z"),
        requestedClockOut: null,
        status: RequestStatus.PENDING,
        workSession: mockWorkSession,
      };

      const approvedRequest = {
        ...mockRequest,
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
        reviewNotes: dto.reviewNotes,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        reviewer: {
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          firstName: mockAdminUser.firstName,
          lastName: mockAdminUser.lastName,
        },
        workSession: {
          id: mockWorkSession.id,
          date: mockWorkSession.date,
          clockIn: mockRequest.requestedClockIn,
          clockOut: mockWorkSession.clockOut,
          status: mockWorkSession.status,
        },
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );
      (prismaService.workSession.update as any).mockResolvedValue({});
      (prismaService.timeCorrectionRequest.update as any).mockResolvedValue(
        approvedRequest,
      );
      (prismaService.auditLog.create as any).mockResolvedValue({});

      const result = await service.approveCorrectionRequest(
        mockAdminUser,
        "correction-123",
        dto,
      );

      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(result.reviewedBy).toBe(mockAdminUser.id);
      expect(prismaService.workSession.update).toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it("should throw ForbiddenException when employee tries to approve", async () => {
      const dto = { reviewNotes: "Approved" };

      const mockRequest = {
        id: "correction-123",
        status: RequestStatus.PENDING,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.approveCorrectionRequest(mockUser, "correction-123", dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when request is not pending", async () => {
      const dto = { reviewNotes: "Approved" };

      const mockRequest = {
        id: "correction-123",
        status: RequestStatus.APPROVED,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.approveCorrectionRequest(mockAdminUser, "correction-123", dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when trying to self-approve", async () => {
      const dto = { reviewNotes: "Approved" };

      const mockRequest = {
        id: "correction-123",
        userId: mockAdminUser.id,
        status: RequestStatus.PENDING,
        workSession: mockWorkSession,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.approveCorrectionRequest(mockAdminUser, "correction-123", dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("rejectCorrectionRequest", () => {
    it("should reject correction request", async () => {
      const dto = { reviewNotes: "Not enough justification" };

      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: RequestStatus.PENDING,
      };

      const rejectedRequest = {
        ...mockRequest,
        status: RequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
        reviewNotes: dto.reviewNotes,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        reviewer: {
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          firstName: mockAdminUser.firstName,
          lastName: mockAdminUser.lastName,
        },
        workSession: {
          id: mockWorkSession.id,
          date: mockWorkSession.date,
          clockIn: mockWorkSession.clockIn,
          clockOut: mockWorkSession.clockOut,
          status: mockWorkSession.status,
        },
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );
      (prismaService.timeCorrectionRequest.update as any).mockResolvedValue(
        rejectedRequest,
      );
      (prismaService.auditLog.create as any).mockResolvedValue({});

      const result = await service.rejectCorrectionRequest(
        mockAdminUser,
        "correction-123",
        dto,
      );

      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(result.reviewNotes).toBe(dto.reviewNotes);
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when employee tries to reject", async () => {
      const dto = { reviewNotes: "Rejected" };

      const mockRequest = {
        id: "correction-123",
        status: RequestStatus.PENDING,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.rejectCorrectionRequest(mockUser, "correction-123", dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("cancelCorrectionRequest", () => {
    it("should cancel own correction request", async () => {
      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: RequestStatus.PENDING,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );
      (prismaService.timeCorrectionRequest.update as any).mockResolvedValue({});
      (prismaService.auditLog.create as any).mockResolvedValue({});

      await service.cancelCorrectionRequest(mockUser, "correction-123");

      expect(prismaService.timeCorrectionRequest.update).toHaveBeenCalledWith({
        where: { id: "correction-123" },
        data: { status: RequestStatus.CANCELLED },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when trying to cancel another user's request", async () => {
      const mockRequest = {
        id: "correction-123",
        userId: "other-user",
        companyId: mockUser.companyId,
        status: RequestStatus.PENDING,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.cancelCorrectionRequest(mockUser, "correction-123"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when request is not pending", async () => {
      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: RequestStatus.APPROVED,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.cancelCorrectionRequest(mockUser, "correction-123"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateCorrectionRequest", () => {
    it("should update own pending correction request", async () => {
      const dto = {
        requestedClockIn: "2024-01-15T08:00:00Z",
        reason: "Updated reason",
      };

      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        workSessionId: mockWorkSession.id,
        requestedClockIn: new Date("2024-01-15T08:30:00Z"),
        requestedClockOut: null,
        reason: "Original reason",
        status: RequestStatus.PENDING,
        workSession: mockWorkSession,
      };

      const updatedRequest = {
        ...mockRequest,
        requestedClockIn: new Date(dto.requestedClockIn),
        reason: dto.reason,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        reviewer: null,
        workSession: {
          id: mockWorkSession.id,
          date: mockWorkSession.date,
          clockIn: mockWorkSession.clockIn,
          clockOut: mockWorkSession.clockOut,
          status: mockWorkSession.status,
        },
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );
      (prismaService.timeCorrectionRequest.update as any).mockResolvedValue(
        updatedRequest,
      );
      (prismaService.auditLog.create as any).mockResolvedValue({});

      const result = await service.updateCorrectionRequest(
        mockUser,
        "correction-123",
        dto,
      );

      expect(result.reason).toBe(dto.reason);
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when trying to update another user's request", async () => {
      const dto = { reason: "Updated" };

      const mockRequest = {
        id: "correction-123",
        userId: "other-user",
        companyId: mockUser.companyId,
        status: RequestStatus.PENDING,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.updateCorrectionRequest(mockUser, "correction-123", dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when request is not pending", async () => {
      const dto = { reason: "Updated" };

      const mockRequest = {
        id: "correction-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: RequestStatus.APPROVED,
      };

      (prismaService.timeCorrectionRequest.findFirst as any).mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.updateCorrectionRequest(mockUser, "correction-123", dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getPendingApprovals", () => {
    it("should get pending approvals for admin", async () => {
      const mockRequests = [
        {
          id: "correction-123",
          userId: mockUser.id,
          status: RequestStatus.PENDING,
        },
      ];

      (prismaService.timeCorrectionRequest.findMany as any).mockResolvedValue(
        mockRequests,
      );
      (prismaService.timeCorrectionRequest.count as any).mockResolvedValue(1);

      const result = await service.getPendingApprovals(mockAdminUser);

      expect(result.requests).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(
        prismaService.timeCorrectionRequest.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RequestStatus.PENDING,
            userId: { not: mockAdminUser.id },
          }),
        }),
      );
    });

    it("should throw ForbiddenException when employee tries to get pending approvals", async () => {
      await expect(service.getPendingApprovals(mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("getCorrectionHistory", () => {
    it("should get correction history for work session", async () => {
      const mockRequests = [
        {
          id: "correction-123",
          workSessionId: mockWorkSession.id,
          status: RequestStatus.APPROVED,
        },
        {
          id: "correction-456",
          workSessionId: mockWorkSession.id,
          status: RequestStatus.REJECTED,
        },
      ];

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockWorkSession,
      );
      (prismaService.timeCorrectionRequest.findMany as any).mockResolvedValue(
        mockRequests,
      );
      (prismaService.timeCorrectionRequest.count as any).mockResolvedValue(2);

      const result = await service.getCorrectionHistory(
        mockUser,
        mockWorkSession.id,
      );

      expect(result.requests).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should throw NotFoundException when work session not found", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue(null);

      await expect(
        service.getCorrectionHistory(mockUser, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when employee tries to view another user's history", async () => {
      const otherUserSession = { ...mockWorkSession, userId: "other-user" };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        otherUserSession,
      );

      await expect(
        service.getCorrectionHistory(mockUser, mockWorkSession.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
