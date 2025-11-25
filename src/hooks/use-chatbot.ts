import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEditor } from '@/contexts/EditorContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupportTicket } from '@/hooks/use-support-ticket';

// Custom hook for chatbot functionality

type Message = {
  role: 'user' | 'assistant' | 'support';
  content: string;
  created_at?: string;
};

export const useChatbot = () => {
  const { user } = useAuth();
  const { blocks } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createSupportTicket, isCreating } = useSupportTicket();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketComment, setTicketComment] = useState('');
  const [showChoiceMode, setShowChoiceMode] = useState(true);
  const [buttonPosition, setButtonPosition] = useState(() => {
    const saved = localStorage.getItem('chatbot-position');
    return saved ? JSON.parse(saved) : { bottom: 24, right: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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

  // Search relevant content
  const searchRelevantContent = async (query: string): Promise<string> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query, topK: 15 }),
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const { results } = await response.json();
      if (!results || results.length === 0) {
        return 'Aucun contenu indexé trouvé.';
      }

      return results
        .map((result: any, idx: number) => {
          return `[${idx + 1}] ${result.block_title} (slug: ${result.block_slug})\n${result.chunk_text}`;
        })
        .join('\n\n---\n\n');
    } catch (error) {
      console.error('Search error:', error);
      return blocks
        .slice(0, 10)
        .map((block) => `${block.title}: ${block.content.substring(0, 200)}`)
        .join('\n\n');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Support mode
    if (activeTicket) {
      try {
        const { error } = await supabase.from('support_messages').insert({
          ticket_id: activeTicket.id,
          sender_id: user!.id,
          message: input.trim(),
          is_from_support: false,
        } as any);

        if (error) throw error;
        setInput('');
      } catch (error) {
        console.error('Error sending support message:', error);
        toast({
          title: 'Erreur',
          description: "Impossible d'envoyer le message",
          variant: 'destructive',
          duration: 4000,
        });
      }
      return;
    }

    // Mme Michu mode
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const relevantContent = await searchRelevantContent(input);

      let userPseudo = 'Utilisateur';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pseudo')
          .eq('id', user.id)
          .single();
        userPseudo = profile?.pseudo || user.email?.split('@')[0] || 'Utilisateur';
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            guideContent: relevantContent,
            userId: user?.id || null,
            userPseudo: userPseudo,
          }),
        }
      );

      if (!response.ok || !response.body) {
        if (response.status === 429 || response.status === 402) {
          const error = await response.json();
          toast({
            title: 'Erreur',
            description: error.error,
            variant: 'destructive',
            duration: 4000,
          });
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
      toast({
        title: 'Erreur',
        description: 'Impossible de se connecter au chatbot',
        variant: 'destructive',
        duration: 4000,
      });
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
    buttonPosition,
    isDragging,
    messagesEndRef,
    buttonRef,
    createSupportTicket,
    isCreating,
    setIsOpen,
    setInput,
    setShowCloseConfirm,
    setActiveTicket,
    setSupportMessages,
    setUnreadCount,
    setTicketRating,
    setTicketComment,
    setShowChoiceMode,
    setButtonPosition,
    setIsDragging,
    setDragOffset,
    sendMessage,
    handleTyping,
    handleLinkClick,
    playNotificationSound,
    dragOffset,
    setMessages,
  };
};
