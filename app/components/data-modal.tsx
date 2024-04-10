export default function ChunksModal({
  chunks,
  open,
  setOpen,
}: {
  chunks: PlaygroundChunk[];
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const cancelButtonRef = useRef(null);

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
                <div className="sm:flex sm:items-start flex-col">
                  <div className="m-3 text-center sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      These are the chunks that have been extracted from all
                      scraped urls and that can be used by your chatbot
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500">
                      You have a total of {chunks.length} chunks
                    </p>
                  </div>
                  {chunks.length === 0 ? (
                    <p className="p-4">No chunks yet</p>
                  ) : (
                    <ol className="space-y-4 ">
                      {chunks.map((chunk) => (
                        <ChunkCard key={chunk.id} chunk={chunk} />
                      ))}
                    </ol>
                  )}
                  <Button
                    variant={"ghost"}
                    onClick={() => setOpen(false)}
                    ref={cancelButtonRef}
                  >
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
