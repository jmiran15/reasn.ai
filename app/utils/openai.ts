import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

const MODEL = "gpt-4"; // get from env

// should also have an api for data ingestion -> api/ingest

// turn this into api route with event source streaming -> api/chat
async function chat(query: string, allPlaygroundChunks: any): string {
  // 1. get all the chunk probes and format them to be send to OpenAI
  // 2. send to openai with query to select useful probes
  // 3. search for those probe ids in db, and return the chunks
  // 4. Use the chunks along with the same CONTEXT PROMPT to get final answer.

  console.log("allPlaygroundChunks", allPlaygroundChunks);
  const userPrompt = `List of probes:\n${allPlaygroundChunks
    .map((chunk) => `${chunk.id}: ${chunk.probe}`)
    .join("\n")}\n\nQuestion: ${query}`;

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

  const chunkIds = output.map((chunk) => chunk.chunk_id);

  const selectedChunks = allPlaygroundChunks.filter((chunk) =>
    chunkIds.includes(chunk.id),
  );

  console.log("selectedChunks", selectedChunks);

  // the format of the string must be

  //"List of possibly relevant chunks:\nchunk_source_url: chunk_contents\n\nQuery: ...\n\n"

  const chunkString = selectedChunks
    .map((chunk) => `${chunk.source}: ${chunk.content}`)
    .join("\n");

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

  return finalCompletion.choices[0].message.content;
}
