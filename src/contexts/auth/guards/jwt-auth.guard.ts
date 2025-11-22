import { Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
  ): TUser {
    if (err ?? !user) {
      this.logger.warn(
        `JWT authentication failed: ${info?.message ?? "Unknown error"}`,
      );
      throw err ?? new Error("Unauthorized");
    }
    return user;
  }
}
