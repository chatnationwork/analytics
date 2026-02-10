import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { Request } from "express";
import { AuthService } from "./auth.service";

const GLOBAL_PREFIX = "api/dashboard";

/** Routes allowed when org requires 2FA and user has not set it (only 2FA setup and profile). */
const ALLOWED_WHEN_2FA_REQUIRED: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/auth/me" },
  { method: "GET", path: "/auth/2fa/status" },
  { method: "PATCH", path: "/auth/2fa" },
  { method: "POST", path: "/auth/2fa/send-setup-code" },
  { method: "POST", path: "/auth/2fa/verify-setup" },
  { method: "GET", path: "/tenants/current" },
  { method: "PATCH", path: "/tenants/current" },
];

function normalizePath(url: string): string {
  const path = url.split("?")[0] ?? url;
  if (path.startsWith("/")) {
    return path.startsWith(`/${GLOBAL_PREFIX}`)
      ? path.slice(GLOBAL_PREFIX.length + 1) || "/"
      : path;
  }
  return path;
}

@Injectable()
export class TwoFactorEnforcementInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id?: string } | undefined;

    if (!user?.id) {
      return next.handle();
    }
    // API-key–authenticated requests use a placeholder id, not a real user; skip 2FA check
    if (user.id === "system-api-key") {
      return next.handle();
    }

    const required = await this.authService.is2FaSetupRequired(user.id);
    if (!required) {
      return next.handle();
    }

    const path = normalizePath(request.url ?? request.path ?? "");
    const method = request.method;
    const allowed = ALLOWED_WHEN_2FA_REQUIRED.some(
      (a) => a.method === method && path === a.path,
    );

    if (allowed) {
      return next.handle();
    }

    throw new ForbiddenException({
      message:
        "Your organization requires two-factor authentication. Please set up 2FA in Settings → Security to continue.",
      code: "TWO_FACTOR_SETUP_REQUIRED",
    });
  }
}
