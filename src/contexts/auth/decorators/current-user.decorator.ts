import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { IAuthUser } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IAuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
