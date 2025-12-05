import { Logger, Module } from "@nestjs/common";

import { DatabaseModule } from "@/shared/database/database.module";

import { TimeReportsController } from "./controllers/time-reports.controller";
import { TimeTrackingController } from "./controllers/time-tracking.controller";
import { TimeTrackingService } from "./services/time-tracking.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TimeTrackingController, TimeReportsController],
  providers: [TimeTrackingService, Logger],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
