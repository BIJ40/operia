export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  is_archived: boolean;
  is_pinned: boolean;
  last_message_at: string | null;
  // Joined data
  members?: ConversationMember[];
  last_message?: Message;
  unread_count?: number;
  other_user?: UserInfo; // For DM conversations
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  is_muted: boolean;
  last_read_at: string | null;
  // Joined user data
  user?: UserInfo;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  // Joined data
  sender?: UserInfo;
}

export interface UserInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  color?: string | null;
  bgcolor?: string | null;
}

export interface TypingStatus {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
  user?: UserInfo;
}

export interface NewConversationData {
  type: 'dm' | 'group';
  name?: string;
  member_ids: string[];
}
