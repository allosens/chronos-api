import { Controller, Get, HttpCode, Inject, Logger } from "@nestjs/common";
import { PrismaService } from "@/shared/database/prisma.service";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(Logger) private readonly logger: Logger,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HttpCode(200)
  async run() {
    this.logger.log("Health endpoint called!");
    
    // Check database health
    const dbHealth = await this.prisma.healthCheck();
    
    return { 
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }

  @Get('db')
  @HttpCode(200)
  async database() {
    this.logger.log("Database health endpoint called!");
    return await this.prisma.healthCheck();
  }
}
