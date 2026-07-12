import { Album } from "@/components/Album";
import { listPhotos } from "@/lib/photos";

// The wall reflects live cookie/session state, so render dynamically.
export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await listPhotos();
  return <Album initial={initial} />;
}
