const Markdown = lazy(() => import("~/components/ui/markdown"));

import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Dialog, Transition } from "@headlessui/react";
import { useLoaderData } from "@remix-run/react";
import cuid from "cuid";

import {
  PlaygroundChat,
  PlaygroundChunk,
  PlaygroundMessage,
} from "@prisma/client";

import { formatDistanceToNow, format } from "date-fns";
import {
  useEffect,
  useState,
  useRef,
  Fragment,
  Suspense,
  lazy,
  useMemo,
} from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getDocuments } from "~/utils/webscraper/scrape";
import { Document } from "~/utils/types";
import {
  createManyPlaygroundChunks,
  getAllPlaygroundChunks,
} from "~/models/playgroundchunk.server";
import { getPlaygroundChat } from "~/models/playgroundchat.server";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import ChatInput from "~/components/chat/chat-input";

import { ScrollArea } from "~/components/ui/scroll-area";
import { ChatAction } from "~/components/chat/chat-action";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { useToast } from "~/components/ui/use-toast";
import { cn } from "~/lib/utils";
import { copyToClipboard } from "~/utils/clipboard";
import { Separator } from "~/components/ui/separator";
import { Clipboard } from "lucide-react";
import { useScrollToBottom } from "~/hooks/useScroll";
import { useMobileScreen } from "~/utils/mobile";
import { Loading } from "~/components/ui/loading";
import OpenAI from "openai";

import { createUserSession, getUserId } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Reasn.ai" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);

  if (!userId) {
    return await createUserSession({ request, userId: cuid() });
  }

  return json({ userId });

  const messages = await getPlaygroundChat();
  const allPlaygroundChunks = await getAllPlaygroundChunks();
  console.log("playgroundChat", messages);
  console.log("allPlaygroundChunks", allPlaygroundChunks);

  return json({
    messages,
    allPlaygroundChunks,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = String(formData.get("action"));

  switch (action) {
    case "getLinks": {
      const url = String(formData.get("url"));
      return json({ links: await getLinks(url) });
    }
    case "scrapeLinks": {
      const links = JSON.parse(String(formData.get("links")));

      const scrapedDocuments = await scrapeLinks(links);
      console.log("scrapedDocuments", scrapedDocuments);

      // 43 seconds ??
      const chunks = await processRawDocuments(scrapedDocuments);

      return json({ links: [] });
    }
    default: {
      throw new Error(`Invalid action: ${action}`);
    }
  }
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  console.log(data?.userId);

  return <div>main</div>;
}

export const CHAT_PAGE_SIZE = 15;

export default function Playground() {
  //   if (typeof window === "undefined") return null;

  //   const { sessionId } = useSessionId();
  const [chunks, setChunks] = useState<PlaygroundChunk[]>([]);
  const [chat, setChat] = useState<PlaygroundChat | null>(null);
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);

  useEffect(() => {
    // if (sessionId) {
    //   Promise.all([
    //     getPlaygroundChunksBySessionId(sessionId),
    //     getPlaygroundChatBySessionId(sessionId),
    //   ]).then(([chunks, chat]) => {
    //     setChunks(chunks);
    //     setChat(chat);
    //   });
    // }
  }, []);

  return (
    <div>
      <ChunkExtraction chunks={chunks} setChunks={setChunks} />
      <Chat />
    </div>
  );
}

function ChunkExtraction({
  chunks,
  setChunks,
}: {
  chunks: PlaygroundChunk[];
  setChunks: (value: PlaygroundChunk[]) => void;
}) {
  //   const { clearSessionId } = useSessionId();
  const [links, setLinks] = useState<[] | Document[]>([]);
  const [isScrapingWebsiteModalOpen, setIsScrapingWebsiteModalOpen] =
    useState(false);
  const [isViewingChunksModalOpen, setIsViewingChunksModalOpen] =
    useState(false);

  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.formData) {
      const action = fetcher.formData.get("action");

      if (action === "getLinks") {
        if (fetcher.data) {
          setLinks(fetcher.data.links);
          setIsScrapingWebsiteModalOpen(true);
        }
      } else if (action === "scrapeLinks") {
        if (fetcher.data) {
          // console.log("fetcher data documents", fetcher.data);
          setIsScrapingWebsiteModalOpen(false);
          setLinks([]);
        }
      }
    }

    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      // loading
    }

    if (fetcher.state === "idle") {
      // done
    }
  }, [fetcher.state]);

  return (
    <>
      <fetcher.Form method="post">
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
              setIsScrapingWebsiteModalOpen(false);
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
      </fetcher.Form>

      <ScrapeWebsiteModal
        open={isScrapingWebsiteModalOpen}
        setOpen={setIsScrapingWebsiteModalOpen}
        links={links}
        setChunks={setChunks}
      />
      <ChunksModal
        chunks={chunks}
        open={isViewingChunksModalOpen}
        setOpen={setIsViewingChunksModalOpen}
      />
    </>
  );
}

// get rid of this. Scrape one url at a time
function ScrapeWebsiteModal({
  open,
  setOpen,
  links,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  links: Document[];
}) {
  const cancelButtonRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDocuments, setFilteredDocuments] = useState(links);

  useEffect(() => {
    setFilteredDocuments(
      links.filter((link) =>
        link
          .metadata!.sourceURL!.toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, links]);

  // Handler for row selection
  const onSelectionChanged = (params) => {
    const selectedNodes = params.api.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    setSelectedRows(selectedData);
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        initialFocus={cancelButtonRef}
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-3/5 sm:p-6 w-full">
                <div className="sm:flex sm:items-start">
                  <div className="m-3 text-center sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Select the links you would like to add
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        You can select the links you would like to add to your
                        chatbot
                      </p>
                    </div>
                    <Input
                      type="text"
                      className="mt-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by Source URL"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Currently showing {filteredDocuments.length} links
                    </p>
                    <div className="ag-theme-alpine w-full h-96 mt-2">
                      <AgGridReact
                        rowData={filteredDocuments}
                        columnDefs={columnDefs}
                        rowSelection="multiple"
                        onSelectionChanged={onSelectionChanged}
                        rowMultiSelectWithClick={true}
                      ></AgGridReact>
                    </div>
                  </div>
                </div>

                <Form method="post" action="/playground">
                  <input type="hidden" name="action" value="scrapeLinks" />
                  <input
                    type="hidden"
                    name="links"
                    value={JSON.stringify(selectedRows)}
                  />
                  <Button type="submit" variant={"default"}>
                    Scrape
                  </Button>
                </Form>
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={() => setOpen(false)}
                  ref={cancelButtonRef}
                >
                  Cancel
                </Button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
