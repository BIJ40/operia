import { useState, useRef, useEffect } from 'react';
import { X, Send, UserCircle } from 'lucide-react';
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

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { blocks } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createSupportTicket, isCreating } = useSupportTicket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

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
          onClick={() => setIsOpen(true)}
          data-chatbot-trigger
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 hover:scale-110 transition-transform overflow-hidden bg-white"
        >
          <img 
            src={chatIcon} 
            alt="Chat" 
            className="w-full h-full pointer-events-none select-none" 
            draggable="false"
          />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-[400px] bg-card border-2 rounded-lg shadow-xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <img src={chatIcon} alt="Chat" className="h-6 w-6" />
              <h3 className="font-semibold text-sm">Mme MICHU</h3>
            </div>
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
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
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Support button - visible si messages existent */}
          {messages.length > 0 && (
            <div className="px-4 pb-2 border-t pt-2">
              <Button
                onClick={async () => {
                  const ticketId = await createSupportTicket(messages);
                  if (ticketId) {
                    setMessages([]);
                    setIsOpen(false);
                    toast({
                      title: 'Ticket créé',
                      description: 'Un conseiller va vous contacter rapidement.',
                    });
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
                onChange={(e) => setInput(e.target.value)}
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
    </>
  );
}
