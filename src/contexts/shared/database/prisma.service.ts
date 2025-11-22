import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;
  private pool: Pool;

  constructor() {
    // Create PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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

  // Proxy all Prisma client properties
  get company() {
    return this.prisma.company;
  }
  get user() {
    return this.prisma.user;
  }
  get project() {
    return this.prisma.project;
  }
  get projectMember() {
    return this.prisma.projectMember;
  }
  get timeEntry() {
    return this.prisma.timeEntry;
  }
  get report() {
    return this.prisma.report;
  }
  get invitation() {
    return this.prisma.invitation;
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
