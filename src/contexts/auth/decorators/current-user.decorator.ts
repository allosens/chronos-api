import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { IAuthUser } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IAuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: IAuthUser }>();
    return request.user;
  },
);
