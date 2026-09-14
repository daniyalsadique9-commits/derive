import type { ImageInput } from "@/lib/ai/schema";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Downscales a photo in the browser before upload. Phone photos are often 5+ MB; at
 * 1600px they stay perfectly readable for the model and upload in a fraction of the time.
 */
export async function compressImage(file: File): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");

  context.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black as JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

export function toDataUrl(image: { mimeType: string; data: string }): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** Reads a PDF for upload unchanged; the model reads PDFs directly. */
export async function readPdf(file: File): Promise<ImageInput> {
  if (file.size > MAX_PDF_BYTES) throw new Error("PDFs must be 4 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return { mimeType: "application/pdf", data: btoa(binary), name: file.name };
}
