import { prisma } from "~/db.server";

export async function findChatByUserId(userId: string) {
  return await prisma.chat.findUnique({
    where: {
      userId,
    },
  });
}

export async function createChat(userId: string) {
  return await prisma.chat.create({
    data: {
      userId,
    },
  });
}
