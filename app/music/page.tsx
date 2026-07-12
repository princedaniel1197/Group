import { SiteHeader } from "@/components/SiteHeader";
import { MusicClient } from "@/components/MusicClient";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const [playlist, jam] = await Promise.all([
    getSetting("spotify_playlist"),
    getSetting("spotify_jam"),
  ]);

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16 sm:px-10">
        <h2 className="font-display text-2xl font-semibold text-cream sm:text-3xl">
          the playlist
        </h2>
        <p className="mt-1 mb-6 font-hand text-2xl text-cream-muted">
          our top OG tracks — a keepsake of its own.
        </p>
        <MusicClient playlist={playlist} jam={jam} />
      </main>
    </div>
  );
}
