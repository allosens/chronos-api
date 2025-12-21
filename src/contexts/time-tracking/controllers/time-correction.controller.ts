import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "@/contexts/auth/decorators/current-user.decorator";
import { Roles } from "@/contexts/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "@/contexts/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/contexts/auth/guards/roles.guard";
import { type IAuthUser } from "@/contexts/auth/interfaces/auth-user.interface";

import {
  type ApproveTimeCorrectionRequestDto,
  type CreateTimeCorrectionRequestDto,
  type FilterTimeCorrectionRequestsDto,
  type RejectTimeCorrectionRequestDto,
  type TimeCorrectionRequestResponseDto,
  type TimeCorrectionRequestsListResponseDto,
  type UpdateTimeCorrectionRequestDto,
} from "../models";
import { TimeCorrectionService } from "../services/time-correction.service";

@Controller("v1/time-corrections")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeCorrectionController {
  private readonly logger = new Logger(TimeCorrectionController.name);

  constructor(
    private readonly timeCorrectionService: TimeCorrectionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCorrectionRequest(
    @CurrentUser() user: IAuthUser,
    @Body() dto: CreateTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(
      `Create time correction request for user ${user.id}, work session ${dto.workSessionId}`,
    );
    return this.timeCorrectionService.createCorrectionRequest(user, dto);
  }

  @Get()
  async getCorrectionRequests(
    @CurrentUser() user: IAuthUser,
    @Query() filters: FilterTimeCorrectionRequestsDto,
  ): Promise<TimeCorrectionRequestsListResponseDto> {
    this.logger.log(
      `Get time correction requests for company ${user.companyId}`,
    );
    return this.timeCorrectionService.getCorrectionRequests(user, filters);
  }

  @Get("pending")
  @Roles("COMPANY_ADMIN", "SUPER_ADMIN")
  async getPendingApprovals(
    @CurrentUser() user: IAuthUser,
  ): Promise<TimeCorrectionRequestsListResponseDto> {
    this.logger.log(`Get pending approvals for company ${user.companyId}`);
    return this.timeCorrectionService.getPendingApprovals(user);
  }

  @Get(":id")
  async getCorrectionRequestById(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Get time correction request ${id}`);
    return this.timeCorrectionService.getCorrectionRequestById(user, id);
  }

  @Put(":id")
  async updateCorrectionRequest(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Update time correction request ${id}`);
    return this.timeCorrectionService.updateCorrectionRequest(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelCorrectionRequest(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log(`Cancel time correction request ${id}`);
    return this.timeCorrectionService.cancelCorrectionRequest(user, id);
  }

  @Post(":id/approve")
  @Roles("COMPANY_ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  async approveCorrectionRequest(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Approve time correction request ${id}`);
    return this.timeCorrectionService.approveCorrectionRequest(user, id, dto);
  }

  @Post(":id/reject")
  @Roles("COMPANY_ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  async rejectCorrectionRequest(
    @CurrentUser() user: IAuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectTimeCorrectionRequestDto,
  ): Promise<TimeCorrectionRequestResponseDto> {
    this.logger.log(`Reject time correction request ${id}`);
    return this.timeCorrectionService.rejectCorrectionRequest(user, id, dto);
  }
}
