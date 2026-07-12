import exifr from "exifr";
import {
  DISPLAY_MAX_EDGE,
  DISPLAY_QUALITY,
  THUMB_MAX_EDGE,
  THUMB_QUALITY,
} from "./constants";

/**
 * Client-side image pipeline (spec §7, runs in the browser).
 *
 * 1. Read EXIF `DateTimeOriginal` from the RAW file first (for `takenAt`).
 * 2. Re-encode a display image and a thumbnail through a canvas.
 *    Canvas re-encoding strips ALL EXIF, including GPS — this is the privacy
 *    mechanism (§10). We never upload the raw file.
 */

export interface ProcessedImage {
  display: Blob;
  thumb: Blob;
  width: number; // display image dimensions
  height: number;
  takenAt: Date | null;
}

/** Read the capture date from EXIF before we destroy it by re-encoding. */
async function readTakenAt(file: File): Promise<Date | null> {
  try {
    const data = await exifr.parse(file, { pick: ["DateTimeOriginal"] });
    const value = data?.DateTimeOriginal;
    return value instanceof Date && !Number.isNaN(value.getTime())
      ? value
      : null;
  } catch {
    // No/unreadable EXIF — that's fine, takenAt stays null.
    return null;
  }
}

async function canvasToJpeg(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas encoding failed")),
      "image/jpeg",
      quality,
    );
  });
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("Could not get 2D canvas context");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvasToJpeg(canvas, quality);
  return { blob, width, height };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const takenAt = await readTakenAt(file);

  // `from-image` bakes EXIF orientation into pixels (we're about to drop EXIF).
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const display = await encode(bitmap, DISPLAY_MAX_EDGE, DISPLAY_QUALITY);
    const thumb = await encode(bitmap, THUMB_MAX_EDGE, THUMB_QUALITY);
    return {
      display: display.blob,
      thumb: thumb.blob,
      width: display.width,
      height: display.height,
      takenAt,
    };
  } finally {
    bitmap.close();
  }
}
