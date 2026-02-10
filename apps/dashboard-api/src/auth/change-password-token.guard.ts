/**
 * For POST /auth/change-password only: if the request has no Authorization
 * header but has body.changePasswordToken, set Authorization so JwtAuthGuard
 * can validate it. This allows server-side or proxied requests that don't
 * forward the Bearer header to still work when the client sends the token
 * in the body.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";

interface RequestWithHeadersAndBody {
  headers?: { authorization?: string };
  body?: Record<string, unknown>;
}

@Injectable()
export class ChangePasswordTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeadersAndBody>();
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return true;
    }
    const body = request.body as Record<string, unknown> | undefined;
    const token = body?.changePasswordToken;
    if (typeof token === "string" && token.trim()) {
      if (!request.headers) {
        request.headers = {};
      }
      request.headers.authorization = `Bearer ${token.trim()}`;
    }
    return true;
  }
}
