import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { companyId?: string } }>();
    return request.user?.companyId;
  },
);
