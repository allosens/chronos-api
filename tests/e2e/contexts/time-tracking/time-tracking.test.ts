/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable unicorn/no-null */
import { ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import * as nock from "nock";
import request from "supertest";
import { vi } from "vitest";

import { AppModule } from "@/app/app.module";

import { PrismaService } from "@/shared/database/prisma.service";

describe("TimeTracking (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: any;
  let authToken: string;

  const mockCompany = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Test Company",
    email: "company@test.com",
  };

  const mockUser = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: "EMPLOYEE",
    companyId: mockCompany.id,
    isActive: true,
    passwordHash: "", // Will be set in beforeAll
  };

  const mockProject = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Test Project",
    companyId: mockCompany.id,
    isActive: true,
    deletedAt: null,
  };

  const mockTimeEntry = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    userId: mockUser.id,
    companyId: mockCompany.id,
    projectId: null,
    taskId: null,
    description: "Test time entry",
    startTime: new Date("2024-01-15T09:00:00Z"),
    endTime: new Date("2024-01-15T17:00:00Z"),
    durationMinutes: 480,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  // Create a mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
    timeEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
  };

  beforeAll(async () => {
    // Hash password for mock user
    mockUser.passwordHash = await bcrypt.hash("password123", 10);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix("api");

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = mockPrismaService;

    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");

    // Setup authentication - login to get a token
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);
    prisma.refreshToken.create.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440020",
      token: "mock-refresh-token",
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: mockUser.email,
        password: "password123",
      });

    authToken = loginResponse.body.accessToken;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks with default responses for authenticated user lookup
    prisma.user.findUnique.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
      companyId: mockUser.companyId,
      isActive: true,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await app.close();
    nock.enableNetConnect();
  });

  describe("/api/v1/time-entries (POST)", () => {
    it("should create a time entry", async () => {
      const createDto = {
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
        description: "Working on feature",
      };

      const createdEntry = {
        ...mockTimeEntry,
        description: createDto.description,
        startTime: new Date(createDto.startTime),
        endTime: new Date(createDto.endTime),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      prisma.timeEntry.findMany.mockResolvedValue([]);
      prisma.timeEntry.create.mockResolvedValue(createdEntry);

      const response = await request(app.getHttpServer())
        .post("/api/v1/time-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.description).toBe(createDto.description);
    });

    it("should return 401 when not authenticated", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/time-entries")
        .send({
          startTime: "2024-01-15T09:00:00Z",
          endTime: "2024-01-15T17:00:00Z",
        })
        .expect(401);
    });

    it("should return 400 for invalid date format", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/time-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          startTime: "invalid-date",
        })
        .expect(400);
    });

    it("should return 400 when end time is before start time", async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post("/api/v1/time-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          startTime: "2024-01-15T17:00:00Z",
          endTime: "2024-01-15T09:00:00Z",
        })
        .expect(400);
    });
  });

  describe("/api/v1/time-entries (GET)", () => {
    it("should return list of time entries", async () => {
      const mockEntries = [
        {
          ...mockTimeEntry,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
          },
          project: null,
          task: null,
        },
      ];

      prisma.timeEntry.findMany.mockResolvedValue(mockEntries);
      prisma.timeEntry.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("entries");
      expect(response.body).toHaveProperty("total");
      expect(response.body.entries).toHaveLength(1);
    });

    it("should filter by date range", async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);
      prisma.timeEntry.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get("/api/v1/time-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-31T23:59:59Z",
        })
        .expect(200);

      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("/api/v1/time-entries/:id (GET)", () => {
    it("should return a single time entry", async () => {
      const entryWithRelations = {
        ...mockTimeEntry,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      prisma.timeEntry.findFirst.mockResolvedValue(entryWithRelations);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/time-entries/${mockTimeEntry.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(mockTimeEntry.id);
    });

    it("should return 404 for non-existent entry", async () => {
      prisma.timeEntry.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/api/v1/time-entries/550e8400-e29b-41d4-a716-446655440099")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("/api/v1/time-entries/:id (PUT)", () => {
    it("should update a time entry", async () => {
      const existingEntry = {
        ...mockTimeEntry,
        userId: mockUser.id,
        projectId: null,
      };

      const updatedEntry = {
        ...existingEntry,
        description: "Updated description",
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      prisma.timeEntry.findFirst.mockResolvedValue(existingEntry);
      prisma.timeEntry.findMany.mockResolvedValue([]);
      prisma.timeEntry.update.mockResolvedValue(updatedEntry);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/time-entries/${mockTimeEntry.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "Updated description" })
        .expect(200);

      expect(response.body.description).toBe("Updated description");
    });
  });

  describe("/api/v1/time-entries/:id (DELETE)", () => {
    it("should soft delete a time entry", async () => {
      const existingEntry = {
        ...mockTimeEntry,
        userId: mockUser.id,
      };

      prisma.timeEntry.findFirst.mockResolvedValue(existingEntry);
      prisma.timeEntry.update.mockResolvedValue({
        ...existingEntry,
        deletedAt: new Date(),
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/time-entries/${mockTimeEntry.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe("/api/v1/time-entries/:id/stop (PATCH)", () => {
    it("should stop an active time entry", async () => {
      const activeEntry = {
        ...mockTimeEntry,
        userId: mockUser.id,
        endTime: null,
        durationMinutes: null,
        isActive: true,
      };

      const stoppedEntry = {
        ...activeEntry,
        endTime: new Date(),
        durationMinutes: 120,
        isActive: false,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        project: null,
        task: null,
      };

      prisma.timeEntry.findFirst.mockResolvedValue(activeEntry);
      prisma.timeEntry.update.mockResolvedValue(stoppedEntry);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/time-entries/${mockTimeEntry.id}/stop`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.endTime).toBeDefined();
    });

    it("should return 400 when entry is not active", async () => {
      const inactiveEntry = {
        ...mockTimeEntry,
        userId: mockUser.id,
        isActive: false,
      };

      prisma.timeEntry.findFirst.mockResolvedValue(inactiveEntry);

      await request(app.getHttpServer())
        .patch(`/api/v1/time-entries/${mockTimeEntry.id}/stop`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe("/api/v1/time-entries/validate (POST)", () => {
    it("should return valid for non-conflicting entry", async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post("/api/v1/time-entries/validate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          startTime: "2024-01-15T09:00:00Z",
          endTime: "2024-01-15T17:00:00Z",
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.conflicts).toHaveLength(0);
    });
  });

  describe("/api/v1/time-reports/daily (GET)", () => {
    it("should return daily summary", async () => {
      const mockEntries = [
        {
          ...mockTimeEntry,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
          },
          project: null,
          task: null,
        },
      ];

      prisma.timeEntry.findMany.mockResolvedValue(mockEntries);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-reports/daily")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ date: "2024-01-15" })
        .expect(200);

      expect(response.body).toHaveProperty("date");
      expect(response.body).toHaveProperty("totalMinutes");
      expect(response.body).toHaveProperty("totalHours");
      expect(response.body).toHaveProperty("entries");
    });
  });

  describe("/api/v1/time-reports/weekly (GET)", () => {
    it("should return weekly summary", async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-reports/weekly")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ year: 2024, week: 3 })
        .expect(200);

      expect(response.body).toHaveProperty("weekStart");
      expect(response.body).toHaveProperty("weekEnd");
      expect(response.body).toHaveProperty("totalMinutes");
      expect(response.body).toHaveProperty("dailySummaries");
    });
  });

  describe("/api/v1/time-reports/monthly (GET)", () => {
    it("should return monthly summary", async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-reports/monthly")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ year: 2024, month: 1 })
        .expect(200);

      expect(response.body).toHaveProperty("month");
      expect(response.body).toHaveProperty("year");
      expect(response.body).toHaveProperty("totalMinutes");
      expect(response.body).toHaveProperty("weeklySummaries");
    });
  });
});
