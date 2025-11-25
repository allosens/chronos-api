import { IAuthUser } from "../interfaces/auth-user.interface";

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // Seconds until access token expiration
  user!: IAuthUser;
}
