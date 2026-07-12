import { SiteHeader } from "@/components/SiteHeader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ProfileEditor } from "@/components/ProfileEditor";
import { getProfile, getPersonPhotos } from "@/lib/profiles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ name: string }> };

function fmtDob(dob: string): string {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return dob;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtMonth(date: string): string {
  const d = new Date(date.length === 7 ? date + "-01" : date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default async function PersonPage({ params }: Params) {
  const { name } = await params;
  const [profile, photos] = await Promise.all([
    getProfile(name),
    getPersonPhotos(name),
  ]);
  const milestones = (profile?.milestones ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 sm:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-safelight/15 font-display text-2xl font-semibold text-safelight">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2 className="font-display text-3xl font-semibold text-cream sm:text-4xl">
                {name}
              </h2>
              <p className="mt-1 font-mono text-[11px] tracking-widest text-cream-muted uppercase">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
                {profile?.dob ? ` · born ${fmtDob(profile.dob)}` : ""}
              </p>
            </div>
          </div>
          <ProfileEditor
            name={name}
            intro={profile?.intro ?? null}
            dob={profile?.dob ?? null}
            milestones={profile?.milestones ?? []}
          />
        </div>

        {profile?.intro ? (
          <p className="mb-8 max-w-2xl font-hand text-2xl leading-snug text-cream/90">
            {profile.intro}
          </p>
        ) : null}

        {milestones.length > 0 ? (
          <section className="mb-10">
            <h3 className="mb-4 font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              milestones
            </h3>
            <ol className="space-y-3 border-l border-line pl-5">
              {milestones.map((m, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[23px] h-2.5 w-2.5 rounded-full bg-safelight" />
                  <span className="font-mono text-[11px] tracking-wide text-safelight-dim">
                    {m.date ? fmtMonth(m.date) : ""}
                  </span>
                  <p className="text-cream">{m.text}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <h3 className="mb-4 border-b border-line pb-2 font-display text-xl font-semibold text-cream">
          photos
        </h3>
        {photos.length > 0 ? (
          <PhotoGallery photos={photos} />
        ) : (
          <p className="font-hand text-2xl text-cream-muted">
            no photos of {name} yet.
          </p>
        )}
      </main>
    </div>
  );
}
