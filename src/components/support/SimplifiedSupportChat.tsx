/**
 * SimplifiedSupportChat.tsx
 * Chatbox simplifié V3 : Questions d'orientation → RAG → Création ticket projet
 * 
 * Flux BUG:
 * 1. Question d'orientation (type de demande)
 * 2. Description du problème
 * 3. Réponse IA via RAG
 * 4. Boutons: "Problème résolu" → ticket SUPPORT_RESOLU
 *            "Toujours bloqué" → ticket USER (urgent, clignotement rouge)
 */

import { useState, useEffect, useRef } from 'react';
import { notifyNewTicket } from '@/utils/notifyNewTicket';
import { useNavigate } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
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
  CheckCircle2,
  HelpCircle,
  Sparkles,
  X,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';

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

// Contexte fixé sur Apogée uniquement pour cette version
const FIXED_CONTEXT = 'apogee';

const ORIENTATION_STEPS: OrientationStep[] = [
  {
    question: "Quel type de demande souhaitez-vous faire ?",
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
  const queryClient = useQueryClient();
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
  const [ticketCreated, setTicketCreated] = useState(false);
  
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
      
      // Add a welcome message based on orientation (Apogée only for now)
      const typeLabel = ORIENTATION_STEPS[0].options.find(o => o.value === newAnswers[0])?.label || 'demande';
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Je suis là pour vous aider avec votre ${typeLabel.toLowerCase()} concernant Apogée. Décrivez-moi votre problème ou votre question.`,
        timestamp: new Date(),
      }]);
    }
  };

  // Get user profile for ticket creation
  const getUserProfile = async () => {
    if (!user) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, agence')
      .eq('id', user.id)
      .single();
    
    return data;
  };

  // Create project ticket (apogee_tickets)
  const createProjectTicket = async (isResolved: boolean) => {
    if (!user || isCreatingTicket) return;

    setIsCreatingTicket(true);

    try {
      const profile = await getUserProfile();
      
      // Build title from first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage?.content.slice(0, 150) || 'Demande support';
      
      // Build full description from conversation
      const conversationText = messages
        .filter(m => m.role !== 'system')
        .map(m => `[${m.role === 'user' ? 'Utilisateur' : 'IA'}] ${m.content}`)
        .join('\n\n');
      
      const problemType = orientationAnswers[0] || 'question';
      
      // Determine status and priority based on resolution
      const kanbanStatus = isResolved ? 'SUPPORT_RESOLU' : 'USER';
      const heatPriority = isResolved ? 3 : 10; // Low if resolved, Critical if not
      
      // Build initiator profile
      const initiatorProfile = {
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || '',
        agence: profile?.agence || '',
      };

      // Insert into apogee_tickets
      const ticketData = {
        element_concerne: `[${problemType.toUpperCase()}] ${title}`,
        description: conversationText,
        kanban_status: kanbanStatus,
        created_from: 'support',
        created_by_user_id: user.id,
        support_initiator_user_id: user.id,
        initiator_profile: initiatorProfile,
        heat_priority: heatPriority,
        is_urgent_support: !isResolved,
        impact_tags: problemType === 'bug' ? ['BUG'] : [],
        reported_by: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').toUpperCase() || user.email || 'Inconnu',
      };

      const { data: ticket, error } = await supabase
        .from('apogee_tickets')
        .insert(ticketData)
        .select('id, ticket_number')
        .single();

      if (error) throw error;

      // Fire-and-forget notification
      if (ticket) {
        notifyNewTicket({
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticketData.element_concerne,
          description: ticketData.description,
          heat_priority: ticketData.heat_priority,
          created_from: 'support',
          initiator_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
          initiator_email: profile?.email || user.email,
        });
      }

      // Invalidate queries to refresh Kanban and user tickets
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });

      setTicketCreated(true);

      if (isResolved) {
        successToast('Merci ! Votre retour a été enregistré.');
      } else {
        successToast('Votre demande a été transmise à l\'équipe. Vous pouvez la suivre dans "Mes demandes".');
      }

      onTicketCreated?.(ticket.id);

    } catch (error) {
      logError('simplified-chat', 'Create project ticket error', error);
      errorToast('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Handle "Problem resolved" click
  const handleProblemResolved = () => {
    createProjectTicket(true);
  };

  // Handle "Still blocked" click
  const handleStillBlocked = () => {
    createProjectTicket(false);
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

      // Context is always Apogée for now
      const contextType = FIXED_CONTEXT;
      const problemType = orientationAnswers[0] || 'question';

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
        content: "Une erreur est survenue. Vous pouvez tout de même transmettre votre demande.",
        timestamp: new Date(),
        isIncomplete: true,
      }]);
      setAiHasResponded(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset chat
  const handleNewChat = () => {
    setOrientationStep(0);
    setOrientationAnswers({});
    setOrientationComplete(false);
    setMessages([]);
    setInput('');
    setAiHasResponded(false);
    setTicketCreated(false);
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
              <div className="w-8 h-8 rounded-xl bg-warm-orange/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-warm-orange" />
              </div>
              <div className="flex-1">
                <Card className="p-4 rounded-2xl bg-muted/30 border-border/40">
                  <p className="text-sm font-medium mb-4">{currentStep.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.options.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl border-border/50 hover:border-warm-orange/40 hover:bg-warm-orange/10"
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
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Ticket created - show confirmation
  if (ticketCreated) {
    return (
      <div className={cn("flex flex-col h-full items-center justify-center p-6", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-warm-green/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-warm-green" />
          </div>
          <h3 className="font-semibold text-lg">Demande transmise</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Votre demande a été enregistrée. Vous pouvez suivre son avancement dans "Mes demandes".
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={handleNewChat} className="rounded-xl">
              Nouvelle question
            </Button>
            <Button onClick={() => navigate(ROUTES.support.index)} className="rounded-xl bg-warm-blue/90 hover:bg-warm-blue">
              Mes demandes
            </Button>
          </div>
        </div>
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
                <div className="w-8 h-8 rounded-xl bg-warm-orange/15 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-warm-orange" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-sm",
                  msg.role === 'user'
                    ? "bg-warm-blue/90 text-white"
                    : "bg-muted/50 border border-border/40"
                )}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {msg.isIncomplete && (
                  <Badge variant="outline" className="mt-2 text-xs rounded-full">
                    Réponse partielle
                  </Badge>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-warm-teal/15 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-warm-teal" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-warm-orange/15 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-warm-orange" />
              </div>
              <span className="text-sm text-muted-foreground">Recherche en cours...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Action buttons after AI response - NEW FLOW */}
      {aiHasResponded && !isLoading && (
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            Cette réponse a-t-elle résolu votre problème ?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-warm-green/40 text-warm-green hover:bg-warm-green/10"
              onClick={handleProblemResolved}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Problème résolu
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-warm-orange/40 text-warm-orange hover:bg-warm-orange/10"
              onClick={handleStillBlocked}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Toujours bloqué
            </Button>
          </div>
        </div>
      )}

      {/* Input - only show before AI has responded */}
      {!aiHasResponded && (
        <div className="p-4 border-t border-border/40">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Décrivez votre problème..."
              disabled={isLoading}
              className="rounded-xl border-border/50"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="rounded-xl bg-warm-blue/90 hover:bg-warm-blue"
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
