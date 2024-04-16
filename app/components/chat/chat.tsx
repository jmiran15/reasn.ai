import { Chunk } from "@prisma/client";
import { format } from "date-fns";
import { Clipboard } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useScrollToBottom } from "~/hooks/use-scroll";
import { cn } from "~/lib/utils";
import { copyToClipboard } from "~/utils/clipboard";
import { useMobileScreen } from "~/utils/mobile";
import { selectionSystemPrompt, systemFinalContext } from "~/utils/prompts";
import { Message } from "~/utils/types";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { Loading } from "../ui/loading";
import Markdown from "../ui/markdown";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { useToast } from "../ui/use-toast";

import { ChatAction } from "./chat-action";
import ChatInput from "./chat-input";
import { chat } from "~/utils/openai";

const CHAT_PAGE_SIZE = 15;

export default function Chat({ chunks }: { chunks: Chunk[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInput, setUserInput] = useState("");
  const { scrollRef, setAutoScroll, scrollDomToBottom } = useScrollToBottom();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! How can I help you today?",
      createdAt: new Date(),
    },
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userInput || userInput === "") return false;

    const prevChatHistory = [
      ...messages,
      {
        role: "user" as const,
        content: userInput,
        createdAt: new Date(),
      },
      {
        role: "assistant" as const,
        content: "",
        pending: true,
        userMessage: userInput,
        animate: true,
        createdAt: new Date(),
      },
    ];

    setMessages(prevChatHistory);
    setUserInput("");
    setIsSubmitting(true);
  };

  useEffect(() => {
    async function fetchReply() {
      const promptMessage =
        messages.length > 0 ? messages[messages.length - 1] : null;
      const remHistory = messages.length > 0 ? messages.slice(0, -1) : [];

      if (!promptMessage || !promptMessage?.userMessage) {
        setIsSubmitting(false);
        return false;
      }

      const chatResult = await chat(promptMessage.userMessage, chunks);

      setMessages([
        ...remHistory,
        {
          role: "assistant" as const,
          content: chatResult,
          createdAt: new Date(),
        },
      ]);

      return;
    }

    isSubmitting === true && fetchReply();
  }, [isSubmitting, messages, chunks]);

  const { toast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, messages.length - CHAT_PAGE_SIZE),
  );

  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(messages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const msgs = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      messages.length,
    );
    return messages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, messages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom = bottomHeight >= e.scrollHeight - 10;

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setAutoScroll(isHitBottom);
  };

  const isMobileScreen = useMobileScreen();

  function scrollToBottom() {
    setMsgRenderIndex(messages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  return (
    <div className="flex flex-col relative grow">
      <ScrollArea
        ref={scrollRef}
        className="flex-1 overflow-auto overflow-x-hidden relative overscroll-none pb-10 pt-4"
        onMouseDown={() => inputRef.current?.blur()}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        <div className="space-y-5">
          {msgs.map((message, i) => {
            const isUser = message.role === "user";
            const showActions = i > 0;

            return (
              <div className="space-y-5" key={i}>
                <div
                  className={
                    isUser
                      ? "flex flex-row-reverse"
                      : "flex flex-row last:animate-[slide-in_ease_0.3s]"
                  }
                >
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div
                        className={cn(
                          "max-w-[80%] flex flex-col items-start",
                          isUser && "items-end",
                        )}
                      >
                        <div
                          className={cn(
                            "box-border max-w-full text-sm select-text relative break-words rounded-lg px-3 py-2",
                            isUser
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <Suspense fallback={<Loading />}>
                            <Markdown
                              content={message.content ?? ""}
                              loading={
                                // eslint-disable-next-line react/jsx-no-leaked-render
                                isSubmitting && !isUser && message.pending
                              }
                              onDoubleClickCapture={() => {
                                if (!isMobileScreen) return;
                                setUserInput(message.content ?? "");
                              }}
                              parentRef={scrollRef}
                              defaultShow={i >= msgs.length - 6}
                            />
                          </Suspense>
                        </div>
                        <div className="text-xs text-muted-foreground opacity-80 whitespace-nowrap text-right w-full box-border pointer-events-none z-[1]">
                          {format(message.createdAt, "M/d/yyyy, h:mm:ss a")}
                        </div>
                      </div>
                    </HoverCardTrigger>
                    {showActions ? (
                      <HoverCardContent
                        side="top"
                        align={isUser ? "end" : "start"}
                        className="py-1 px-0 w-fit"
                      >
                        <div className="flex items-center divide-x">
                          <>
                            <ChatAction
                              text={"Copy"}
                              icon={<Clipboard className="w-4 h-4" />}
                              onClick={() =>
                                copyToClipboard(message.content ?? "", toast)
                              }
                            />
                          </>
                        </div>
                      </HoverCardContent>
                    ) : (
                      <></>
                    )}
                  </HoverCard>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <Separator />
      <div className="relative w-full box-border flex-col pt-2.5 p-5 space-y-2 ">
        <ChatInput
          userInput={userInput}
          setUserInput={setUserInput}
          inputRef={inputRef}
          handleSendMessage={handleSubmit}
          scrollToBottom={scrollToBottom}
          setAutoScroll={setAutoScroll}
        />
      </div>
    </div>
  );
}
