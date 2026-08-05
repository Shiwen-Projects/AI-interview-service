export interface GeneratedQuestion {
  question: string;
}

export interface DeepSeekStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

export interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
