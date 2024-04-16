import { Chunk } from "@prisma/client";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  json,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import cuid from "cuid";
import { useState } from "react";

import Chat from "~/components/chat/chat";
import Chunks from "~/components/data-modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createChat, findChatByUserId } from "~/models/chat.server";
import { findChunksByUserId } from "~/models/chunk.server";
import { findMessagesByChat } from "~/models/message.server";
import { createUserSession, getUserId } from "~/session.server";
import { processDocument } from "~/utils/openai";
import { scrapSingleUrl } from "~/utils/single-url";

export const meta: MetaFunction = () => [{ title: "Reasn.ai" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);

  if (!userId) {
    return await createUserSession({ request, userId: cuid() });
  }

  let chat = await findChatByUserId(userId);

  if (!chat) {
    chat = await createChat(userId);
  }

  if (!chat) {
    throw Error("Failed to create chat");
  }

  const [messages, chunks] = await Promise.all([
    findMessagesByChat(chat.id),
    findChunksByUserId(userId),
  ]);

  return json({ userId, chat, messages, chunks });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const url = String(formData.get("url"));
  const userId = await getUserId(request);

  if (!userId) {
    throw Error("Failed to get user id");
  }

  const document = await scrapSingleUrl(url);

  if (!document) {
    throw Error("Failed to scrap document");
  }

  await processDocument(document, userId);

  return json({ url });
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  // console.log("Loader data: ", data);

  return (
    <div className="flex flex-col h-screen py-4 px-20">
      <ScrapeLink chunks={data?.chunks} />
      <Chat chunks={data?.chunks} />
    </div>
  );
}

function ScrapeLink({ chunks }: { chunks: Chunk[] }) {
  const [isViewingChunksModalOpen, setIsViewingChunksModalOpen] =
    useState(false);

  return (
    <>
      <Form method="post">
        <fieldset className="flex flex-row justify-between items-center gap-4">
          <input type="hidden" name="action" value="getLinks" />
          <Input
            type="text"
            name="url"
            placeholder="Enter website url, e.g. https://example.com"
            multiple
            className="flex-1"
          />
          <Button type="submit" className="flex-none">
            Scrape website
          </Button>
          <Button
            variant={"outline"}
            type="button"
            onClick={() => {
              setIsViewingChunksModalOpen(true);
            }}
          >
            View formatted chunks
          </Button>
          <Button
            variant={"destructive"}
            type="button"
            // onClick={clearSessionId}
          >
            Clear session
          </Button>
        </fieldset>
      </Form>
      <Chunks
        chunks={chunks}
        open={isViewingChunksModalOpen}
        setOpen={setIsViewingChunksModalOpen}
      />
    </>
  );
}
