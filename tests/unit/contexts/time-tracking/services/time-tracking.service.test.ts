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

import { createMock, type Mock } from "@/tests/utils/mock";

import { PrismaService } from "@/shared/database/prisma.service";

import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";
import { TimeTrackingService } from "@/contexts/time-tracking/services/time-tracking.service";

describe("TimeTrackingService", () => {
  let service: TimeTrackingService;
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

  beforeEach(() => {
    prismaService = createMock<PrismaService>({
      workSession: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as any,
      break: {
        create: vi.fn(),
        update: vi.fn(),
      } as any,
    });
    service = new TimeTrackingService(prismaService);
  });

  describe("clockIn", () => {
    it("should clock in successfully", async () => {
      const dto = {
        clockIn: "2024-01-15T09:00:00Z",
        notes: "Starting work",
      };

      const mockWorkSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        date: new Date("2024-01-15"),
        clockIn: new Date(dto.clockIn),
        clockOut: null,
        status: "WORKING",
        totalHours: null,
        notes: dto.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [],
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(null);
      (prismaService.workSession.findMany as any).mockResolvedValue([]);
      (prismaService.workSession.create as any).mockResolvedValue(
        mockWorkSession,
      );

      const result = await service.clockIn(mockUser, dto);

      expect(result.status).toBe("WORKING");
      expect(result.clockOut).toBeNull();
    });

    it("should throw BadRequestException when already clocked in", async () => {
      const dto = {
        clockIn: "2024-01-15T09:00:00Z",
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue({
        id: "existing-session",
        status: "WORKING",
      });

      await expect(service.clockIn(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("clockOut", () => {
    it("should clock out successfully", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: null,
        status: "WORKING",
        breaks: [],
      };

      const clockedOutSession = {
        ...mockSession,
        clockOut: new Date("2024-01-15T17:00:00Z"),
        status: "CLOCKED_OUT",
        totalHours: 8,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );
      (prismaService.workSession.update as any).mockResolvedValue(
        clockedOutSession,
      );

      const result = await service.clockOut(mockUser, "session-123", {
        clockOut: "2024-01-15T17:00:00Z",
      });

      expect(result.status).toBe("CLOCKED_OUT");
    });

    it("should throw NotFoundException when session not found", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue(null);

      await expect(
        service.clockOut(mockUser, "non-existent", {
          clockOut: "2024-01-15T17:00:00Z",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when already clocked out", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue({
        id: "session-123",
        userId: mockUser.id,
        status: "CLOCKED_OUT",
        breaks: [],
      });

      await expect(
        service.clockOut(mockUser, "session-123", {
          clockOut: "2024-01-15T17:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("startBreak", () => {
    it("should start a break when working", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: "WORKING",
      };

      const sessionOnBreak = {
        ...mockSession,
        status: "ON_BREAK",
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [
          {
            id: "break-123",
            startTime: new Date("2024-01-15T12:00:00Z"),
          },
        ],
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );
      (prismaService.break.create as any).mockResolvedValue(
        sessionOnBreak.breaks[0],
      );
      (prismaService.workSession.update as any).mockResolvedValue(
        sessionOnBreak,
      );

      const result = await service.startBreak(mockUser, "session-123", {
        startTime: "2024-01-15T12:00:00Z",
      });

      expect(result.status).toBe("ON_BREAK");
    });

    it("should throw BadRequestException when not working", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue({
        id: "session-123",
        userId: mockUser.id,
        status: "ON_BREAK",
      });

      await expect(
        service.startBreak(mockUser, "session-123", {
          startTime: "2024-01-15T12:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("endBreak", () => {
    it("should end a break", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: "ON_BREAK",
        breaks: [
          {
            id: "break-123",
            startTime: new Date("2024-01-15T12:00:00Z"),
            endTime: null,
          },
        ],
      };

      const workingSession = {
        ...mockSession,
        status: "WORKING",
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [
          {
            ...mockSession.breaks[0],
            endTime: new Date("2024-01-15T12:30:00Z"),
            durationMinutes: 30,
          },
        ],
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );
      (prismaService.break.update as any).mockResolvedValue(
        workingSession.breaks[0],
      );
      (prismaService.workSession.update as any).mockResolvedValue(
        workingSession,
      );

      const result = await service.endBreak(mockUser, "session-123", {
        endTime: "2024-01-15T12:30:00Z",
      });

      expect(result.status).toBe("WORKING");
    });

    it("should throw BadRequestException when not on break", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue({
        id: "session-123",
        userId: mockUser.id,
        status: "WORKING",
        breaks: [],
      });

      await expect(
        service.endBreak(mockUser, "session-123", {
          endTime: "2024-01-15T12:30:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getWorkSessions", () => {
    it("should return work sessions for a user", async () => {
      const filters = { limit: 10, offset: 0 };

      const mockSessions = [
        {
          id: "session-1",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          date: new Date("2024-01-15"),
          clockIn: new Date("2024-01-15T09:00:00Z"),
          clockOut: new Date("2024-01-15T17:00:00Z"),
          status: "CLOCKED_OUT",
        },
      ];

      (prismaService.workSession.findMany as any).mockResolvedValue(
        mockSessions,
      );
      (prismaService.workSession.count as any).mockResolvedValue(1);

      const result = await service.getWorkSessions(mockUser, filters);

      expect(result.sessions).toEqual(mockSessions);
      expect(result.total).toBe(1);
    });

    it("should filter by status when provided", async () => {
      const filters = { status: "WORKING" as const, limit: 10, offset: 0 };

      (prismaService.workSession.findMany as any).mockResolvedValue([]);
      (prismaService.workSession.count as any).mockResolvedValue(0);

      await service.getWorkSessions(mockUser, filters);

      expect(prismaService.workSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "WORKING",
          }),
        }),
      );
    });
  });

  describe("getWorkSessionById", () => {
    it("should return a work session by id", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        date: new Date("2024-01-15"),
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        status: "CLOCKED_OUT",
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );

      const result = await service.getWorkSessionById(mockUser, "session-123");

      expect(result).toEqual(mockSession);
    });

    it("should throw NotFoundException when session does not exist", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue(null);

      await expect(
        service.getWorkSessionById(mockUser, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when employee tries to access another users session", async () => {
      const mockSession = {
        id: "session-123",
        userId: "other-user",
        companyId: mockUser.companyId,
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );

      await expect(
        service.getWorkSessionById(mockUser, "session-123"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow admin to access any session in company", async () => {
      const mockSession = {
        id: "session-123",
        userId: "other-user",
        companyId: mockAdminUser.companyId,
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );

      const result = await service.getWorkSessionById(
        mockAdminUser,
        "session-123",
      );

      expect(result).toEqual(mockSession);
    });
  });

  describe("deleteWorkSession", () => {
    it("should delete a work session (admin only)", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockAdminUser.companyId,
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );
      (prismaService.workSession.delete as any).mockResolvedValue(mockSession);

      await service.deleteWorkSession(mockAdminUser, "session-123");

      expect(prismaService.workSession.delete).toHaveBeenCalledWith({
        where: { id: "session-123" },
      });
    });

    it("should throw ForbiddenException when employee tries to delete", async () => {
      const mockSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        mockSession,
      );

      await expect(
        service.deleteWorkSession(mockUser, "session-123"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("validateWorkSession", () => {
    it("should return valid for non-conflicting session", async () => {
      const dto = {
        clockIn: "2024-01-15T09:00:00Z",
        clockOut: "2024-01-15T17:00:00Z",
      };

      (prismaService.workSession.findMany as any).mockResolvedValue([]);

      const result = await service.validateWorkSession(mockUser, dto);

      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should return invalid when clock out is before clock in", async () => {
      const dto = {
        clockIn: "2024-01-15T17:00:00Z",
        clockOut: "2024-01-15T09:00:00Z",
      };

      const result = await service.validateWorkSession(mockUser, dto);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain(
        "Clock out time must be after clock in time",
      );
    });

    it("should return warning for long work session", async () => {
      const dto = {
        clockIn: "2024-01-15T00:00:00Z",
        clockOut: "2024-01-15T15:00:00Z", // 15 hours
      };

      (prismaService.workSession.findMany as any).mockResolvedValue([]);

      const result = await service.validateWorkSession(mockUser, dto);

      expect(result.warnings).toContain("Work session exceeds 12 hours");
    });
  });

  describe("getDailySummary", () => {
    it("should return daily summary with work sessions", async () => {
      const date = new Date("2024-01-15");

      const mockSessions = [
        {
          id: "session-1",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          date: new Date("2024-01-15"),
          clockIn: new Date("2024-01-15T09:00:00Z"),
          clockOut: new Date("2024-01-15T17:00:00Z"),
          totalHours: { toNumber: () => 8 },
        },
      ];

      (prismaService.workSession.findMany as any).mockResolvedValue(
        mockSessions,
      );

      const result = await service.getDailySummary(mockUser, date);

      expect(result.totalMinutes).toBe(480);
      expect(result.totalHours).toBe(8);
      expect(result.sessions).toHaveLength(1);
    });
  });

  describe("getActiveSession", () => {
    it("should return active session if exists", async () => {
      const activeSession = {
        id: "session-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        status: "WORKING",
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [],
      };

      (prismaService.workSession.findFirst as any).mockResolvedValue(
        activeSession,
      );

      const result = await service.getActiveSession(mockUser);

      expect(result).toEqual(activeSession);
      expect(result?.status).toBe("WORKING");
    });

    it("should return null if no active session", async () => {
      (prismaService.workSession.findFirst as any).mockResolvedValue(null);

      const result = await service.getActiveSession(mockUser);

      expect(result).toBeNull();
    });
  });
});
