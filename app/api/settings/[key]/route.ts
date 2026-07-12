import { z } from "zod";
import { getSetting, setSetting } from "@/lib/settings";
import { ok, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string }> };

const putSchema = z.object({ value: z.string().trim().max(500).nullable() });

/** GET /api/settings/[key] — read a setting. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    return ok({ value: await getSetting(key) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/settings/[key] (open) — set a setting. */
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    const { value } = putSchema.parse(await request.json());
    await setSetting(key, value && value.length > 0 ? value : null);
    return ok({ value });
  } catch (error) {
    return errorResponse(error);
  }
}
