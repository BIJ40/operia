/**
 * SupportChatCore.tsx
 * Composant chat unifié utilisé par:
 * - Chatbot flottant (Chatbot.tsx)
 * - Page /support (SupportUser.tsx)
 * 
 * Gère: filtrage RAG par rôle, suggestions FAQ, transitions IA → SU → Ticket
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeInvoke, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { getFilteredContexts, type RAGContextType } from '@/lib/rag-michu';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Loader2, 
  Bot, 
  User as UserIcon,
  MessageSquarePlus,
  AlertTriangle,
  Lightbulb,
  Phone
} from 'lucide-react';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isFromSupport?: boolean;
  isIncomplete?: boolean;
}

export interface FAQSuggestion {
  id: string;
  question: string;
  answer: string;
}

interface SupportChatCoreProps {
  /** Mode compact pour le chat flottant */
  compact?: boolean;
  /** Contexte RAG initial */
  initialContext?: RAGContextType;
  /** Messages existants (pour transfert depuis flottant) */
  initialMessages?: ChatMessage[];
  /** Callback quand un ticket est créé */
  onTicketCreated?: (ticketId: string) => void;
  /** Callback pour demander un humain */
  onRequestHuman?: () => void;
  /** Afficher les suggestions FAQ */
  showFAQSuggestions?: boolean;
  /** Max suggestions FAQ à afficher */
  maxFAQSuggestions?: number;
  /** Classe CSS additionnelle */
  className?: string;
}

export function SupportChatCore({
  compact = false,
  initialContext,
  initialMessages = [],
  onTicketCreated,
  onRequestHuman,
  showFAQSuggestions = true,
  maxFAQSuggestions = 3,
  className = '',
}: SupportChatCoreProps) {
  const { user, globalRole } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faqSuggestions, setFaqSuggestions] = useState<FAQSuggestion[]>([]);
  const [selectedContext, setSelectedContext] = useState<RAGContextType>(
    initialContext || 'apogee'
  );
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [aiIncompleteCount, setAiIncompleteCount] = useState(0);

  // Contextes RAG autorisés selon le rôle
  const allowedContexts = getFilteredContexts(globalRole || 'base_user');

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load FAQ suggestions based on context and last message
  useEffect(() => {
    if (!showFAQSuggestions) return;
    loadFAQSuggestions();
  }, [messages, selectedContext, showFAQSuggestions]);

  const loadFAQSuggestions = async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    const result = await safeQuery<FAQSuggestion[]>(
      supabase
        .from('faq_items')
        .select('id, question, answer')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .limit(maxFAQSuggestions),
      'SUPPORT_CHAT_FAQ_SUGGESTIONS'
    );

    if (result.success && result.data) {
      setFaqSuggestions(result.data);
    }
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Déterminer le contexte RAG autorisé
      const contextToUse = allowedContexts.includes(selectedContext) 
        ? selectedContext 
        : allowedContexts[0] || 'apogee';

      const result = await safeInvoke<{ response: string; isIncomplete?: boolean }>(
        supabase.functions.invoke('chat-guide', {
          body: {
            question: userMessage.content,
            contextType: contextToUse,
            history: messages.map(m => ({ role: m.role, content: m.content })),
          },
        }),
        'SUPPORT_CHAT_AI_RESPONSE'
      );

      if (result.success && result.data?.response) {
        const isIncomplete = result.data.isIncomplete || 
          result.data.response.includes("n'est pas présente dans la documentation");

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.response,
          timestamp: new Date(),
          isIncomplete,
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (isIncomplete) {
          setAiIncompleteCount(prev => prev + 1);
        }
      } else {
        // Fallback response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Désolé, je n'ai pas pu traiter votre demande. Vous pouvez créer un ticket pour obtenir de l'aide d'un conseiller.",
          timestamp: new Date(),
          isIncomplete: true,
        }]);
        setAiIncompleteCount(prev => prev + 1);
      }
    } catch (error) {
      logError('support-chat', 'AI response error', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Une erreur est survenue. Veuillez réessayer ou créer un ticket.",
        timestamp: new Date(),
        isIncomplete: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create ticket from chat
  const handleCreateTicket = async () => {
    if (!user || isCreatingTicket) return;

    setIsCreatingTicket(true);

    try {
      // Extraire le sujet du premier message user
      const firstUserMessage = messages.find(m => m.role === 'user');
      const subject = firstUserMessage?.content.slice(0, 100) || 'Demande depuis le chat';

      // Construire le contenu du ticket
      const content = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n');

      // Construire la conversation chatbot
      const chatbotConversation = messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp?.toISOString(),
      }));

      const result = await safeMutation<{ id: string }>(
        supabase.from('support_tickets').insert({
          user_id: user.id,
          subject,
          content,
          status: 'new',
          priority: 'normal',
          chatbot_conversation: chatbotConversation,
          escalated_from_chat: true,
        }).select().single(),
        'SUPPORT_CHAT_CREATE_TICKET'
      );

      if (result.success && result.data) {
        successToast('Ticket créé avec succès');
        
        // Appeler la classification IA automatique
        await safeInvoke(
          supabase.functions.invoke('support-auto-classify', {
            body: { ticketId: result.data.id },
          }),
          'SUPPORT_CHAT_AUTO_CLASSIFY'
        );

        onTicketCreated?.(result.data.id);
        
        // Naviguer vers les tickets si pas de callback
        if (!onTicketCreated) {
          navigate(ROUTES.support.userTickets);
        }
      } else {
        errorToast('Erreur lors de la création du ticket');
      }
    } catch (error) {
      logError('support-chat', 'Create ticket error', error);
      errorToast('Erreur lors de la création du ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Request human support
  const handleRequestHuman = async () => {
    if (onRequestHuman) {
      onRequestHuman();
      return;
    }

    // Créer un ticket avec demande de contact humain
    setIsCreatingTicket(true);

    try {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const subject = `[Contact humain] ${firstUserMessage?.content.slice(0, 80) || 'Demande d\'assistance'}`;

      const result = await safeMutation<{ id: string }>(
        supabase.from('support_tickets').insert({
          user_id: user?.id,
          subject,
          content: messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n'),
          status: 'new',
          priority: 'important',
          is_live_chat: true,
          chatbot_conversation: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }).select().single(),
        'SUPPORT_CHAT_REQUEST_HUMAN'
      );

      if (result.success && result.data) {
        // Notifier les SU via edge function
        await safeInvoke(
          supabase.functions.invoke('notify-support-ticket', {
            body: { 
              ticketId: result.data.id,
              isUrgent: true,
              message: 'Demande de contact humain',
            },
          }),
          'SUPPORT_CHAT_NOTIFY_HUMAN'
        );

        successToast('Un conseiller va vous répondre rapidement');
        onTicketCreated?.(result.data.id);
      }
    } catch (error) {
      logError('support-chat', 'Request human error', error);
      errorToast('Erreur lors de la demande');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Insert FAQ answer into chat
  const handleFAQClick = (faq: FAQSuggestion) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: faq.question, timestamp: new Date() },
      { role: 'assistant', content: faq.answer, timestamp: new Date() },
    ]);
  };

  // Reset conversation
  const resetConversation = () => {
    setMessages([]);
    setAiIncompleteCount(0);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Context selector (if multiple contexts available) */}
      {allowedContexts.length > 1 && !compact && (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground">Contexte:</span>
          {allowedContexts.map((ctx) => (
            <Badge
              key={ctx}
              variant={selectedContext === ctx ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedContext(ctx)}
            >
              {ctx}
            </Badge>
          ))}
        </div>
      )}

      {/* FAQ Suggestions (top) */}
      {showFAQSuggestions && faqSuggestions.length > 0 && messages.length === 0 && (
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lightbulb className="w-3 h-3" />
            Questions fréquentes
          </div>
          <div className="space-y-1">
            {faqSuggestions.map((faq) => (
              <button
                key={faq.id}
                onClick={() => handleFAQClick(faq)}
                className="w-full text-left p-2 rounded text-xs hover:bg-muted transition-colors truncate"
              >
                {faq.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Comment puis-je vous aider ?</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                  {msg.isIncomplete && (
                    <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                      <AlertTriangle className="w-3 h-3" />
                      Réponse partielle
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Réponse en cours...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Actions when AI incomplete */}
      {aiIncompleteCount >= 2 && (
        <div className="p-2 border-t bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
            L'assistant n'a pas trouvé toutes les réponses. Souhaitez-vous :
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={handleCreateTicket}
              disabled={isCreatingTicket}
            >
              <MessageSquarePlus className="w-3 h-3 mr-1" />
              Créer un ticket
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1 text-xs"
              onClick={handleRequestHuman}
              disabled={isCreatingTicket}
            >
              <Phone className="w-3 h-3 mr-1" />
              Parler à un humain
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Posez votre question..."
            disabled={isLoading}
            className={compact ? 'text-sm' : ''}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size={compact ? 'sm' : 'default'}
          >
            <Send className={compact ? 'w-4 h-4' : 'w-4 h-4'} />
          </Button>
        </div>

        {/* Quick actions */}
        {messages.length > 0 && !compact && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleCreateTicket}
              disabled={isCreatingTicket}
            >
              <MessageSquarePlus className="w-3 h-3 mr-1" />
              Créer un ticket
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={resetConversation}
            >
              Nouvelle conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportChatCore;
