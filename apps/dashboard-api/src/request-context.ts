/**
 * Minimal request shape for extracting IP and user-agent.
 * Works with Fastify (and Express) without importing express.
 */
export interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export function getRequestContext(req: RequestLike): {
  ip?: string;
  userAgent?: string;
} {
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : undefined) ||
    req.ip ||
    req.socket?.remoteAddress ||
    undefined;
  const userAgent =
    (req.headers?.["user-agent"] as string | undefined) || undefined;
  return { ip, userAgent };
}
