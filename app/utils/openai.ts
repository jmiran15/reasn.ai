import { Chunk } from "@prisma/client";
import OpenAI from "openai";

import { createChunks } from "~/models/chunk.server";

import { splitStringIntoChunks } from "./ingestion";
import {
  createChunksPrompt,
  selectionSystemPrompt,
  systemFinalContext,
} from "./prompts";
import { Document } from "./types";

const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

const MODEL = "gpt-4-turbo";

export async function chat(
  query: string,
  chunks: Chunk[],
): Promise<string | null> {
  const userPrompt = `List of probes:\n${chunks
    .map((chunk) => `${chunk.id}: ${chunk.probe}`)
    .join("\n")}\n\nQuestion: ${query}`;

  console.log(
    "Probes: ",
    chunks.map((chunk) => `${chunk.id}: ${chunk.probe}`).join("\n"),
  );

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: selectionSystemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0,
    max_tokens: 3500,
    model: MODEL,
  });

  if (!completion.choices[0].message.content) {
    return "";
  }

  const output = JSON.parse(completion.choices[0].message.content);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunkIds = output.map((chunk: any) => chunk.chunk_id);

  const selectedChunks = chunks.filter((chunk) => chunkIds.includes(chunk.id));

  console.log("selectedChunks", selectedChunks);

  //"List of possibly relevant chunks:\nchunk_source_url: chunk_contents\n\nQuery: ...\n\n"

  const chunkString = selectedChunks
    .map((chunk) => `${chunk.source}: ${chunk.content}`)
    .join("\n");

  console.log("chunkString", chunkString);

  const userFinalPrompt = `List of possibly relevant chunks:\n${chunkString}\n\nQuery: ${query}`;

  const finalCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemFinalContext,
      },
      {
        role: "user",
        content: userFinalPrompt,
      },
    ],
    temperature: 0,
    max_tokens: 3500,
    model: MODEL,
  });

  console.log("messages sent to open ai and response: ", [
    {
      role: "system",
      content: systemFinalContext,
    },
    {
      role: "user",
      content: userFinalPrompt,
    },
    {
      role: "assistant",
      content: finalCompletion.choices[0].message.content,
    },
  ]);

  return finalCompletion.choices[0].message.content;
}

export async function processDocument(document: Document, userId: string) {
  const stringChunks = splitStringIntoChunks(document, 15000);

  for (const chunk of stringChunks) {
    const formattedChunk = `{\n"raw_document":"${chunk}"\n}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: createChunksPrompt,
        },
        {
          role: "user",
          content: formattedChunk,
        },
      ],
      temperature: 0,
      max_tokens: 3500,
      model: MODEL,
    });

    if (
      !completion.choices[0].message.content ||
      completion.choices[0].finish_reason === "length"
    ) {
      return [];
    }

    const output = JSON.parse(completion.choices[0].message.content);

    const playgroundChunks = output.map(
      (chunk: { probe: string; raw_chunk: string }) => ({
        probe: chunk.probe,
        content: chunk.raw_chunk,
        source: document.metadata.sourceURL,
        userId,
      }),
    );

    await createChunks(playgroundChunks);
  }
}
