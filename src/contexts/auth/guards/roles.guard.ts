import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";
import { IAuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!requiredRoles?.length) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const request = context.switchToHttp().getRequest<{ user?: IAuthUser }>();
    const user = request.user;

    if (!user) {
      this.logger.warn("No user found in request");
      throw new ForbiddenException("User not authenticated");
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `User ${user.email} with role ${user.role} attempted to access endpoint requiring roles: ${requiredRoles.join(", ")}`,
      );
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
