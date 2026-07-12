"use client";

import { Print } from "./Print";
import type { PhotoDTO } from "@/lib/types";

interface WallProps {
  photos: PhotoDTO[];
  onOpen: (photo: PhotoDTO) => void;
}

/**
 * Masonry wall via CSS columns — prints keep their natural heights and flow
 * into balanced columns (§9). Responsive: 1 → 2 → 3 → 4 columns.
 */
export function Wall({ photos, onOpen }: WallProps) {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
      {photos.map((photo) => (
        <Print key={photo.id} photo={photo} onOpen={onOpen} />
      ))}
    </div>
  );
}
