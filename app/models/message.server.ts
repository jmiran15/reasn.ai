import { prisma } from "~/db.server";

export function findMessagesByChat(chatId: string) {
  return prisma.message.findMany({
    where: {
      chatId,
    },
    orderBy: {
      id: "asc",
    },
  });
}
