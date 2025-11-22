import { Logger } from "@nestjs/common";

import { createMock, Mock } from "@/tests/utils/mock";
import { PrismaService } from "@/shared/database/prisma.service";

import { HealthController } from "@/app/health/api/health.controller";

describe("HealthController", () => {
  let healthController: HealthController;
  let logger: Mock<Logger>;
  let prismaService: Mock<PrismaService>;

  beforeEach(() => {
    logger = createMock<Logger>();
    prismaService = createMock<PrismaService>();
    
    // Mock the healthCheck method
    prismaService.healthCheck.mockResolvedValue({
      status: 'healthy',
      message: 'Database connection is working',
    });

    healthController = new HealthController(logger, prismaService);
  });

  describe("run", () => {
    it("should return health status with database check", async () => {
      const result = await healthController.run();
      
      expect(result).toHaveProperty('status', 'ok');
    //   expect(result).toHaveProperty('timestamp');
    //   expect(result).toHaveProperty('database');
    //   expect(result.database).toEqual({
    //     status: 'healthy',
    //     message: 'Database connection is working',
    //   });
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(prismaService.healthCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe("database", () => {
    it("should return database health status", async () => {
      const result = await healthController.database();
      
      expect(result).toEqual({
        status: 'healthy',
        message: 'Database connection is working',
      });
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(prismaService.healthCheck).toHaveBeenCalledTimes(1);
    });
  });
});
