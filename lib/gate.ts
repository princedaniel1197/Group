import "server-only";
import { createHmac, timingSafeEqual, randomUUID, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import {
  COOKIE_CONTRIBUTOR,
  COOKIE_CLIENT_ID,
  CONTRIBUTOR_MAX_AGE,
  CLIENT_ID_MAX_AGE,
} from "./constants";

/**
 * Auth / gate model (spec §6).
 * - Viewing is public.
 * - Posting/deleting require the shared passphrase, proven by a signed,
 *   HTTP-only contributor cookie.
 * - A non-secret client_id cookie scopes "delete own" and "one heart each".
 */

const SIG_SEP = ".";

function hmac(payload: string): string {
  return createHmac("sha256", env.cookieSecret).update(payload).digest("hex");
}

/** Create a signed contributor token: `<issuedAtMs>.<hmac>`. */
export function signContributorToken(issuedAt: number = Date.now()): string {
  const payload = String(issuedAt);
  return `${payload}${SIG_SEP}${hmac(payload)}`;
}

/** Verify a contributor token: valid signature and not older than max age. */
export function verifyContributorToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(SIG_SEP);
  if (idx <= 0) return false;

  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = hmac(payload);

  // Constant-time signature comparison.
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return false;
  return Date.now() - issuedAt < CONTRIBUTOR_MAX_AGE * 1000;
}

/** Constant-time passphrase comparison (§6, §10). */
export function passphraseMatches(submitted: string): boolean {
  // Hash both to a fixed length so we never leak length via timing.
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(env.contributorPassphrase).digest();
  return timingSafeEqual(a, b);
}

export function newClientId(): string {
  return randomUUID();
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const contributorCookieOptions = () => ({
  ...cookieBase,
  maxAge: CONTRIBUTOR_MAX_AGE,
});

export const clientIdCookieOptions = () => ({
  ...cookieBase,
  maxAge: CLIENT_ID_MAX_AGE,
});

// --- request-scoped helpers (read cookies from the incoming request) ---

/** True if the request carries a valid contributor cookie. */
export async function isContributor(): Promise<boolean> {
  const store = await cookies();
  return verifyContributorToken(store.get(COOKIE_CONTRIBUTOR)?.value);
}

/** The requester's client id, if any (may be absent for public viewers). */
export async function getClientId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_CLIENT_ID)?.value ?? null;
}

export { COOKIE_CONTRIBUTOR, COOKIE_CLIENT_ID };
