import { z } from "zod";
import { getProfile, upsertProfile } from "@/lib/profiles";
import { ok, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ name: string }> };

const milestoneSchema = z.object({
  date: z.string().trim().max(20),
  text: z.string().trim().min(1).max(200),
});

const putSchema = z.object({
  intro: z.string().trim().max(1000).nullish(),
  dob: z.string().trim().max(20).nullish(),
  milestones: z.array(milestoneSchema).max(50).default([]),
});

/** GET /api/profiles/[name] — the person's profile (or null). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { name } = await params;
    return ok(await getProfile(name));
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/profiles/[name] (open) — create/update a profile. */
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { name } = await params;
    const data = putSchema.parse(await request.json());
    const profile = await upsertProfile(name, {
      intro: data.intro?.trim() ? data.intro.trim() : null,
      dob: data.dob?.trim() ? data.dob.trim() : null,
      milestones: data.milestones
        .filter((m) => m.text.trim())
        .map((m) => ({ date: m.date.trim(), text: m.text.trim() })),
    });
    return ok(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
