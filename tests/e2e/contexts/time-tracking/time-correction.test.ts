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
import { RequestStatus } from "@prisma/client";
import request from "supertest";
import { vi } from "vitest";

import { AppModule } from "@/app/app.module";

import { PrismaService } from "@/shared/database/prisma.service";

describe("TimeCorrection (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: any;
  let authToken: string;
  let adminAuthToken: string;

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
    passwordHash: "",
  };

  const mockAdminUser = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "COMPANY_ADMIN",
    companyId: mockCompany.id,
    isActive: true,
    passwordHash: "",
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
    breaks: [],
  };

  const mockCorrectionRequest = {
    id: "550e8400-e29b-41d4-a716-446655440004",
    userId: mockUser.id,
    companyId: mockCompany.id,
    workSessionId: mockWorkSession.id,
    originalClockIn: mockWorkSession.clockIn,
    originalClockOut: mockWorkSession.clockOut,
    requestedClockIn: new Date("2024-01-15T08:30:00Z"),
    requestedClockOut: null,
    reason: "Forgot to clock in earlier",
    status: RequestStatus.PENDING,
    createdAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
  };

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
    timeCorrectionRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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
    mockUser.passwordHash = await bcrypt.hash("password123", 10);
    mockAdminUser.passwordHash = await bcrypt.hash("admin123", 10);

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

    // Login as employee
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

    // Login as admin
    prisma.user.findUnique.mockResolvedValue(mockAdminUser);
    prisma.user.update.mockResolvedValue(mockAdminUser);
    prisma.refreshToken.create.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440021",
      token: "mock-admin-refresh-token",
      userId: mockAdminUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: mockAdminUser.email,
        password: "admin123",
      });

    adminAuthToken = adminLoginResponse.body.accessToken;
  });

  beforeEach(() => {
    vi.clearAllMocks();

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

  describe("/api/v1/time-corrections (POST)", () => {
    it("should create a time correction request successfully", async () => {
      const createDto = {
        workSessionId: mockWorkSession.id,
        requestedClockIn: "2024-01-15T08:30:00Z",
        reason: "Forgot to clock in earlier",
      };

      const createdRequest = {
        ...mockCorrectionRequest,
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

      prisma.workSession.findFirst.mockResolvedValue(mockWorkSession);
      prisma.timeCorrectionRequest.create.mockResolvedValue(createdRequest);
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post("/api/v1/time-corrections")
        .set("Authorization", `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.status).toBe(RequestStatus.PENDING);
      expect(response.body.reason).toBe(createDto.reason);
    });

    it("should return 400 when no corrections are requested", async () => {
      const createDto = {
        workSessionId: mockWorkSession.id,
        reason: "Test",
      };

      await request(app.getHttpServer())
        .post("/api/v1/time-corrections")
        .set("Authorization", `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);
    });

    it("should return 404 when work session does not exist", async () => {
      const createDto = {
        workSessionId: "non-existent",
        requestedClockIn: "2024-01-15T08:30:00Z",
        reason: "Test",
      };

      prisma.workSession.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post("/api/v1/time-corrections")
        .set("Authorization", `Bearer ${authToken}`)
        .send(createDto)
        .expect(404);
    });
  });

  describe("/api/v1/time-corrections (GET)", () => {
    it("should get correction requests for employee", async () => {
      const mockRequests = [
        {
          ...mockCorrectionRequest,
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
        },
      ];

      prisma.timeCorrectionRequest.findMany.mockResolvedValue(mockRequests);
      prisma.timeCorrectionRequest.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-corrections")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe("/api/v1/time-corrections/:id (GET)", () => {
    it("should get a specific correction request", async () => {
      const mockRequest = {
        ...mockCorrectionRequest,
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

      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(mockRequest);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/time-corrections/${mockCorrectionRequest.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(mockCorrectionRequest.id);
    });

    it("should return 404 when correction request does not exist", async () => {
      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/api/v1/time-corrections/non-existent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("/api/v1/time-corrections/:id (PUT)", () => {
    it("should update a pending correction request", async () => {
      const updateDto = {
        requestedClockIn: "2024-01-15T08:00:00Z",
        reason: "Updated reason",
      };

      const mockRequest = {
        ...mockCorrectionRequest,
        workSession: mockWorkSession,
      };

      const updatedRequest = {
        ...mockRequest,
        requestedClockIn: new Date(updateDto.requestedClockIn),
        reason: updateDto.reason,
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

      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.timeCorrectionRequest.update.mockResolvedValue(updatedRequest);
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .put(`/api/v1/time-corrections/${mockCorrectionRequest.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.reason).toBe(updateDto.reason);
    });
  });

  describe("/api/v1/time-corrections/:id (DELETE)", () => {
    it("should cancel a pending correction request", async () => {
      const mockRequest = {
        ...mockCorrectionRequest,
        userId: mockUser.id,
      };

      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.timeCorrectionRequest.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete(`/api/v1/time-corrections/${mockCorrectionRequest.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe("/api/v1/time-corrections/:id/approve (POST)", () => {
    it("should approve a correction request as admin", async () => {
      const approveDto = {
        reviewNotes: "Approved",
      };

      const mockRequest = {
        ...mockCorrectionRequest,
        workSession: mockWorkSession,
      };

      const approvedRequest = {
        ...mockRequest,
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
        reviewNotes: approveDto.reviewNotes,
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

      // Set admin user for this request
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.workSession.update.mockResolvedValue({});
      prisma.timeCorrectionRequest.update.mockResolvedValue(approvedRequest);
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post(`/api/v1/time-corrections/${mockCorrectionRequest.id}/approve`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send(approveDto)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.APPROVED);
      expect(response.body.reviewedBy).toBe(mockAdminUser.id);
    });

    it("should return 403 when employee tries to approve", async () => {
      const approveDto = {
        reviewNotes: "Approved",
      };

      await request(app.getHttpServer())
        .post(`/api/v1/time-corrections/${mockCorrectionRequest.id}/approve`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(approveDto)
        .expect(403);
    });
  });

  describe("/api/v1/time-corrections/:id/reject (POST)", () => {
    it("should reject a correction request as admin", async () => {
      const rejectDto = {
        reviewNotes: "Not enough justification",
      };

      const mockRequest = {
        ...mockCorrectionRequest,
      };

      const rejectedRequest = {
        ...mockRequest,
        status: RequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: mockAdminUser.id,
        reviewNotes: rejectDto.reviewNotes,
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

      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.timeCorrectionRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.timeCorrectionRequest.update.mockResolvedValue(rejectedRequest);
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post(`/api/v1/time-corrections/${mockCorrectionRequest.id}/reject`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send(rejectDto)
        .expect(200);

      expect(response.body.status).toBe(RequestStatus.REJECTED);
      expect(response.body.reviewNotes).toBe(rejectDto.reviewNotes);
    });

    it("should return 403 when employee tries to reject", async () => {
      const rejectDto = {
        reviewNotes: "Rejected",
      };

      await request(app.getHttpServer())
        .post(`/api/v1/time-corrections/${mockCorrectionRequest.id}/reject`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(rejectDto)
        .expect(403);
    });
  });

  describe("/api/v1/time-corrections/pending (GET)", () => {
    it("should get pending approvals for admin", async () => {
      const mockRequests = [
        {
          ...mockCorrectionRequest,
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
        },
      ];

      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.timeCorrectionRequest.findMany.mockResolvedValue(mockRequests);
      prisma.timeCorrectionRequest.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/api/v1/time-corrections/pending")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it("should return 403 when employee tries to get pending approvals", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/time-corrections/pending")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe("/api/v1/work-sessions/:id/corrections (GET)", () => {
    it("should get correction history for a work session", async () => {
      const mockRequests = [
        {
          ...mockCorrectionRequest,
          status: RequestStatus.APPROVED,
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
        },
      ];

      prisma.workSession.findFirst.mockResolvedValue(mockWorkSession);
      prisma.timeCorrectionRequest.findMany.mockResolvedValue(mockRequests);
      prisma.timeCorrectionRequest.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/work-sessions/${mockWorkSession.id}/corrections`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it("should return 404 when work session does not exist", async () => {
      prisma.workSession.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/api/v1/work-sessions/non-existent/corrections")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
