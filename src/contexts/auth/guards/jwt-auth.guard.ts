import { Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`JWT authentication failed: ${info?.message || "Unknown error"}`);
      throw err || new Error("Unauthorized");
    }
    return user;
  }
}
