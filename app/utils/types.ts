export class Document {
  id?: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  type?: string;
  provider: string;
  metadata: {
    sourceURL?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };

  constructor(data: Partial<Document>) {
    if (!data.content) {
      throw new Error("Missing required fields");
    }
    this.content = data.content;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.type = data.type || "unknown";
    this.provider = data.provider || "unknown";
    this.metadata = data.metadata || { sourceURL: "" };
  }
}

export interface Message {
  role: "user" | "assistant";
  content: string | null;
  createdAt: Date;
  pending?: boolean;
  userMessage?: string;
  animate?: boolean;
}
