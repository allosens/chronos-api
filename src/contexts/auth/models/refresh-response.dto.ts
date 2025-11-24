export class RefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // Seconds until access token expiration
}
