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

  const mockWorkSession = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    userId: mockUser.id,
    companyId: mockCompany.id,
    date: new Date("2024-01-15"),
    clockIn: new Date("2024-01-15T09:00:00Z"),
    clockOut: new Date("2024-01-15T17:00:00Z"),
    status: "CLOCKED_OUT",
    totalHours: { toNumber: () => 8 },
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    workSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    break: {
      create: vi.fn(),
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

  describe("/api/v1/work-sessions/clock-in (POST)", () => {
    it("should clock in successfully", async () => {
      const clockInDto = {
        clockIn: "2024-01-15T09:00:00Z",
        notes: "Starting work",
      };

      const createdSession = {
        ...mockWorkSession,
        clockOut: null,
        totalHours: null,
        status: "WORKING",
        notes: clockInDto.notes,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [],
      };

      prisma.workSession.findFirst.mockResolvedValue(null);
      prisma.workSession.findMany.mockResolvedValue([]);
      prisma.workSession.create.mockResolvedValue(createdSession);

      const response = await request(app.getHttpServer())
        .post("/api/v1/work-sessions/clock-in")
        .set("Authorization", `Bearer ${authToken}`)
        .send(clockInDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.status).toBe("WORKING");
    });

    it("should return 401 when not authenticated", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/work-sessions/clock-in")
        .send({
          clockIn: "2024-01-15T09:00:00Z",
        })
        .expect(401);
    });

    it("should return 400 when already clocked in", async () => {
      prisma.workSession.findFirst.mockResolvedValue({
        ...mockWorkSession,
        status: "WORKING",
      });

      await request(app.getHttpServer())
        .post("/api/v1/work-sessions/clock-in")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clockIn: "2024-01-15T09:00:00Z",
        })
        .expect(400);
    });
  });

  describe("/api/v1/work-sessions/:id/clock-out (PATCH)", () => {
    it("should clock out successfully", async () => {
      const activeSession = {
        ...mockWorkSession,
        clockOut: null,
        status: "WORKING",
        totalHours: null,
        breaks: [],
      };

      const clockedOutSession = {
        ...activeSession,
        clockOut: new Date("2024-01-15T17:00:00Z"),
        status: "CLOCKED_OUT",
        totalHours: { toNumber: () => 8 },
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      };

      prisma.workSession.findFirst.mockResolvedValue(activeSession);
      prisma.workSession.update.mockResolvedValue(clockedOutSession);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/work-sessions/${mockWorkSession.id}/clock-out`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ clockOut: "2024-01-15T17:00:00Z" })
        .expect(200);

      expect(response.body.status).toBe("CLOCKED_OUT");
    });

    it("should return 400 when already clocked out", async () => {
      prisma.workSession.findFirst.mockResolvedValue({
        ...mockWorkSession,
        status: "CLOCKED_OUT",
        breaks: [],
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/work-sessions/${mockWorkSession.id}/clock-out`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ clockOut: "2024-01-15T17:00:00Z" })
        .expect(400);
    });
  });

  describe("/api/v1/work-sessions (GET)", () => {
    it("should return list of work sessions", async () => {
      const mockSessions = [
        {
          ...mockWorkSession,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
          },
          breaks: [],
        },
      ];

      prisma.workSession.findMany.mockResolvedValue(mockSessions);
      prisma.workSession.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/api/v1/work-sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("sessions");
      expect(response.body).toHaveProperty("total");
      expect(response.body.sessions).toHaveLength(1);
    });

    it("should filter by date range", async () => {
      prisma.workSession.findMany.mockResolvedValue([]);
      prisma.workSession.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get("/api/v1/work-sessions")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        })
        .expect(200);

      expect(prisma.workSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("/api/v1/work-sessions/:id (GET)", () => {
    it("should return a single work session", async () => {
      const sessionWithRelations = {
        ...mockWorkSession,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [],
      };

      prisma.workSession.findFirst.mockResolvedValue(sessionWithRelations);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/work-sessions/${mockWorkSession.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(mockWorkSession.id);
    });

    it("should return 404 for non-existent session", async () => {
      prisma.workSession.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/api/v1/work-sessions/550e8400-e29b-41d4-a716-446655440099")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("/api/v1/work-sessions/:id/breaks/start (POST)", () => {
    it("should start a break", async () => {
      const workingSession = {
        ...mockWorkSession,
        clockOut: null,
        status: "WORKING",
        breaks: [],
      };

      const sessionOnBreak = {
        ...workingSession,
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
            workSessionId: mockWorkSession.id,
            startTime: new Date("2024-01-15T12:00:00Z"),
            endTime: null,
            durationMinutes: null,
          },
        ],
      };

      prisma.workSession.findFirst.mockResolvedValue(workingSession);
      prisma.break.create.mockResolvedValue(sessionOnBreak.breaks[0]);
      prisma.workSession.update.mockResolvedValue(sessionOnBreak);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/work-sessions/${mockWorkSession.id}/breaks/start`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startTime: "2024-01-15T12:00:00Z" })
        .expect(200);

      expect(response.body.status).toBe("ON_BREAK");
    });
  });

  describe("/api/v1/work-sessions/:id/breaks/end (PATCH)", () => {
    it("should end a break", async () => {
      const sessionOnBreak = {
        ...mockWorkSession,
        clockOut: null,
        status: "ON_BREAK",
        breaks: [
          {
            id: "break-123",
            workSessionId: mockWorkSession.id,
            startTime: new Date("2024-01-15T12:00:00Z"),
            endTime: null,
            durationMinutes: null,
          },
        ],
      };

      const workingSession = {
        ...sessionOnBreak,
        status: "WORKING",
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        breaks: [
          {
            ...sessionOnBreak.breaks[0],
            endTime: new Date("2024-01-15T12:30:00Z"),
            durationMinutes: 30,
          },
        ],
      };

      prisma.workSession.findFirst.mockResolvedValue(sessionOnBreak);
      prisma.break.update.mockResolvedValue(workingSession.breaks[0]);
      prisma.workSession.update.mockResolvedValue(workingSession);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/work-sessions/${mockWorkSession.id}/breaks/end`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ endTime: "2024-01-15T12:30:00Z" })
        .expect(200);

      expect(response.body.status).toBe("WORKING");
    });
  });

  describe("/api/v1/work-sessions/validate (POST)", () => {
    it("should return valid for non-conflicting session", async () => {
      prisma.workSession.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post("/api/v1/work-sessions/validate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clockIn: "2024-01-15T09:00:00Z",
          clockOut: "2024-01-15T17:00:00Z",
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.conflicts).toHaveLength(0);
    });
  });

  describe("/api/v1/time-reports/daily (GET)", () => {
    it("should return daily summary", async () => {
      const mockSessions = [
        {
          ...mockWorkSession,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
          },
          breaks: [],
        },
      ];

      prisma.workSession.findMany.mockResolvedValue(mockSessions);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-reports/daily")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ date: "2024-01-15" })
        .expect(200);

      expect(response.body).toHaveProperty("date");
      expect(response.body).toHaveProperty("totalMinutes");
      expect(response.body).toHaveProperty("totalHours");
      expect(response.body).toHaveProperty("sessions");
    });
  });

  describe("/api/v1/time-reports/weekly (GET)", () => {
    it("should return weekly summary", async () => {
      prisma.workSession.findMany.mockResolvedValue([]);

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
      prisma.workSession.findMany.mockResolvedValue([]);

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
