import { Chunk } from "@prisma/client";

import { prisma } from "~/db.server";

export async function findChunksByUserId(userId: string) {
  return await prisma.chunk.findMany({
    where: {
      userId,
    },
  });
}

export function createChunks(
  chunks: {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    probe: string;
    content: string;
    source: string;
    userId: string;
  }[],
) {
  return prisma.chunk.createMany({
    data: chunks,
  });
}
