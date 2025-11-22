import { IAuthUser } from "../interfaces/auth-user.interface";

export class AuthResponseDto {
  accessToken!: string;
  user!: IAuthUser;
}
