import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../decorators/current-user.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { IAuthUser } from "../interfaces/auth-user.interface";
import { AuthResponseDto } from "../models/auth-response.dto";
import { LoginDto } from "../models/login.dto";
import { RegisterDto } from "../models/register.dto";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registration request for: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login request for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: IAuthUser): IAuthUser {
    this.logger.log(`Profile request for user: ${user.email}`);
    return user;
  }
}
