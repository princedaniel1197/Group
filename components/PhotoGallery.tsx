"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wall } from "./Wall";
import { Lightbox } from "./Lightbox";
import type { PhotoDTO } from "@/lib/types";

/** A photo list rendered as the masonry wall with a working lightbox. */
export function PhotoGallery({ photos }: { photos: PhotoDTO[] }) {
  const [selected, setSelected] = useState<PhotoDTO | null>(null);
  const router = useRouter();

  return (
    <>
      <Wall photos={photos} onOpen={setSelected} />
      <Lightbox
        key={selected?.id ?? "none"}
        photo={selected}
        onClose={() => setSelected(null)}
        onRequireGate={() => {}}
        onChanged={() => router.refresh()}
      />
    </>
  );
}
