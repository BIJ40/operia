/**
 * SimplifiedSupportChat.tsx
 * Chatbox simplifié V3 : Questions d'orientation → RAG → Proposition ticket
 * 
 * Flux:
 * 1. Questions d'orientation (2-3 questions)
 * 2. Recherche RAG et réponse IA
 * 3. Proposition: Clore le chat OU Créer un ticket
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeInvoke, safeMutation } from '@/lib/safeQuery';
import { logError, logDebug } from '@/lib/logger';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { getApogeeContext, getNoContentResponse } from '@/lib/rag-michu';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Send, 
  Loader2, 
  Bot, 
  User as UserIcon,
  MessageSquarePlus,
  CheckCircle2,
  HelpCircle,
  Wrench,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types pour les messages
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isIncomplete?: boolean;
}

// Questions d'orientation
interface OrientationStep {
  question: string;
  options: { label: string; value: string; icon?: React.ReactNode }[];
}

const ORIENTATION_STEPS: OrientationStep[] = [
  {
    question: "Quel est le domaine de votre question ?",
    options: [
      { label: "Apogée (logiciel)", value: "apogee", icon: <Wrench className="w-4 h-4" /> },
      { label: "HelpConfort (réseau)", value: "helpconfort", icon: <HelpCircle className="w-4 h-4" /> },
      { label: "Autre", value: "autre", icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    question: "Quel type de problème rencontrez-vous ?",
    options: [
      { label: "Bug ou dysfonctionnement", value: "bug", icon: <X className="w-4 h-4" /> },
      { label: "Question d'utilisation", value: "question", icon: <HelpCircle className="w-4 h-4" /> },
      { label: "Demande d'amélioration", value: "improvement", icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
];

interface SimplifiedSupportChatProps {
  /** Callback quand un ticket est créé */
  onTicketCreated?: (ticketId: string) => void;
  /** Callback quand le chat est fermé */
  onChatClosed?: () => void;
  /** Classe CSS additionnelle */
  className?: string;
}

export function SimplifiedSupportChat({
  onTicketCreated,
  onChatClosed,
  className = '',
}: SimplifiedSupportChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State orientation
  const [orientationStep, setOrientationStep] = useState(0);
  const [orientationAnswers, setOrientationAnswers] = useState<Record<string, string>>({});
  const [orientationComplete, setOrientationComplete] = useState(false);
  
  // State chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiHasResponded, setAiHasResponded] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, orientationStep]);

  // Handle orientation answer
  const handleOrientationAnswer = (value: string) => {
    const currentStep = ORIENTATION_STEPS[orientationStep];
    if (!currentStep) return;
    
    const newAnswers = { ...orientationAnswers, [orientationStep]: value };
    setOrientationAnswers(newAnswers);
    
    if (orientationStep < ORIENTATION_STEPS.length - 1) {
      setOrientationStep(orientationStep + 1);
    } else {
      // Orientation complete, add system context
      setOrientationComplete(true);
      
      // Add a welcome message based on orientation
      const domainLabel = ORIENTATION_STEPS[0].options.find(o => o.value === newAnswers[0])?.label || 'Support';
      const typeLabel = ORIENTATION_STEPS[1].options.find(o => o.value === newAnswers[1])?.label || 'demande';
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Je suis là pour vous aider avec votre ${typeLabel.toLowerCase()} concernant ${domainLabel}. Décrivez-moi votre problème ou votre question.`,
        timestamp: new Date(),
      }]);
    }
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Fetch RAG content
      const ragResult = await getApogeeContext(userMessage.content);
      logDebug('simplified-chat', 'RAG result', { hasContent: ragResult.hasContent, chunksCount: ragResult.chunks.length });

      // If no RAG content, respond with fallback
      if (!ragResult.hasContent) {
        const noContentMessage = getNoContentResponse();
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: noContentMessage,
          timestamp: new Date(),
          isIncomplete: true,
        }]);
        setAiHasResponded(true);
        setIsLoading(false);
        return;
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        errorToast('Veuillez vous reconnecter');
        setIsLoading(false);
        return;
      }

      // Get user name
      let userName = 'Utilisateur';
      if (user) {
        const profileResult = await safeQuery<{ first_name: string | null }>(
          supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle(),
          'SIMPLIFIED_CHAT_PROFILE'
        );
        if (profileResult.success && profileResult.data?.first_name) {
          userName = profileResult.data.first_name;
        }
      }

      // Build context from orientation
      const contextType = orientationAnswers[0] || 'apogee';
      const problemType = orientationAnswers[1] || 'question';

      // Format messages for API
      const apiMessages = messages.concat(userMessage).map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      }));

      // SSE streaming call
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            guideContent: ragResult.formattedDocs,
            userId: user?.id || null,
            userName,
            chatContext: contextType,
            hasRagContent: ragResult.hasContent,
          }),
        }
      );

      if (!response.ok || !response.body) {
        if (response.status === 429 || response.status === 402) {
          const error = await response.json();
          errorToast(error.error?.message || 'Limite de requêtes atteinte');
          setIsLoading(false);
          return;
        }
        throw new Error('Erreur de connexion');
      }

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }

      // Check if response indicates incomplete info
      const isIncomplete = assistantContent.includes("n'est pas présente dans la documentation") ||
        assistantContent.includes("n'est pas documentée");

      if (isIncomplete) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, isIncomplete: true } : m
        ));
      }

      setAiHasResponded(true);

    } catch (error) {
      logError('simplified-chat', 'AI response error', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Une erreur est survenue. Vous pouvez créer un ticket pour obtenir de l'aide.",
        timestamp: new Date(),
        isIncomplete: true,
      }]);
      setAiHasResponded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Create ticket from chat
  const handleCreateTicket = async () => {
    if (!user || isCreatingTicket) return;

    setIsCreatingTicket(true);

    try {
      // Extract subject from first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const subject = firstUserMessage?.content.slice(0, 100) || 'Demande depuis le chat';

      // Build conversation for storage
      const chatbotConversation = [
        // Include orientation context
        { role: 'system', content: `Domaine: ${orientationAnswers[0] || 'non spécifié'}, Type: ${orientationAnswers[1] || 'non spécifié'}` },
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString(),
        })),
      ];

      // Determine priority based on problem type
      const problemType = orientationAnswers[1];
      let heatPriority = 6; // Normal by default
      if (problemType === 'bug') heatPriority = 8; // Important
      if (problemType === 'blocking') heatPriority = 10; // Critical
      
      // Determine category
      let category = 'other';
      if (problemType === 'bug') category = 'bug';
      if (problemType === 'question') category = 'question';
      if (problemType === 'improvement') category = 'improvement';

      const result = await safeMutation<{ id: string }>(
        supabase.from('support_tickets').insert({
          user_id: user.id,
          subject,
          status: 'new',
          heat_priority: heatPriority,
          chatbot_conversation: chatbotConversation,
          type: 'ticket',
          source: 'chat',
          ai_category: category,
        } as any).select().single(),
        'SIMPLIFIED_CHAT_CREATE_TICKET'
      );

      if (result.success && result.data) {
        // Auto-classify the ticket
        await safeInvoke(
          supabase.functions.invoke('support-auto-classify', {
            body: { ticket_id: result.data.id },
          }),
          'SIMPLIFIED_CHAT_AUTO_CLASSIFY'
        );

        // Notify support agents
        await safeInvoke(
          supabase.functions.invoke('notify-support-ticket', {
            body: { 
              ticketId: result.data.id,
              isUrgent: heatPriority >= 8,
              message: subject,
            },
          }),
          'SIMPLIFIED_CHAT_NOTIFY'
        );

        successToast('Ticket créé avec succès ! Un agent vous répondra rapidement.');
        onTicketCreated?.(result.data.id);
        
        // Navigate if no callback
        if (!onTicketCreated) {
          navigate(ROUTES.support.index);
        }
      } else {
        errorToast('Erreur lors de la création du ticket');
      }
    } catch (error) {
      logError('simplified-chat', 'Create ticket error', error);
      errorToast('Erreur lors de la création du ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Close chat (resolved)
  const handleCloseChatResolved = () => {
    successToast('Merci ! N\'hésitez pas si vous avez d\'autres questions.');
    onChatClosed?.();
  };

  // Render orientation questions
  if (!orientationComplete) {
    const currentStep = ORIENTATION_STEPS[orientationStep];
    
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Welcome */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-4">{currentStep.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.options.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleOrientationAnswer(option.value)}
                      >
                        {option.icon}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
            
            {/* Progress */}
            <div className="flex justify-center gap-2">
              {ORIENTATION_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx <= orientationStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-lg text-sm",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content}
                {msg.isIncomplete && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Réponse partielle
                  </Badge>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Recherche en cours...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Action buttons after AI response */}
      {aiHasResponded && !isLoading && (
        <div className="p-4 border-t bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            Cette réponse vous a-t-elle aidé ?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCloseChatResolved}
            >
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Oui, c'est résolu
            </Button>
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={handleCreateTicket}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="w-4 h-4" />
              )}
              Créer un ticket
            </Button>
          </div>
        </div>
      )}

      {/* Input - only show before AI has responded or to continue conversation */}
      {!aiHasResponded && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Décrivez votre problème..."
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimplifiedSupportChat;
