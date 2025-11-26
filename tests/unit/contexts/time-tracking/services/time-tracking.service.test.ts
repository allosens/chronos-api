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
      timeEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      } as any,
      project: {
        findFirst: vi.fn(),
      } as any,
      task: {
        findFirst: vi.fn(),
      } as any,
    });
    service = new TimeTrackingService(prismaService);
  });

  describe("createTimeEntry", () => {
    it("should create a time entry successfully", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
        description: "Working on feature",
      };

      const mockTimeEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        projectId: null,
        taskId: null,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        durationMinutes: 480,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);
      (prismaService.timeEntry.create as any).mockResolvedValue(mockTimeEntry);

      const result = await service.createTimeEntry(mockUser, dto);

      expect(result).toEqual(mockTimeEntry);
      expect(prismaService.timeEntry.create).toHaveBeenCalled();
    });

    it("should create an active time entry when no end time is provided", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        description: "Starting work",
      };

      const mockTimeEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        projectId: null,
        taskId: null,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: null,
        durationMinutes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);
      (prismaService.timeEntry.create as any).mockResolvedValue(mockTimeEntry);

      const result = await service.createTimeEntry(mockUser, dto);

      expect(result.isActive).toBe(true);
      expect(result.endTime).toBeNull();
    });

    it("should throw BadRequestException when end time is before start time", async () => {
      const dto = {
        startTime: "2024-01-15T17:00:00Z",
        endTime: "2024-01-15T09:00:00Z",
      };

      await expect(service.createTimeEntry(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when there are conflicting entries", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
      };

      const conflictingEntry = {
        id: "existing-entry",
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T12:00:00Z"),
        description: "Existing entry",
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([
        conflictingEntry,
      ]);

      await expect(service.createTimeEntry(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should validate project belongs to company", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
        projectId: "project-123",
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);
      (prismaService.project.findFirst as any).mockResolvedValue(null);

      await expect(service.createTimeEntry(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getTimeEntries", () => {
    it("should return time entries for a user", async () => {
      const filters = { limit: 10, offset: 0 };

      const mockEntries = [
        {
          id: "entry-1",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T17:00:00Z"),
          durationMinutes: 480,
          isActive: false,
        },
      ];

      (prismaService.timeEntry.findMany as any).mockResolvedValue(mockEntries);
      (prismaService.timeEntry.count as any).mockResolvedValue(1);

      const result = await service.getTimeEntries(mockUser, filters);

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it("should filter by project when provided", async () => {
      const filters = { projectId: "project-123", limit: 10, offset: 0 };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);
      (prismaService.timeEntry.count as any).mockResolvedValue(0);

      await service.getTimeEntries(mockUser, filters);

      expect(prismaService.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: "project-123",
          }),
        }),
      );
    });
  });

  describe("getTimeEntryById", () => {
    it("should return a time entry by id", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        startTime: new Date("2024-01-15T09:00:00Z"),
        endTime: new Date("2024-01-15T17:00:00Z"),
        durationMinutes: 480,
        isActive: false,
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);

      const result = await service.getTimeEntryById(mockUser, "entry-123");

      expect(result).toEqual(mockEntry);
    });

    it("should throw NotFoundException when entry does not exist", async () => {
      (prismaService.timeEntry.findFirst as any).mockResolvedValue(null);

      await expect(
        service.getTimeEntryById(mockUser, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when employee tries to access another users entry", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: "other-user",
        companyId: mockUser.companyId,
        startTime: new Date("2024-01-15T09:00:00Z"),
        endTime: new Date("2024-01-15T17:00:00Z"),
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);

      await expect(
        service.getTimeEntryById(mockUser, "entry-123"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow admin to access any entry in company", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: "other-user",
        companyId: mockAdminUser.companyId,
        startTime: new Date("2024-01-15T09:00:00Z"),
        endTime: new Date("2024-01-15T17:00:00Z"),
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);

      const result = await service.getTimeEntryById(mockAdminUser, "entry-123");

      expect(result).toEqual(mockEntry);
    });
  });

  describe("updateTimeEntry", () => {
    it("should update a time entry successfully", async () => {
      const existingEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        projectId: null,
        startTime: new Date("2024-01-15T09:00:00Z"),
        endTime: new Date("2024-01-15T17:00:00Z"),
        durationMinutes: 480,
        isActive: false,
      };

      const updatedEntry = {
        ...existingEntry,
        description: "Updated description",
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(
        existingEntry,
      );
      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);
      (prismaService.timeEntry.update as any).mockResolvedValue(updatedEntry);

      const result = await service.updateTimeEntry(mockUser, "entry-123", {
        description: "Updated description",
      });

      expect(result.description).toBe("Updated description");
    });

    it("should throw NotFoundException when entry does not exist", async () => {
      (prismaService.timeEntry.findFirst as any).mockResolvedValue(null);

      await expect(
        service.updateTimeEntry(mockUser, "non-existent", {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when employee tries to update another users entry", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: "other-user",
        companyId: mockUser.companyId,
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);

      await expect(
        service.updateTimeEntry(mockUser, "entry-123", {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deleteTimeEntry", () => {
    it("should soft delete a time entry", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);
      (prismaService.timeEntry.update as any).mockResolvedValue({
        ...mockEntry,
        deletedAt: new Date(),
      });

      await service.deleteTimeEntry(mockUser, "entry-123");

      expect(prismaService.timeEntry.update).toHaveBeenCalledWith({
        where: { id: "entry-123" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException when entry does not exist", async () => {
      (prismaService.timeEntry.findFirst as any).mockResolvedValue(null);

      await expect(
        service.deleteTimeEntry(mockUser, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("stopTimeEntry", () => {
    it("should stop an active time entry", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        startTime: new Date("2024-01-15T09:00:00Z"),
        endTime: null,
        durationMinutes: null,
        isActive: true,
      };

      const stoppedEntry = {
        ...mockEntry,
        endTime: new Date(),
        durationMinutes: 60,
        isActive: false,
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);
      (prismaService.timeEntry.update as any).mockResolvedValue(stoppedEntry);

      const result = await service.stopTimeEntry(mockUser, "entry-123");

      expect(result.isActive).toBe(false);
      expect(result.endTime).toBeDefined();
    });

    it("should throw BadRequestException when entry is not active", async () => {
      const mockEntry = {
        id: "entry-123",
        userId: mockUser.id,
        companyId: mockUser.companyId,
        isActive: false,
      };

      (prismaService.timeEntry.findFirst as any).mockResolvedValue(mockEntry);

      await expect(
        service.stopTimeEntry(mockUser, "entry-123"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("validateTimeEntry", () => {
    it("should return valid for non-conflicting entry", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);

      const result = await service.validateTimeEntry(mockUser, dto);

      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should return invalid for conflicting entry", async () => {
      const dto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
      };

      const conflictingEntry = {
        id: "existing-entry",
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T12:00:00Z"),
        description: "Existing entry",
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([
        conflictingEntry,
      ]);

      const result = await service.validateTimeEntry(mockUser, dto);

      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });

    it("should return warning for long time entry", async () => {
      const dto = {
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T15:00:00Z", // 15 hours
      };

      (prismaService.timeEntry.findMany as any).mockResolvedValue([]);

      const result = await service.validateTimeEntry(mockUser, dto);

      expect(result.warnings).toContain("Time entry exceeds 12 hours");
    });
  });

  describe("getDailySummary", () => {
    it("should return daily summary with time entries", async () => {
      const date = new Date("2024-01-15");

      const mockEntries = [
        {
          id: "entry-1",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T12:00:00Z"),
          durationMinutes: 180,
        },
        {
          id: "entry-2",
          userId: mockUser.id,
          companyId: mockUser.companyId,
          startTime: new Date("2024-01-15T13:00:00Z"),
          endTime: new Date("2024-01-15T17:00:00Z"),
          durationMinutes: 240,
        },
      ];

      (prismaService.timeEntry.findMany as any).mockResolvedValue(mockEntries);

      const result = await service.getDailySummary(mockUser, date);

      expect(result.totalMinutes).toBe(420);
      expect(result.totalHours).toBe(7);
      expect(result.entries).toHaveLength(2);
    });
  });
});
