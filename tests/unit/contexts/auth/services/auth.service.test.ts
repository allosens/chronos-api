/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable unicorn/no-null */
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { createMock, Mock } from "@/tests/utils/mock";

import { PrismaService } from "@/shared/database/prisma.service";

import { LoginDto } from "@/contexts/auth/models/login.dto";
import { RegisterDto } from "@/contexts/auth/models/register.dto";
import { AuthService } from "@/contexts/auth/services/auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let prismaService: Mock<PrismaService>;
  let jwtService: Mock<JwtService>;

  beforeEach(() => {
    prismaService = createMock<PrismaService>({
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      } as any,
      company: {
        findUnique: vi.fn(),
      } as any,
    });
    jwtService = createMock<JwtService>();
    authService = new AuthService(prismaService, jwtService);
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const registerDto: RegisterDto = {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "company-123",
      };

      const mockCompany = {
        id: "company-123",
        name: "Test Company",
        slug: "test-company",
      };

      const mockUser = {
        id: "user-123",
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: "EMPLOYEE",
        companyId: registerDto.companyId,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(null);
      (prismaService.company.findUnique as any).mockResolvedValue(mockCompany);
      (prismaService.user.create as any).mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue("mock-jwt-token");

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty("accessToken", "mock-jwt-token");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe(registerDto.email);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prismaService.company.findUnique).toHaveBeenCalledWith({
        where: { id: registerDto.companyId },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it("should throw ConflictException if user already exists", async () => {
      const registerDto: RegisterDto = {
        email: "existing@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "company-123",
      };

      const existingUser = {
        id: "user-123",
        email: registerDto.email,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(existingUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException if company does not exist", async () => {
      const registerDto: RegisterDto = {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "invalid-company",
      };

      (prismaService.user.findUnique as any).mockResolvedValue();
      (prismaService.company.findUnique as any).mockResolvedValue();

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.company.findUnique).toHaveBeenCalledWith({
        where: { id: registerDto.companyId },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);

      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        passwordHash: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "company-123",
        isActive: true,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(mockUser);
      (prismaService.user.update as any).mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue("mock-jwt-token");

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty("accessToken", "mock-jwt-token");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe(loginDto.email);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const loginDto: LoginDto = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      (prismaService.user.findUnique as any).mockResolvedValue();

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user is inactive", async () => {
      const loginDto: LoginDto = {
        email: "inactive@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        passwordHash: "hashedpassword",
        isActive: false,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const hashedPassword = await bcrypt.hash("correctpassword", 10);

      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        passwordHash: hashedPassword,
        isActive: true,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("validateUser", () => {
    it("should return user if valid and active", async () => {
      const userId = "user-123";
      const mockUser = {
        id: userId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "company-123",
        isActive: true,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.validateUser(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe(mockUser.email);
    });

    it("should return undefined if user not found", async () => {
      (prismaService.user.findUnique as any).mockResolvedValue();

      const result = await authService.validateUser("nonexistent-user");

      expect(result).toBeUndefined();
    });

    it("should return undefined if user is inactive", async () => {
      const mockUser = {
        id: "user-123",
        isActive: false,
      };

      (prismaService.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.validateUser("user-123");

      expect(result).toBeUndefined();
    });
  });
});
