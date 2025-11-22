import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { createMock, Mock } from "@/tests/utils/mock";

import { RolesGuard } from "@/contexts/auth/guards/roles.guard";

describe("RolesGuard", () => {
  let rolesGuard: RolesGuard;
  let reflector: Mock<Reflector>;

  beforeEach(() => {
    reflector = createMock<Reflector>();
    rolesGuard = new RolesGuard(reflector);
  });

  it("should allow access when no roles are required", () => {
    const context = createMock<ExecutionContext>();

    reflector.getAllAndOverride.mockReturnValue(null);

    const result = rolesGuard.canActivate(context);

    expect(result).toBe(true);
  });

  it("should allow access when user has required role", () => {
    const context = createMock<ExecutionContext>();
    const mockRequest = {
      user: {
        id: "user-123",
        email: "admin@example.com",
        role: "ADMIN",
        companyId: "company-123",
      },
    };

    reflector.getAllAndOverride.mockReturnValue(["ADMIN", "MANAGER"]);
    context.switchToHttp.mockReturnValue({
      getRequest: () => mockRequest,
    } as any);

    const result = rolesGuard.canActivate(context);

    expect(result).toBe(true);
  });

  it("should deny access when user does not have required role", () => {
    const context = createMock<ExecutionContext>();
    const mockRequest = {
      user: {
        id: "user-123",
        email: "employee@example.com",
        role: "EMPLOYEE",
        companyId: "company-123",
      },
    };

    reflector.getAllAndOverride.mockReturnValue(["ADMIN", "MANAGER"]);
    context.switchToHttp.mockReturnValue({
      getRequest: () => mockRequest,
    } as any);

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("should deny access when user is not authenticated", () => {
    const context = createMock<ExecutionContext>();
    const mockRequest = {
      user: null,
    };

    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    context.switchToHttp.mockReturnValue({
      getRequest: () => mockRequest,
    } as any);

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("should allow access when empty roles array", () => {
    const context = createMock<ExecutionContext>();

    reflector.getAllAndOverride.mockReturnValue([]);

    const result = rolesGuard.canActivate(context);

    expect(result).toBe(true);
  });
});
