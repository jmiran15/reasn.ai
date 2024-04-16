import React, { RefObject, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { copyToClipboard } from "~/utils/clipboard";

import { Loading } from "./loading";
import { useToast } from "./use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PreCode(props: { children: any }) {
  const { toast } = useToast();
  const ref = useRef<HTMLPreElement>(null);

  return (
    <>
      {/* eslint-disable-next-line react/jsx-no-leaked-render */}
      <pre ref={ref} className="group relative">
        <span
          className="copy-code-button group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto"
          onClick={() => {
            if (ref.current) {
              const code = ref.current.innerText;
              copyToClipboard(code, toast);
            }
          }}
        ></span>
        {props.children}
      </pre>
    </>
  );
}

function _MarkDownContent(props: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre: PreCode,
        p: (pProps) => <p {...pProps} dir="auto" />,
        a: (aProps) => {
          const href = aProps.href || "";
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          // eslint-disable-next-line jsx-a11y/anchor-has-content
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(_MarkDownContent);

export default function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 14}px`,
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
    >
      {props.loading ? (
        <Loading />
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
