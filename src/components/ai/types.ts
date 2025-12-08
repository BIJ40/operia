/**
 * AI Unified Search 2026 - Types (Documentation only)
 */

export type AiMode = 'search' | 'chat';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'doc' | 'error' | 'action';
  data?: DocResultData | null;
}

export interface DocResultData {
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    url: string;
    source: string;
    similarity?: number;
  }>;
  answer?: string;
}

export interface AiUnifiedState {
  isExpanded: boolean;
  mode: AiMode;
  isLoading: boolean;
  messages: AiMessage[];
  error: string | null;
}
