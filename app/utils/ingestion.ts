import { Document } from "./types";

export function splitStringIntoChunks(
  document: Document,
  chunkSize: number,
): string[] {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0.");
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < document.content.length) {
    const endIndex = Math.min(startIndex + chunkSize, document.content.length);
    const chunk = document.content.substring(startIndex, endIndex);
    chunks.push(chunk);
    startIndex += chunkSize;
  }

  return chunks;
}
