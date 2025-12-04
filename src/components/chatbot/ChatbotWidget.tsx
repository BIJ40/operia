import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, RotateCcw, BookOpen, Users, Building2, HelpCircle, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getApogeeContext, getNoContentResponse } from '@/lib/rag-michu';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatContext = 'apogee' | 'apporteurs' | 'helpconfort' | 'autre' | 'support';

const themes = [
  { id: 'apogee' as ChatContext, label: 'Apogée', icon: BookOpen },
  { id: 'apporteurs' as ChatContext, label: 'Apporteurs', icon: Users },
  { id: 'helpconfort' as ChatContext, label: 'HelpConfort', icon: Building2 },
  { id: 'autre' as ChatContext, label: 'Autre', icon: HelpCircle },
  { id: 'support' as ChatContext, label: 'Support en direct', icon: Headphones },
];

export function ChatbotWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ChatContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetConversation = () => {
    setMessages([]);
    setSelectedContext(null);
  };

  const handleSelectTheme = (theme: ChatContext) => {
    if (theme === 'support') {
      // Navigate to support page and close chatbot
      setIsOpen(false);
      navigate('/support/mes-demandes');
    } else {
      setSelectedContext(theme);
    }
  };

  const handleContactSupport = () => {
    setIsOpen(false);
    navigate('/support/mes-demandes');
  };

  const buildContextualQuery = (currentQuery: string, conversationHistory: Message[]): string => {
    if (conversationHistory.length < 2 || currentQuery.length > 50) {
      return currentQuery;
    }
    
    const previousUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .filter(c => c.length > 15);
    
    if (previousUserMessages.length === 0) {
      return currentQuery;
    }
    
    const lastTopic = previousUserMessages[previousUserMessages.length - 1];
    
    if (currentQuery.length < 10) {
      return lastTopic;
    }
    
    const followUpIndicators = [
      'étape', 'détail', 'plus', 'comment', 'pourquoi', 'exemple', 
      'précis', 'expliqu', 's\'il te', 's\'il vous', 'merci', 'ok',
      '?', 'oui', 'non', 'suite', 'encore', 'autre'
    ];
    
    const isFollowUp = currentQuery.length < 50 && 
      followUpIndicators.some(ind => currentQuery.toLowerCase().includes(ind));
    
    if (isFollowUp) {
      return `${lastTopic} - ${currentQuery}`;
    }
    
    return currentQuery;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const contextualQuery = buildContextualQuery(input, messages);
      const ragResult = await getApogeeContext(contextualQuery);

      if (!ragResult.hasContent) {
        const noContentMessage = getNoContentResponse();
        setMessages((prev) => [...prev, { role: 'assistant', content: noContentMessage }]);
        setIsLoading(false);
        return;
      }

      let userName = 'Utilisateur';
      if (user) {
        const profileResult = await safeQuery<{ first_name: string | null }>(
          supabase
            .from('profiles')
            .select('first_name')
            .eq('id', user.id)
            .maybeSingle(),
          'CHATBOT_WIDGET_PROFILE'
        );
        
        if (profileResult.success && profileResult.data?.first_name) {
          userName = profileResult.data.first_name;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Erreur: utilisateur non authentifié' }]);
        setIsLoading(false);
        return;
      }

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
            guideContent: ragResult.formattedDocs,
            userId: user?.id || null,
            userName: userName,
            chatContext: selectedContext || 'apogee',
            hasRagContent: true,
          }),
        }
      );

      if (!response.ok || !response.body) {
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
      logError('chatbot-widget', 'Chat error', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasUserSentMessage = messages.some(m => m.role === 'user');

  return (
    <div className="relative">
      {/* Simple button with label */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200",
          "bg-primary/10 hover:bg-primary/20 border border-primary/20",
          isOpen && "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          isOpen ? "text-primary-foreground" : "text-primary"
        )}>
          Aide en direct
        </span>
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute top-full left-0 mt-2 w-[380px] bg-background border rounded-xl shadow-2xl overflow-hidden z-50",
          "transition-all duration-300 ease-out origin-top-left",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Mme Michu
          </h3>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetConversation}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[400px] flex flex-col">
          {!selectedContext && messages.length === 0 ? (
            /* Theme selector - single line items */
            <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-6">
              <div className="text-center mb-2">
                <h4 className="font-semibold text-base">Votre demande concerne :</h4>
              </div>

              <div className="w-full space-y-1.5">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isSupport = theme.id === 'support';
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme.id)}
                      className={cn(
                        "w-full group border rounded-lg px-3 py-2 transition-all duration-200 flex items-center gap-3",
                        isSupport 
                          ? "border-helpconfort-orange/40 bg-helpconfort-orange/5 hover:bg-helpconfort-orange/10 hover:border-helpconfort-orange/60"
                          : "border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/60"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        isSupport
                          ? "bg-helpconfort-orange/10 group-hover:bg-helpconfort-orange/20"
                          : "bg-background border border-border group-hover:border-primary/40"
                      )}>
                        <Icon className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          isSupport
                            ? "text-helpconfort-orange"
                            : "text-muted-foreground group-hover:text-primary"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium text-sm",
                        isSupport && "text-helpconfort-orange"
                      )}>
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Chat interface */
            <>
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Posez votre question à Mme Michu !
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={cn(
                        "inline-block max-w-[85%] p-3 rounded-lg text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
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

              <div className="p-3 border-t space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tapez votre message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {hasUserSentMessage && (
                  <button
                    onClick={handleContactSupport}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    <Headphones className="w-3 h-3" />
                    Contacter le support
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
