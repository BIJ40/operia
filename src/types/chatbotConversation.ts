/**
 * Zod schema for chatbot_conversation JSONB field validation
 * SUP-P1-05: Type-safe chatbot conversation handling
 */

import { z } from 'zod';

// Message schema
export const ChatbotMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'support', 'system']),
  content: z.string(),
  created_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Full conversation schema
export const ChatbotConversationSchema = z.array(ChatbotMessageSchema);

// Infer TypeScript types from schemas
export type ChatbotMessage = z.infer<typeof ChatbotMessageSchema>;
export type ChatbotConversation = z.infer<typeof ChatbotConversationSchema>;

/**
 * Safely parse chatbot_conversation from database JSONB
 * Returns empty array if invalid or null
 */
export function parseChatbotConversation(data: unknown): ChatbotConversation {
  if (!data) return [];
  
  // Handle JSON string
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  
  // Validate with Zod
  const result = ChatbotConversationSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  
  // Fallback: try to extract valid messages from array
  if (Array.isArray(data)) {
    return data.filter((item): item is ChatbotMessage => {
      const check = ChatbotMessageSchema.safeParse(item);
      return check.success;
    });
  }
  
  return [];
}

/**
 * Format conversation for saving to database
 */
export function formatConversationForDB(messages: Array<{ role: string; content: string }>): ChatbotConversation {
  return messages.map(m => ({
    role: m.role as ChatbotMessage['role'],
    content: m.content,
    created_at: new Date().toISOString(),
  }));
}
