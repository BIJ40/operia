import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditor } from '@/contexts/EditorContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ouverture automatique après 10 secondes avec message de bienvenue
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAutoOpened) {
        setHasAutoOpened(true);
        setIsOpen(true);
        setMessages([{
          role: 'assistant',
          content: 'Youhouuuuuu c\'est Madame Michu, je peux vous aider ?'
        }]);
      }
    }, 10000); // 10 secondes

    return () => clearTimeout(timer);
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
        const guideContent = prepareGuideContent();
        
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
              guideContent,
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

  const prepareGuideContent = () => {
    let content = '';
    
    // Guide Apogée (depuis blocks)
    content += '# Guide d\'utilisation Apogée\n\n';
    content += blocks
      .map((block) => {
        if (block.type === 'category') {
          return `## ${block.title} (slug: ${block.slug})\n${block.content || ''}`;
        } else if (block.type === 'section') {
          const parent = blocks.find(b => b.id === block.parentId);
          return `### ${block.title} (catégorie: ${parent?.slug}, section: ${block.slug})\n${block.content || ''}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    
    // Apporteurs Nationaux (depuis localStorage)
    const apporteursData = localStorage.getItem('apporteursNationauxData');
    if (apporteursData) {
      try {
        const data = JSON.parse(apporteursData);
        content += '\n\n# Guide des apporteurs nationaux\n\n';
        content += (data.categories || [])
          .map((cat: any) => `## ${cat.title}\n${cat.content || ''}`)
          .join('\n\n');
      } catch (e) {
        console.error('Error parsing apporteurs data:', e);
      }
    }
    
    // Informations Utiles (depuis localStorage)
    const infosData = localStorage.getItem('informationsUtilesData');
    if (infosData) {
      try {
        const data = JSON.parse(infosData);
        content += '\n\n# Informations utiles\n\n';
        content += (data.categories || [])
          .map((cat: any) => `## ${cat.title}\n${cat.content || ''}`)
          .join('\n\n');
      } catch (e) {
        console.error('Error parsing infos data:', e);
      }
    }
    
    return content;
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
      const guideContent = prepareGuideContent();
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
            guideContent,
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
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-card border-2 rounded-lg shadow-xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <img src={chatIcon} alt="Chat" className="h-8 w-8" />
              <h3 className="font-semibold">Mme MICHU</h3>
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
