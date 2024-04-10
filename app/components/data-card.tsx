export default function ChunkCard({ chunk }: { chunk: PlaygroundChunk }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center">
          <div className="font-semibold">{chunk.probe}</div>
          <div className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(chunk.createdAt), {
              addSuffix: true,
            })}
          </div>
        </div>
      </div>
      <div className="line-clamp-2 text-xs text-muted-foreground">
        {chunk.content}
      </div>
    </div>
  );
}
