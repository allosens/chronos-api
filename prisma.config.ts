// Chronos API - Prisma 7.0 Configuration
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Note: directUrl is not supported in Prisma 7.x datasource config
    // Using the direct URL for migrations is handled automatically
  },
});
