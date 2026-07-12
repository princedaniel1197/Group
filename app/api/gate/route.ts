import { z } from "zod";
import { cookies } from "next/headers";
import {
  passphraseMatches,
  signContributorToken,
  newClientId,
  contributorCookieOptions,
  clientIdCookieOptions,
} from "@/lib/gate";
import { COOKIE_CONTRIBUTOR, COOKIE_CLIENT_ID } from "@/lib/constants";
import { ok, fail, tooMany, errorResponse } from "@/lib/http";
import { checkRateLimit, ipFrom } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ passphrase: z.string().min(1) });

/**
 * POST /api/gate
 * Verifies the shared passphrase (constant-time) and, on success, sets the
 * signed contributor cookie + a client_id cookie if absent (§6).
 */
export async function POST(request: Request) {
  try {
    // Throttle passphrase attempts per IP to blunt brute-force guessing.
    const rl = checkRateLimit(`gate:${ipFrom(request)}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) return tooMany(rl.retryAfter);

    const { passphrase } = schema.parse(await request.json());

    if (!passphraseMatches(passphrase)) {
      return fail("Incorrect passphrase", 401);
    }

    const store = await cookies();
    store.set(
      COOKIE_CONTRIBUTOR,
      signContributorToken(),
      contributorCookieOptions(),
    );
    if (!store.get(COOKIE_CLIENT_ID)) {
      store.set(COOKIE_CLIENT_ID, newClientId(), clientIdCookieOptions());
    }

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
