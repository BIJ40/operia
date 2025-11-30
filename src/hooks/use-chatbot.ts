import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEditor } from '@/contexts/EditorContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupportTicket } from '@/hooks/use-support-ticket';
import type { ChatContext } from '@/components/chatbot/ChatContextSelector';
import { getApogeeContext, getNoContentResponse } from '@/lib/rag-michu';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';

// Custom hook for chatbot functionality

type Message = {
  role: 'user' | 'assistant' | 'support';
  content: string;
  created_at?: string;
};

export const useChatbot = () => {
  const { user } = useAuth();
  const { blocks } = useEditor();
  const navigate = useNavigate();
  const { createSupportTicket, isCreating } = useSupportTicket();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load persisted messages from localStorage
    const saved = localStorage.getItem('chatbot-messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketComment, setTicketComment] = useState('');
  const [showChoiceMode, setShowChoiceMode] = useState(true);
  const [showTicketCreation, setShowTicketCreation] = useState(false);
  const [supportTimeout, setSupportTimeout] = useState<NodeJS.Timeout | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext>(() => {
    const saved = localStorage.getItem('chatbot-context');
    return (saved as ChatContext) || 'apogee';
  });

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Persist context to localStorage
  useEffect(() => {
    localStorage.setItem('chatbot-context', chatContext);
  }, [chatContext]);

  // Reset conversation function
  const resetConversation = () => {
    setMessages([]);
    localStorage.removeItem('chatbot-messages');
  };
  const [buttonPosition, setButtonPosition] = useState(() => {
    const saved = localStorage.getItem('chatbot-position');
    return saved ? JSON.parse(saved) : { bottom: 24, right: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastSupportMessageTimeRef = useRef<Date | null>(null);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (supportTimeout) {
        clearTimeout(supportTimeout);
      }
    };
  }, [supportTimeout]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, supportMessages]);

  // Play notification sound
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    const now = audioContext.currentTime;
    playTone(800, now, 0.15);
    playTone(600, now + 0.15, 0.15);
  };

  // Build contextual query for RAG based on conversation history
  const buildContextualQuery = (currentQuery: string, conversationHistory: Message[]): string => {
    // If conversation is short or query is substantial, use as-is
    if (conversationHistory.length < 2 || currentQuery.length > 50) {
      return currentQuery;
    }
    
    // Find the last substantive user question (longer than 15 chars)
    const previousUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .filter(c => c.length > 15);
    
    if (previousUserMessages.length === 0) {
      return currentQuery;
    }
    
    // Get the last substantive topic
    const lastTopic = previousUserMessages[previousUserMessages.length - 1];
    
    // Very short queries (< 10 chars) are always treated as follow-ups needing context
    if (currentQuery.length < 10) {
      console.log('[RAG] Very short query, using previous topic:', lastTopic.substring(0, 50));
      return lastTopic;
    }
    
    // Check if current query is a follow-up (short, generic)
    const followUpIndicators = [
      'étape', 'détail', 'plus', 'comment', 'pourquoi', 'exemple', 
      'précis', 'expliqu', 's\'il te', 's\'il vous', 'merci', 'ok',
      '?', 'oui', 'non', 'suite', 'encore', 'autre'
    ];
    
    const isFollowUp = currentQuery.length < 50 && 
      followUpIndicators.some(ind => currentQuery.toLowerCase().includes(ind));
    
    if (isFollowUp) {
      // Combine previous topic with current request
      console.log('[RAG] Follow-up detected, combining with previous topic:', lastTopic.substring(0, 50));
      return `${lastTopic} - ${currentQuery}`;
    }
    
    return currentQuery;
  };

  // Search relevant content with context-specific RAG
  const searchRelevantContent = async (query: string, context: ChatContext, conversationHistory: Message[]): Promise<{ content: string; hasContent: boolean }> => {
    // Build contextual query for better RAG retrieval
    const contextualQuery = buildContextualQuery(query, conversationHistory);
    console.log('[RAG] Contextual query:', contextualQuery);
    
    // For Apogée context, use dedicated RAG function
    if (context === 'apogee') {
      const ragResult = await getApogeeContext(contextualQuery);
      
      if (!ragResult.hasContent) {
        console.log('[CHATBOT] RAG Apogée: aucun chunk trouvé');
        return { 
          content: '', 
          hasContent: false 
        };
      }
      
      console.log(`[CHATBOT] RAG Apogée: ${ragResult.chunks.length} chunks trouvés`);
      return { 
        content: ragResult.formattedDocs, 
        hasContent: true 
      };
    }
    
    // For other contexts, use generic search via Edge Function
    const sourceMap: Record<ChatContext, string | null> = {
      'apogee': 'apogee',
      'apporteurs': null,
      'helpconfort': null,
      'autre': null,
    };
    
    const source = sourceMap[context];
    
    const result = await safeInvoke<{ results: any[] }>(
      supabase.functions.invoke('search-embeddings', {
        body: { 
          query: contextualQuery, 
          topK: 15,
          source: source
        },
      }),
      'CHAT_SEARCH_EMBEDDINGS'
    );

    if (!result.success) {
      errorToast(result.error!);
      return { content: '', hasContent: false };
    }

    const results = result.data?.results;
    if (!results || results.length === 0) {
      return { content: '', hasContent: false };
    }

    const content = results
      .map((item: any, idx: number) => {
        const metadata = item.metadata as Record<string, any> | null;
        const prefix = metadata?.categorie && metadata?.section 
          ? `[Catégorie: ${metadata.categorie} - Section: ${metadata.section}]\n`
          : '';
        return `[${idx + 1}] ${item.block_title}\n${prefix}${item.chunk_text}`;
      })
      .join('\n\n---\n\n');
      
    return { content, hasContent: true };
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Support mode - send message to existing ticket
    if (activeTicket) {
      const mutationResult = await safeMutation(
        supabase.from('support_messages').insert({
          ticket_id: activeTicket.id,
          sender_id: user!.id,
          message: input.trim(),
          is_from_support: false,
        } as any),
        'CHAT_SUPPORT_MESSAGE_CREATE'
      );

      if (!mutationResult.success) {
        errorToast(mutationResult.error!);
        return;
      }

      setInput('');
      return;
    }

    // Mme Michu mode
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ragResult = await searchRelevantContent(input, chatContext, messages);

      // For Apogée context with no RAG content, respond immediately without calling AI
      if (chatContext === 'apogee' && !ragResult.hasContent) {
        const noContentMessage = getNoContentResponse();
        setMessages((prev) => [...prev, { role: 'assistant', content: noContentMessage }]);
        setIsLoading(false);
        return;
      }

      // Get user name for AI context
      let userName = 'Utilisateur';
      if (user) {
        const profileResult = await safeQuery<{ first_name: string | null; last_name: string | null }>(
          supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle(),
          'CHAT_PROFILE_LOAD'
        );
        
        if (profileResult.success && profileResult.data?.first_name) {
          userName = profileResult.data.first_name;
        }
        // On error, keep default userName = 'Utilisateur' (no toast needed, non-critical)
      }

      // Get user's session token for authenticated edge function call
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        errorToast('Utilisateur non authentifié');
        setIsLoading(false);
        return;
      }

      // SSE streaming call - kept in try/catch (not safeInvoke)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            guideContent: ragResult.content,
            userId: user?.id || null,
            userName: userName,
            chatContext: chatContext,
            hasRagContent: ragResult.hasContent,
          }),
        }
      );

      if (!response.ok || !response.body) {
        if (response.status === 429 || response.status === 402) {
          const error = await response.json();
          errorToast(error.error || 'Limite de requêtes atteinte');
          setIsLoading(false);
          return;
        }
        throw new Error('Erreur de connexion');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      errorToast('Impossible de se connecter au chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle typing indicator
  const handleTyping = async () => {
    if (!activeTicket) return;

    const typingChannel = supabase.channel(`typing:${activeTicket.id}`);

    await typingChannel.track({
      user_id: user?.id,
      is_support: false,
      typing: true,
      online_at: new Date().toISOString(),
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await typingChannel.track({
        user_id: user?.id,
        is_support: false,
        typing: false,
        online_at: new Date().toISOString(),
      });
    }, 3000);
  };

  const handleLinkClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
  };

  // Start support timeout - recurring every minute
  const startSupportTimeout = () => {
    if (supportTimeout) {
      clearTimeout(supportTimeout);
    }

    const timeout = setTimeout(() => {
      // Check if no support message received in last 60 seconds
      const lastSupportMsg = supportMessages
        .filter(m => m.is_from_support)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (!lastSupportMsg || 
          (new Date().getTime() - new Date(lastSupportMsg.created_at).getTime()) > 60000) {
        setShowTicketCreation(true);
      }
    }, 60000); // 60 seconds
    
    setSupportTimeout(timeout);
  };

  // Handle user choosing to wait
  const handleWaitTimeout = () => {
    setShowTicketCreation(false);
    startSupportTimeout(); // Restart the timeout cycle
  };

  // Start timeout when ticket is created
  useEffect(() => {
    if (activeTicket && !showTicketCreation) {
      lastSupportMessageTimeRef.current = new Date();
      startSupportTimeout();
      
      return () => {
        if (supportTimeout) clearTimeout(supportTimeout);
      };
    }
  }, [activeTicket]);

  // Reset timeout when support responds
  useEffect(() => {
    if (activeTicket && supportMessages.length > 0) {
      const lastSupportMsg = supportMessages
        .filter(m => m.is_from_support)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (lastSupportMsg) {
        lastSupportMessageTimeRef.current = new Date(lastSupportMsg.created_at);
        setShowTicketCreation(false);
        
        if (supportTimeout) {
          clearTimeout(supportTimeout);
          setSupportTimeout(null);
        }
      }
    }
  }, [supportMessages]);

  // Create ticket from chat
  const createTicketFromChat = async (category: string, subject: string, description: string) => {
    if (!user) return;

    // Step 1: Load profile
    const profileResult = await safeQuery<{ first_name: string | null; last_name: string | null; agence: string | null }>(
      supabase
        .from('profiles')
        .select('first_name, last_name, agence')
        .eq('id', user.id)
        .maybeSingle(),
      'CHAT_PROFILE_LOAD_FOR_TICKET'
    );

    if (!profileResult.success) {
      errorToast(profileResult.error!);
      return;
    }

    const profile = profileResult.data;
    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Utilisateur';

    // Step 2: Create ticket
    const ticketResult = await safeMutation<{ id: string }>(
      supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          category,
          status: 'new',
          priority: 'normal',
          source: 'chat',
          agency_slug: profile?.agence || null,
          has_attachments: false,
          is_live_chat: false,
          escalated_from_chat: true,
          chatbot_conversation: JSON.stringify(messages),
          support_level: 1,
        } as any)
        .select()
        .single(),
      'CHAT_TICKET_CREATE'
    );

    if (!ticketResult.success) {
      errorToast(ticketResult.error!);
      return;
    }

    const ticket = ticketResult.data!;

    // Step 3: Create initial message
    const messageResult = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: description,
        is_from_support: false,
      } as any),
      'CHAT_TICKET_INITIAL_MESSAGE'
    );

    if (!messageResult.success) {
      errorToast(messageResult.error!);
      return;
    }

    // Step 4: Notify support (non-blocking, but log errors)
    const notifyResult = await safeInvoke(
      supabase.functions.invoke('notify-support-ticket', {
        body: {
          ticketId: ticket.id,
          userName,
          lastQuestion: subject,
          appUrl: window.location.origin,
          category,
          source: 'chat',
        },
      }),
      'CHAT_NOTIFY_SUPPORT_TICKET'
    );

    if (!notifyResult.success) {
      // Log but don't block - ticket is created
      console.error('[CHAT] Notification support failed:', notifyResult.error);
    }

    successToast('Votre demande a été transmise au support. Vous serez recontacté.');

    // Close chat and reset
    setIsOpen(false);
    setShowTicketCreation(false);
    setShowChoiceMode(true);
    setMessages([]);
    setActiveTicket(null);
  };

  return {
    user,
    isOpen,
    messages,
    input,
    isLoading,
    showCloseConfirm,
    activeTicket,
    supportMessages,
    unreadCount,
    isUserTyping,
    ticketRating,
    ticketComment,
    showChoiceMode,
    showTicketCreation,
    buttonPosition,
    isDragging,
    messagesEndRef,
    buttonRef,
    createSupportTicket,
    createTicketFromChat,
    isCreating,
    handleWaitTimeout,
    chatContext,
    setChatContext,
    setIsOpen,
    setInput,
    setShowCloseConfirm,
    setActiveTicket,
    setSupportMessages,
    setUnreadCount,
    setTicketRating,
    setTicketComment,
    setShowChoiceMode,
    setShowTicketCreation,
    setButtonPosition,
    setIsDragging,
    setDragOffset,
    sendMessage,
    handleTyping,
    handleLinkClick,
    playNotificationSound,
    dragOffset,
    setMessages,
    resetConversation,
  };
};
