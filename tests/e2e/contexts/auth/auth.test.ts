/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable unicorn/no-null */
import {
  ValidationPipe,
} from "@nestjs/common";
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

describe("Auth (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix("api");
    
    // Enable validation pipe for e2e tests
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await app.close();
    nock.enableNetConnect();
  });

  describe("/api/auth/register (POST)", () => {
    it("should register a new user", async () => {
      const testCompany = {
        id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
        name: "Test Company",
        slug: "test-company",
      };

      const registerDto = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
        companyId: testCompany.id,
      };

      // Mock database calls - need to spy on the actual instance
      const findUniqueUserSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const findUniqueCompanySpy = vi.spyOn(prisma.company, 'findUnique').mockResolvedValue(testCompany as any);
      const createUserSpy = vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440010", // Valid UUID
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: "EMPLOYEE",
        companyId: registerDto.companyId,
      } as any);

      const response = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(registerDto.email);

      // Restore mocks
      findUniqueUserSpy.mockRestore();
      findUniqueCompanySpy.mockRestore();
      createUserSpy.mockRestore();
    });

    it("should return 409 if user already exists", async () => {
      const registerDto = {
        email: "existing@example.com",
        password: "password123",
        firstName: "Existing",
        lastName: "User",
        companyId: "550e8400-e29b-41d4-a716-446655440001", // Valid UUID
      };

      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: "existing-user",
        email: registerDto.email,
      } as any);

      const response = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain("already exists");
      
      // Restore mock
      findUniqueSpy.mockRestore();
    });

    it("should return 400 for invalid email", async () => {
      const registerDto = {
        email: "invalid-email",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "550e8400-e29b-41d4-a716-446655440002", // Valid UUID
      };

      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(400);
    });

    it("should return 400 for short password", async () => {
      const registerDto = {
        email: "test@example.com",
        password: "short",
        firstName: "Test",
        lastName: "User",
        companyId: "550e8400-e29b-41d4-a716-446655440003", // Valid UUID
      };

      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(400);
    });
  });

  describe("/api/auth/login (POST)", () => {
    it("should login with valid credentials", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        id: "550e8400-e29b-41d4-a716-446655440004", // Valid UUID
        email: "test@example.com",
        passwordHash: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "550e8400-e29b-41d4-a716-446655440005", // Valid UUID
        isActive: true,
      };

      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(mockUser.email);

      // Restore mocks
      findUniqueSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it("should return 401 for invalid credentials", async () => {
      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      // Restore mock
      findUniqueSpy.mockRestore();
    });

    it("should return 401 for inactive user", async () => {
      const mockUser = {
        id: "550e8400-e29b-41d4-a716-446655440011", // Valid UUID
        email: "inactive@example.com",
        password: "hashedpassword",
        isActive: false,
      };

      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: "password123",
        })
        .expect(401);

      // Restore mock
      findUniqueSpy.mockRestore();
    });
  });

  describe("/api/auth/profile (GET)", () => {
    it("should return user profile when authenticated", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        id: "550e8400-e29b-41d4-a716-446655440012", // Valid UUID
        email: "test@example.com",
        passwordHash: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "550e8400-e29b-41d4-a716-446655440013", // Valid UUID
        isActive: true,
      };

      // Login first to get token
      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      const loginResponse = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: password,
        });

      const token = loginResponse.body.accessToken;

      // Get profile - need to mock the JWT validation query as well
      const profileResponse = await request(app.getHttpServer())
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);
      expect(profileResponse.body.id).toBe(mockUser.id);

      // Restore mocks
      findUniqueSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it("should return 401 when not authenticated", async () => {
      await request(app.getHttpServer()).get("/api/auth/profile").expect(401);
    });

    it("should return 401 with invalid token", async () => {
      await request(app.getHttpServer())
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });
  });
});
