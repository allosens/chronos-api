import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    // Create PostgreSQL connection pool using ConfigService
    // Use DIRECT_URL for tests or fallback to DATABASE_URL
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const databaseUrl =
      nodeEnv === "test"
        ? (this.configService.get<string>("DIRECT_URL") ??
          this.configService.get<string>("DATABASE_URL"))
        : this.configService.get<string>("DATABASE_URL");

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required. Please set it in your environment variables.",
      );
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
    });

    // Create Prisma PostgreSQL adapter
    const adapter = new PrismaPg(this.pool);

    // Initialize Prisma Client with adapter
    this.prisma = new PrismaClient({
      adapter,
      log: ["info", "warn", "error"],
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log("Successfully connected to database");
    } catch (error) {
      this.logger.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
      await this.pool.end();
      this.logger.log("Successfully disconnected from database");
    } catch (error) {
      this.logger.error("Failed to disconnect from database:", error);
    }
  }

  // Proxy all Prisma client properties - New Schema
  get company() {
    return this.prisma.company;
  }
  get user() {
    return this.prisma.user;
  }
  get employee() {
    return this.prisma.employee;
  }
  get companySetting() {
    return this.prisma.companySetting;
  }
  get workSession() {
    return this.prisma.workSession;
  }
  get break() {
    return this.prisma.break;
  }
  get absenceRequest() {
    return this.prisma.absenceRequest;
  }
  get timeCorrectionRequest() {
    return this.prisma.timeCorrectionRequest;
  }
  get invoice() {
    return this.prisma.invoice;
  }
  get invoiceItem() {
    return this.prisma.invoiceItem;
  }
  get auditLog() {
    return this.prisma.auditLog;
  }
  get passwordResetToken() {
    return this.prisma.passwordResetToken;
  }

  // Proxy utility methods
  get $connect() {
    return this.prisma.$connect.bind(this.prisma);
  }
  get $disconnect() {
    return this.prisma.$disconnect.bind(this.prisma);
  }
  get $queryRaw() {
    return this.prisma.$queryRaw.bind(this.prisma);
  }
  get $executeRaw() {
    return this.prisma.$executeRaw.bind(this.prisma);
  }
  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  /**
   * Helper method to ensure multi-tenant isolation
   * Always use this when you need to filter by company
   */
  withCompanyScope(companyId: string) {
    return {
      where: {
        companyId,
      },
    };
  }

  /**
   * Health check for the database connection
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        message: "Database connection is working",
      };
    } catch (error) {
      this.logger.error("Database health check failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown database error";
      return {
        status: "unhealthy",
        message: `Database connection failed: ${errorMessage}`,
      };
    }
  }
}
