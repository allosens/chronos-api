import { Logger } from "@nestjs/common";

import { createMock, Mock } from "@/tests/utils/mock";

import { AuthController } from "@/contexts/auth/controllers/auth.controller";
import { AuthService } from "@/contexts/auth/services/auth.service";
import { LoginDto } from "@/contexts/auth/models/login.dto";
import { RegisterDto } from "@/contexts/auth/models/register.dto";
import { IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

describe("AuthController", () => {
  let authController: AuthController;
  let authService: Mock<AuthService>;
  let logger: Mock<Logger>;

  beforeEach(() => {
    authService = createMock<AuthService>();
    logger = createMock<Logger>();
    authController = new AuthController(authService);
    authController["logger"] = logger;
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const registerDto: RegisterDto = {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        companyId: "company-123",
      };

      const expectedResponse = {
        accessToken: "mock-token",
        user: {
          id: "user-123",
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: "EMPLOYEE",
          companyId: registerDto.companyId,
        },
      };

      authService.register.mockResolvedValue(expectedResponse);

      const result = await authController.register(registerDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(logger.log).toHaveBeenCalledWith(
        `Registration request for: ${registerDto.email}`,
      );
    });
  });

  describe("login", () => {
    it("should login a user with valid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const expectedResponse = {
        accessToken: "mock-token",
        user: {
          id: "user-123",
          email: loginDto.email,
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          companyId: "company-123",
        },
      };

      authService.login.mockResolvedValue(expectedResponse);

      const result = await authController.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(logger.log).toHaveBeenCalledWith(
        `Login request for: ${loginDto.email}`,
      );
    });
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const mockUser: IAuthUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        companyId: "company-123",
      };

      const result = await authController.getProfile(mockUser);

      expect(result).toEqual(mockUser);
      expect(logger.log).toHaveBeenCalledWith(
        `Profile request for user: ${mockUser.email}`,
      );
    });
  });
});
