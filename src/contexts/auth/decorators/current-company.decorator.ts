import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { IAuthUser } from "../interfaces/auth-user.interface";

export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: IAuthUser }>();
    return request.user?.companyId;
  },
);
