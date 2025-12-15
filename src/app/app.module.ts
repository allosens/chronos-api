import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { HealthModule } from "@/app/health/health.module";

import { DatabaseModule } from "@/shared/database/database.module";
import { LoggerModule } from "@/shared/logger/logger.module";

import { AuthModule } from "@/contexts/auth/auth.module";
import { TimeTrackingModule } from "@/contexts/time-tracking/time-tracking.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    LoggerModule,
    HealthModule,
    AuthModule,
    TimeTrackingModule,
  ],
})
export class AppModule {}
