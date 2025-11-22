/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable unicorn/no-null */
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import * as nock from "nock";
import request from "supertest";

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
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
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
        id: "test-company-id",
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

      // Mock database calls
      prisma.user.findUnique = vi.fn().mockResolvedValue(null);
      prisma.company.findUnique = vi.fn().mockResolvedValue(testCompany);
      prisma.user.create = vi.fn().mockResolvedValue({
        id: "user-123",
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: "EMPLOYEE",
        companyId: registerDto.companyId,
      });

      const response = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(registerDto.email);
    });

    it("should return 409 if user already exists", async () => {
      const registerDto = {
        email: "existing@example.com",
        password: "password123",
        firstName: "Existing",
        lastName: "User",
        companyId: "company-123",
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue({
        id: "existing-user",
        email: registerDto.email,
      });

      const response = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain("already exists");
    });

    it("should return 400 for invalid email", async () => {
      const registerDto = {
        email: "invalid-email",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "company-123",
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
        companyId: "company-123",
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
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "company-123",
        isActive: true,
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
      prisma.user.update = vi.fn().mockResolvedValue(mockUser);

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
    });

    it("should return 401 for invalid credentials", async () => {
      prisma.user.findUnique = vi.fn().mockResolvedValue(null);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);
    });

    it("should return 401 for inactive user", async () => {
      const mockUser = {
        id: "user-123",
        email: "inactive@example.com",
        password: "hashedpassword",
        isActive: false,
      };

      prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: "password123",
        })
        .expect(401);
    });
  });

  describe("/api/auth/profile (GET)", () => {
    it("should return user profile when authenticated", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "company-123",
        isActive: true,
      };

      // Login first to get token
      prisma.user.findUnique = vi.fn().mockResolvedValue(mockUser);
      prisma.user.update = vi.fn().mockResolvedValue(mockUser);

      const loginResponse = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: password,
        });

      const token = loginResponse.body.accessToken;

      // Get profile
      const profileResponse = await request(app.getHttpServer())
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(mockUser.email);
      expect(profileResponse.body.id).toBe(mockUser.id);
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
