import { Logger, Module } from "@nestjs/common";

import { DatabaseModule } from "@/shared/database/database.module";

import { TimeCorrectionController } from "./controllers/time-correction.controller";
import { TimeReportsController } from "./controllers/time-reports.controller";
import { TimeTrackingController } from "./controllers/time-tracking.controller";
import { TimeCorrectionService } from "./services/time-correction.service";
import { TimeTrackingService } from "./services/time-tracking.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    TimeTrackingController,
    TimeReportsController,
    TimeCorrectionController,
  ],
  providers: [TimeTrackingService, TimeCorrectionService, Logger],
  exports: [TimeTrackingService, TimeCorrectionService],
})
export class TimeTrackingModule {}
