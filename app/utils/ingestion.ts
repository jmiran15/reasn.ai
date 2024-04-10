async function processRawDocuments(
  documents: Document[],
): Promise<Partial<PlaygroundChunk>[]> {
  //   const totalChunks: Partial<PlaygroundChunk>[] = [];

  for (const document of documents) {
    // split the content into chunks of 15,000 characters
    const stringChunks = splitStringIntoChunks(document, 15000);

    console.log("stringChunks", stringChunks);

    // how do I await this

    for (const chunk of stringChunks) {
      const formattedChunk = `{\n"raw_document":"${chunk}"\n}`;

      // move this to openai
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
          sessionId: "1234",
        }),
      );

      console.log("playgroundChunks", playgroundChunks);

      const createdChunks = await createManyPlaygroundChunks(playgroundChunks);

      console.log("createdChunks", createdChunks);
    }
  }

  return [];
}

export function splitStringIntoChunks(
  document: Document,
  chunkSize: number,
): string[] {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0.");
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < document.content.length) {
    const endIndex = Math.min(startIndex + chunkSize, document.content.length);
    const chunk = document.content.substring(startIndex, endIndex);
    chunks.push(chunk);
    startIndex += chunkSize;
  }

  return chunks;
}
