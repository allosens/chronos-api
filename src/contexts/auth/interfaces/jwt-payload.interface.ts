export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  companyId: string;
  iat?: number;
  exp?: number;
}
