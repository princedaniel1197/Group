import { SiteHeader } from "@/components/SiteHeader";
import { CalendarView } from "@/components/CalendarView";
import { listPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { photos } = await listPhotos();

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 sm:px-10">
        <h2 className="mb-6 font-display text-2xl font-semibold text-cream sm:text-3xl">
          calendar
        </h2>
        <CalendarView photos={photos} />
      </main>
    </div>
  );
}
