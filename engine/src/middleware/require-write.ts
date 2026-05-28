import type { Context } from "hono";

export interface WriteHeaders {
  xForwardedUser?: string | null;
  authorization?: string | null;
}

/**
 * Resolve the actor allowed to perform a write.
 * - A non-empty `X-Forwarded-User` (set by Traefik forward-auth on the
 *   gated /engine path) authorizes the request as that SSO user.
 * - Otherwise a matching `Authorization: Bearer <F4L_BEARER_TOKEN>`
 *   authorizes a machine caller (webhooks/CLI).
 * Returns the actor string, or null when unauthorized.
 */
export function resolveWriteActor(
  headers: WriteHeaders,
  expectedToken: string,
): string | null {
  const user = (headers.xForwardedUser ?? "").trim();
  if (user) return user;
  if (expectedToken && headers.authorization === `Bearer ${expectedToken}`) {
    return "machine";
  }
  return null;
}

/**
 * Hono helper: returns the actor or null. Callers return 401 on null.
 */
export function writeActor(c: Context): string | null {
  return resolveWriteActor(
    {
      xForwardedUser: c.req.header("x-forwarded-user"),
      authorization: c.req.header("authorization"),
    },
    process.env.F4L_BEARER_TOKEN ?? "",
  );
}
