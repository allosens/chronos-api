import { randomBytes } from "node:crypto";

import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { PrismaService } from "@/shared/database/prisma.service";

import { IAuthUser } from "../interfaces/auth-user.interface";
import { IJwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthResponseDto } from "../models/auth-response.dto";
import { LoginDto } from "../models/login.dto";
import { RefreshResponseDto } from "../models/refresh-response.dto";
import { RegisterDto } from "../models/register.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRATION = 600; // 10 minutes in seconds
  private readonly REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: registerDto.companyId },
    });

    if (!company) {
      throw new ConflictException("Company not found");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.SALT_ROUNDS,
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        companyId: registerDto.companyId,
        role: "EMPLOYEE", // Default role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
      },
    });

    this.logger.log(`User registered successfully: ${user.email}`);

    if (!user.companyId) {
      throw new Error("User creation failed: companyId is required");
    }

    // Generate tokens
    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`User attempting login: ${loginDto.email}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        isActive: true,
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${loginDto.email}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      this.logger.warn(`Login failed: User inactive - ${loginDto.email}`);
      throw new UnauthorizedException("User account is inactive");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${loginDto.email}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in successfully: ${user.email}`);

    if (!user.companyId) {
      throw new UnauthorizedException(
        "User account is incomplete: missing company assignment",
      );
    }

    // Generate tokens
    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async validateUser(userId: string): Promise<IAuthUser | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        isActive: true,
      },
    });

    if (!user?.isActive || !user.companyId) {
      return;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
    };
  }

  async refreshTokens(refreshToken: string): Promise<RefreshResponseDto> {
    this.logger.log("Attempting to refresh tokens");

    // Find the refresh token in the database
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: {
          gt: new Date(),
        },
        isRevoked: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            isActive: true,
          },
        },
      },
    });

    if (!storedToken) {
      this.logger.warn("Refresh token invalid or expired");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = storedToken.user;

    if (!user.isActive || !user.companyId) {
      this.logger.warn(
        `Refresh failed: User inactive or missing company - ${storedToken.userId}`,
      );
      throw new UnauthorizedException("User account is invalid");
    }

    // Revoke the old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    this.logger.log(`Tokens refreshed successfully for user: ${user.email}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Generate a random token
    const token = randomBytes(32).toString("hex");

    // Calculate expiration date
    const expiresAt = new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRATION * 1000,
    );

    // Store the refresh token in the database
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        isRevoked: false,
      },
    });

    return token;
  }

  private generateToken(user: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  }): string {
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return this.jwtService.sign(payload);
  }
}
