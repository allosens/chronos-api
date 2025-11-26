import { Logger, Module } from "@nestjs/common";

import { DatabaseModule } from "@/shared/database/database.module";

import {
  TimeEntriesController,
  TimeReportsController,
} from "./controllers/time-tracking.controller";
import { TimeTrackingService } from "./services/time-tracking.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TimeEntriesController, TimeReportsController],
  providers: [TimeTrackingService, Logger],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
