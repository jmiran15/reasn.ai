import { Document } from "./types";

export function splitStringIntoChunks(
  document: Document,
  chunkSize: number,
): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  raw_document: string;
}[] {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0.");
  }

  const chunks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
    raw_document: string;
  }[] = [];
  let startIndex = 0;

  while (startIndex < document.content.length) {
    const endIndex = Math.min(startIndex + chunkSize, document.content.length);
    const chunk = document.content.substring(startIndex, endIndex);
    chunks.push({
      metadata: document.metadata,
      raw_document: chunk,
    });
    startIndex += chunkSize;
  }

  return chunks;
}
