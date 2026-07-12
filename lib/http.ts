import { ZodError } from "zod";

/**
 * Consistent JSON envelope for API routes.
 * Success: { success: true, data }. Error: { success: false, error }.
 */

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data }, init);
}

export function fail(
  error: string,
  status = 400,
  init?: ResponseInit,
): Response {
  return Response.json(
    { success: false, error },
    { ...init, status },
  );
}

export const unauthorized = () => fail("Contributor passphrase required", 401);
export const forbidden = (msg = "Not allowed") => fail(msg, 403);
export const notFound = (msg = "Not found") => fail(msg, 404);
export const tooMany = (retryAfter: number) =>
  fail("Too many requests — slow down a moment.", 429, {
    headers: { "Retry-After": String(retryAfter) },
  });

/**
 * Turn a thrown error into a safe Response. Zod issues become 400s with a
 * readable message; everything else is a generic 500 (details stay server-side).
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path.join(".");
    const msg = first ? `${path ? path + ": " : ""}${first.message}` : "Invalid request";
    return fail(msg, 400);
  }
  // Log server-side; never leak internals to the client.
  console.error("[keepsake] unhandled route error:", error);
  return fail("Something went wrong", 500);
}
