import { useState, useRef, useEffect } from 'react';
import { X, Send, UserCircle, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupportTicket } from '@/hooks/use-support-ticket';
import chatIcon from '@/assets/logo_chat.png';
import { RatingStars } from '@/components/RatingStars';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Message = {
  role: 'user' | 'assistant' | 'support';
  content: string;
  created_at?: string;
};

export function Chatbot() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { blocks } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createSupportTicket, isCreating } = useSupportTicket();

  // Nettoyer le timeout de frappe au démontage
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, supportMessages]);

  // Vérifier si l'utilisateur a un ticket actif
  useEffect(() => {
    if (!user) return;

    const checkActiveTicket = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveTicket(data[0]);
        // Ouvrir automatiquement le chatbot si un ticket est actif
        setIsOpen(true);
        
        // Charger les messages du ticket
        const { data: msgs } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', data[0].id)
          .order('created_at', { ascending: true });
        
        if (msgs) {
          setSupportMessages(msgs);
        }
      }
    };

    checkActiveTicket();
  }, [user]);

  // Écouter les nouveaux messages support en temps réel
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          console.log('New support message:', payload);
          setSupportMessages(prev => [...prev, payload.new]);
          
          // Jouer un son et incrémenter le compteur si c'est un message du support et que le chat est fermé
          if (payload.new.is_from_support) {
            playNotificationSound();
            if (!isOpen) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, isOpen]);

  // Gérer l'indicateur de frappe en temps réel
  useEffect(() => {
    if (!activeTicket) return;

    const typingChannel = supabase.channel(`typing:${activeTicket.id}`);

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        // Vérifier si un utilisateur support est en train de taper
        const supportTyping = Object.values(state).some((presences: any) => 
          presences.some((p: any) => p.is_support && p.typing)
        );
        setIsUserTyping(supportTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Envoyer l'état initial (pas en train de taper)
          await typingChannel.track({
            user_id: user?.id,
            is_support: false,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [activeTicket, user]);

  // Fonction pour jouer un son de notification
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Créer une séquence de deux notes (ding-dong)
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
    playTone(800, now, 0.15);        // Première note
    playTone(600, now + 0.15, 0.15); // Deuxième note
  };

  // Écouter les changements de statut du ticket
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${activeTicket.id}`,
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          if (payload.new.status === 'resolved') {
            toast({
              title: 'Ticket résolu',
              description: 'Votre demande a été résolue.',
              duration: 4000,
            });
            setActiveTicket(null);
            setSupportMessages([]);
            setUnreadCount(0); // Réinitialiser le compteur
            // Fermer le chatbot quand le ticket est résolu
            setIsOpen(false);
          } else {
            setActiveTicket(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, toast]);

  // Ouverture automatique après 30 secondes avec message de bienvenue (une fois par session)
  useEffect(() => {
    // Vérifier si déjà ouvert dans cette session
    const hasOpenedInSession = sessionStorage.getItem('chatbot-auto-opened');
    
    if (!hasOpenedInSession) {
      const timer = setTimeout(() => {
        if (!hasAutoOpened) {
          setHasAutoOpened(true);
          setIsOpen(true);
          sessionStorage.setItem('chatbot-auto-opened', 'true');
          setMessages([{
            role: 'assistant',
            content: 'Youhouuuuuu c\'est Madame Michu, je peux vous aider ?'
          }]);
        }
      }, 30000); // 30 secondes

      return () => clearTimeout(timer);
    }
  }, [hasAutoOpened]);

  // Écouter l'événement de question depuis la recherche
  useEffect(() => {
    const handleChatbotQuestion = (e: CustomEvent) => {
      const question = e.detail;
      if (question && typeof question === 'string') {
        setIsOpen(true);
        setInput(question);
        // Auto-envoyer la question après un court délai pour laisser le chatbot s'ouvrir
        setTimeout(() => {
          setMessages([{ role: 'user', content: question }]);
          handleSendMessage(question);
        }, 300);
      }
    };

    const handleSendMessage = async (userMessage: string) => {
      setIsLoading(true);
      setInput('');
      
      try {
        const relevantContent = await searchRelevantContent(userMessage);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guide`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              message: userMessage,
              guideContent: relevantContent,
            }),
          }
        );

        if (!response.ok) throw new Error('Erreur réseau');

        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
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

    window.addEventListener('chatbot-question', handleChatbotQuestion as EventListener);
    return () => window.removeEventListener('chatbot-question', handleChatbotQuestion as EventListener);
  }, [blocks, toast]);

  const searchRelevantContent = async (query: string): Promise<string> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            query,
            topK: 15, // Augmenté à 15 pour plus de contexte
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const { results } = await response.json();
      
      if (!results || results.length === 0) {
        return 'Aucun contenu indexé trouvé. Veuillez indexer le guide.';
      }

      // Format the results
      return results
        .map((result: any, idx: number) => {
          return `[${idx + 1}] ${result.block_title} (slug: ${result.block_slug})\n${result.chunk_text}`;
        })
        .join('\n\n---\n\n');
        
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to basic content if RAG search fails
      return blocks
        .slice(0, 10)
        .map(block => `${block.title}: ${block.content.substring(0, 200)}`)
        .join('\n\n');
    }
  };

  const handleLinkClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
  };

  const renderMessageWithLinks = (content: string) => {
    // Split on markdown links [text](url) and preserve them
    const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);
    
    return parts.map((part, index) => {
      // Check for markdown link format [text](url)
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, text, url] = linkMatch;
        return (
          <button
            key={index}
            onClick={() => handleLinkClick(url)}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1 mx-1"
          >
            👉 {text.trim()}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Gérer l'indicateur de frappe
  const handleTyping = async () => {
    if (!activeTicket) return;

    const typingChannel = supabase.channel(`typing:${activeTicket.id}`);
    
    // Envoyer l'état "en train de taper"
    await typingChannel.track({
      user_id: user?.id,
      is_support: false,
      typing: true,
      online_at: new Date().toISOString(),
    });

    // Annuler le timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Réinitialiser l'état après 3 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(async () => {
      await typingChannel.track({
        user_id: user?.id,
        is_support: false,
        typing: false,
        online_at: new Date().toISOString(),
      });
    }, 3000);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Mode support : envoyer un message au ticket
    if (activeTicket) {
      try {
        const { error } = await supabase
          .from('support_messages')
          .insert({
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
          description: 'Impossible d\'envoyer le message',
          variant: 'destructive',
          duration: 4000,
        });
      }
      return;
    }

    // Mode Mme Michu
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use RAG search to find relevant content
      const relevantContent = await searchRelevantContent(input);
      console.log('Relevant content found:', relevantContent.length, 'characters');
      
      // Récupérer le pseudo de l'utilisateur
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

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0); // Réinitialiser le compteur quand on ouvre le chat
          }}
          data-chatbot-trigger
          style={{ bottom: '1.5rem', right: '1.5rem' }}
          className="fixed h-16 w-16 rounded-full shadow-lg z-50 hover:scale-110 transition-transform overflow-hidden bg-white relative"
        >
          <img 
            src={chatIcon} 
            alt="Chat" 
            className="w-full h-full pointer-events-none select-none" 
            draggable="false"
          />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div style={{ bottom: '1.5rem', right: '1.5rem' }} className="fixed w-80 h-[400px] bg-card border-2 rounded-lg shadow-xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              {activeTicket ? (
                <>
                  <Headphones className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">Support Client</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeTicket.status === 'waiting' ? 'En attente...' : 'Conseiller connecté'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <img src={chatIcon} alt="Chat" className="h-6 w-6" />
                  <h3 className="font-semibold text-sm">Mme MICHU</h3>
                </>
              )}
            </div>
            <Button onClick={() => {
              // Si un ticket est actif, demander confirmation
              if (activeTicket) {
                setShowCloseConfirm(true);
              } else {
                setIsOpen(false);
              }
            }} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {activeTicket ? (
              // Mode support - afficher d'abord l'historique Mme Michu puis les messages support
              <>
                {/* Historique de la conversation Mme Michu */}
                {activeTicket.chatbot_conversation && activeTicket.chatbot_conversation.length > 0 && (
                  <div className="mb-6">
                    <div className="text-xs text-muted-foreground text-center mb-3 py-2 border-b">
                      Conversation avec Mme MICHU
                    </div>
                    {activeTicket.chatbot_conversation.map((msg: any, idx: number) => (
                      <div
                        key={`history-${idx}`}
                        className={`mb-4 ${
                          msg.role === 'user' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div
                          className={`inline-block max-w-[80%] p-3 rounded-lg opacity-70 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages du support */}
                {supportMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-block bg-muted p-4 rounded-lg max-w-[80%]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activeTicket.status === 'waiting' 
                            ? 'Patientez quelques instants, un conseiller va se connecter...'
                            : 'Conseiller connecté - Vous pouvez échanger'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground text-center mb-3 py-2 border-b">
                      Conversation avec le support
                    </div>
                  </div>
                )}
                {supportMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.is_from_support ? 'text-left' : 'text-right'
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.is_from_support
                          ? 'bg-muted'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Mode Mme Michu
              <>
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Demandez à Mme Michu !
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.role === 'assistant'
                          ? renderMessageWithLinks(msg.content)
                          : msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="text-left">
                    <div className="inline-block bg-muted p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Support button - juste avant l'input */}
          {messages.length > 0 && !activeTicket && (
            <div className="px-4 pt-2 pb-2 border-t">
              <Button
                onClick={async () => {
                  const ticket = await createSupportTicket(messages);
                  if (ticket) {
                    // Définir le ticket actif immédiatement - PAS de toast, PAS de fermeture
                    setActiveTicket(ticket);
                    setSupportMessages([]);
                  }
                }}
                disabled={isCreating}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                {isCreating ? 'Création...' : 'Parler à un conseiller'}
              </Button>
            </div>
          )}

          {/* Indicateur de frappe */}
          {activeTicket && isUserTyping && (
            <div className="px-4 py-2 text-xs text-muted-foreground italic">
              Le conseiller est en train de taper...
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <form
              id="chatbot-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping(); // Envoyer l'état de frappe
                }}
                placeholder="Posez votre question..."
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

        </div>
      )}
      
      {/* Dialog de confirmation pour fermer le chat avec ticket actif */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Évaluer la conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Comment évalueriez-vous l'assistance reçue ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Note</p>
              <RatingStars 
                rating={ticketRating} 
                onRatingChange={setTicketRating}
                size="lg"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Commentaire (optionnel)
              </label>
              <Textarea
                value={ticketComment}
                onChange={(e) => setTicketComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setTicketRating(0);
              setTicketComment('');
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (activeTicket) {
                  // Marquer le ticket comme résolu avec évaluation
                  const { error } = await supabase
                    .from('support_tickets')
                    .update({ 
                      status: 'resolved',
                      resolved_at: new Date().toISOString(),
                      rating: ticketRating > 0 ? ticketRating : null,
                      rating_comment: ticketComment.trim() || null,
                    })
                    .eq('id', activeTicket.id);
                  
                  if (!error) {
                    setActiveTicket(null);
                    setSupportMessages([]);
                    setUnreadCount(0);
                    toast({
                      title: 'Conversation fermée',
                      description: ticketRating > 0 
                        ? 'Merci pour votre évaluation !' 
                        : 'Le ticket a été marqué comme résolu.',
                      duration: 4000,
                    });
                    // Réinitialiser le rating et le commentaire
                    setTicketRating(0);
                    setTicketComment('');
                  }
                }
                setIsOpen(false);
                setShowCloseConfirm(false);
              }}
              disabled={ticketRating === 0}
            >
              {ticketRating === 0 ? 'Sélectionnez une note' : 'Fermer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
