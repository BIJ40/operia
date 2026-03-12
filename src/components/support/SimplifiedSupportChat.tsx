/**
 * SimplifiedSupportChat.tsx
 * Chatbox simplifié V4 : Choix domaine → Questions d'orientation → RAG → Création ticket
 * 
 * Flux:
 * 1. Choix du domaine (Apogée, HelpConfort, HC Services, Divers)
 * 2. Question d'orientation (type de demande)
 * 3. Description du problème
 * 4. Réponse IA via RAG
 * 5. Boutons: "Problème résolu" → ticket SUPPORT_RESOLU
 *            "Toujours bloqué" → screenshot optionnel → ticket IA_ESCALADE
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { notifyNewTicket } from '@/utils/notifyNewTicket';
import { useNavigate } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
import { logError, logDebug } from '@/lib/logger';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { searchRAG, getNoContentResponse } from '@/lib/rag-michu';
import type { RAGContextType } from '@/lib/rag-michu';
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
  AlertTriangle,
  ArrowLeft,
  Camera,
  Upload,
  Monitor,
  Apple,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';

// ─── Types ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isIncomplete?: boolean;
}

interface OrientationStep {
  question: string;
  options: { label: string; value: string; icon?: React.ReactNode }[];
}

// ─── Domain config ──────────────────────────────────────────────
const DOMAIN_OPTIONS: { label: string; value: string; emoji: string; chatContext: RAGContextType }[] = [
  { label: 'Apogée', value: 'apogee', emoji: '📘', chatContext: 'apogee' },
  { label: 'HelpConfort', value: 'helpconfort', emoji: '🏠', chatContext: 'helpconfort' },
  { label: 'HC Services', value: 'hc-services', emoji: '🔧', chatContext: 'helpconfort' },
  { label: 'Divers', value: 'divers', emoji: '📋', chatContext: 'auto' },
];

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
  onTicketCreated?: (ticketId: string) => void;
  onChatClosed?: () => void;
  className?: string;
}

export function SimplifiedSupportChat({
  onTicketCreated,
  onChatClosed,
  className = '',
}: SimplifiedSupportChatProps) {
  const { user } = useAuthCore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Domain selection
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Orientation state
  const [orientationStep, setOrientationStep] = useState(0);
  const [orientationAnswers, setOrientationAnswers] = useState<Record<string, string>>({});
  const [orientationComplete, setOrientationComplete] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiHasResponded, setAiHasResponded] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  
  // Screenshot step (for "Toujours bloqué")
  const [showScreenshotStep, setShowScreenshotStep] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, orientationStep, selectedDomain]);

  // Dropzone for screenshot
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setScreenshotFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  // ─── Domain selection ─────────────────────────────────────────
  const handleDomainSelect = (domainValue: string) => {
    setSelectedDomain(domainValue);
  };

  // ─── Orientation ──────────────────────────────────────────────
  const handleOrientationAnswer = (value: string) => {
    const newAnswers = { ...orientationAnswers, [orientationStep]: value };
    setOrientationAnswers(newAnswers);
    
    if (orientationStep < ORIENTATION_STEPS.length - 1) {
      setOrientationStep(orientationStep + 1);
    } else {
      setOrientationComplete(true);
      const domain = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
      const typeLabel = ORIENTATION_STEPS[0].options.find(o => o.value === newAnswers[0])?.label || 'demande';
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Je suis là pour vous aider avec votre ${typeLabel.toLowerCase()} concernant **${domain?.label || 'votre logiciel'}**. Décrivez-moi votre problème ou votre question.`,
        timestamp: new Date(),
      }]);
    }
  };

  // ─── User profile ─────────────────────────────────────────────
  const getUserProfile = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, agence')
      .eq('id', user.id)
      .single();
    return data;
  };

  // ─── Build condensed summary ──────────────────────────────────
  const buildCondensedSummary = (isResolved: boolean): string => {
    const domain = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
    const problemType = orientationAnswers[0] || 'question';
    const firstUserMsg = messages.find(m => m.role === 'user');
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant');

    const lines = [
      `📋 Domaine : ${domain?.label || 'Non spécifié'}`,
      `📝 Type : ${problemType === 'bug' ? 'Bug' : problemType === 'improvement' ? 'Amélioration' : 'Question'}`,
      `💬 Question : ${firstUserMsg?.content.slice(0, 200) || 'N/A'}`,
      `🤖 Réponse IA : ${lastAiMsg?.content.slice(0, 300) || 'N/A'}`,
      `📊 Résultat : ${isResolved ? 'Résolu par l\'IA' : 'Toujours bloqué'}`,
    ];

    return lines.join('\n');
  };

  // ─── Upload screenshot ────────────────────────────────────────
  const uploadScreenshot = async (ticketId: string): Promise<string | null> => {
    if (!screenshotFile || !user) return null;
    
    try {
      const ext = screenshotFile.name.split('.').pop() || 'png';
      const filePath = `ticket-attachments/${ticketId}/${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, screenshotFile);
      
      if (error) {
        logError('simplified-chat', 'Screenshot upload error', error);
        errorToast('La capture d\'écran n\'a pas pu être jointe. Votre demande a été créée sans capture.');
        return null;
      }
      
      // Also insert into apogee_ticket_attachments
      const { error: attachError } = await supabase.from('apogee_ticket_attachments').insert({
        ticket_id: ticketId,
        file_name: screenshotFile.name,
        file_path: filePath,
        file_size: screenshotFile.size,
        file_type: screenshotFile.type,
        uploaded_by: user.id,
      });

      if (attachError) {
        logError('simplified-chat', 'Screenshot attachment record error', attachError);
        errorToast('La capture a été uploadée mais n\'a pas pu être liée au ticket.');
        return null;
      }
      
      return filePath;
    } catch (err) {
      logError('simplified-chat', 'Screenshot upload failed', err);
      errorToast('Erreur lors de l\'upload de la capture d\'écran. Le ticket a été créé sans capture.');
      return null;
    }
  };

  // ─── Create ticket ────────────────────────────────────────────
  const createProjectTicket = async (isResolved: boolean) => {
    if (!user || isCreatingTicket) return;
    setIsCreatingTicket(true);

    try {
      const profile = await getUserProfile();
      const domain = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
      const problemType = orientationAnswers[0] || 'question';
      
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage?.content.slice(0, 150) || 'Demande support';
      
      const description = buildCondensedSummary(isResolved);
      
      // Status: SUPPORT_RESOLU for resolved, IA_ESCALADE for blocked
      const kanbanStatus = isResolved ? 'SUPPORT_RESOLU' : 'IA_ESCALADE';
      const heatPriority = isResolved ? 3 : 10;
      
      const initiatorProfile = {
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || '',
        agence: profile?.agence || '',
      };

      const ticketData = {
        element_concerne: `[${domain?.label?.toUpperCase() || 'DIVERS'}] [${problemType.toUpperCase()}] ${title}`,
        description,
        kanban_status: kanbanStatus,
        created_from: 'support' as const,
        created_by_user_id: user.id,
        support_initiator_user_id: user.id,
        initiator_profile: initiatorProfile,
        heat_priority: heatPriority,
        is_urgent_support: !isResolved,
        impact_tags: problemType === 'bug' ? ['BUG'] : [],
        reported_by: 'AGENCE',
      };

      const { data: ticket, error } = await supabase
        .from('apogee_tickets')
        .insert(ticketData)
        .select('id, ticket_number')
        .single();

      if (error) throw error;

      // Upload screenshot if provided
      if (ticket && screenshotFile) {
        await uploadScreenshot(ticket.id);
      }

      // Notification
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

  const handleProblemResolved = () => createProjectTicket(true);
  
  const handleStillBlocked = () => {
    setShowScreenshotStep(true);
  };

  const handleSendWithScreenshot = () => {
    setShowScreenshotStep(false);
    createProjectTicket(false);
  };

  const handleSendWithoutScreenshot = () => {
    setShowScreenshotStep(false);
    setScreenshotFile(null);
    createProjectTicket(false);
  };

  // ─── Send message to AI ───────────────────────────────────────
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
      const selectedDomainConfig = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
      const ragContextType: RAGContextType = selectedDomainConfig?.chatContext || 'auto';
      const ragResult = await searchRAG({ query: userMessage.content, contextType: ragContextType });
      logDebug('simplified-chat', 'RAG result', { context: ragContextType, hasContent: ragResult.hasContent, chunksCount: ragResult.chunks.length });

      if (!ragResult.hasContent) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getNoContentResponse(),
          timestamp: new Date(),
          isIncomplete: true,
        }]);
        setAiHasResponded(true);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        errorToast('Veuillez vous reconnecter');
        setIsLoading(false);
        return;
      }

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

      const domain = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
      const contextType = domain?.chatContext || 'apogee';

      const apiMessages = messages.concat(userMessage).map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      }));

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

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
            // Ignore
          }
        }
      }

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

  // ─── Go back ──────────────────────────────────────────────────
  const handleGoBack = () => {
    if (showScreenshotStep) {
      setShowScreenshotStep(false);
      setScreenshotFile(null);
      return;
    }
    if (aiHasResponded || messages.length > 1) {
      // Back from chat to orientation
      setOrientationComplete(false);
      setOrientationStep(0);
      setOrientationAnswers({});
      setMessages([]);
      setInput('');
      setAiHasResponded(false);
      setTicketCreated(false);
      return;
    }
    if (orientationComplete) {
      setOrientationComplete(false);
      setMessages([]);
      return;
    }
    if (orientationStep > 0) {
      setOrientationStep(orientationStep - 1);
      return;
    }
    // Back to domain selection
    setSelectedDomain(null);
    setOrientationStep(0);
    setOrientationAnswers({});
  };

  // ─── Reset ────────────────────────────────────────────────────
  const handleNewChat = () => {
    setSelectedDomain(null);
    setOrientationStep(0);
    setOrientationAnswers({});
    setOrientationComplete(false);
    setMessages([]);
    setInput('');
    setAiHasResponded(false);
    setTicketCreated(false);
    setShowScreenshotStep(false);
    setScreenshotFile(null);
    onChatClosed?.();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // Step 0: Domain selection
  if (!selectedDomain) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Card className="p-4 rounded-2xl bg-muted/30 border-border/40">
                  <p className="text-sm font-medium mb-4">Sur quel domaine portent vos questions ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DOMAIN_OPTIONS.map((domain) => (
                      <Button
                        key={domain.value}
                        variant="outline"
                        className="gap-2 rounded-xl border-border/50 hover:border-primary/40 hover:bg-primary/5 h-auto py-3 flex-col"
                        onClick={() => handleDomainSelect(domain.value)}
                      >
                        <span className="text-xl">{domain.emoji}</span>
                        <span className="text-sm font-medium">{domain.label}</span>
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

  // Step 1: Orientation questions
  if (!orientationComplete) {
    const currentStep = ORIENTATION_STEPS[orientationStep];
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="px-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
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
                        className="gap-2 rounded-xl border-border/50 hover:border-primary/40 hover:bg-primary/5"
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

  // Screenshot step
  if (showScreenshotStep) {
    return (
      <div className={cn("flex flex-col h-full items-center justify-center p-6", className)}>
        <div className="w-full max-w-md space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Ajouter une capture d'écran</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Une capture d'écran aide notre équipe à comprendre votre problème plus rapidement.
            </p>
          </div>

          {/* Keyboard shortcuts help */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
              <Apple className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Mac</p>
                <p className="text-xs text-muted-foreground">⌘ + Shift + 4</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
              <Monitor className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Windows</p>
                <p className="text-xs text-muted-foreground">Win + Shift + S</p>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40',
              screenshotFile && 'border-green-500 bg-green-500/5'
            )}
          >
            <input {...getInputProps()} />
            {screenshotFile ? (
              <div className="space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium">{screenshotFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(screenshotFile.size / 1024).toFixed(0)} Ko
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez ou cliquez pour sélectionner
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleSendWithoutScreenshot}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer sans capture'}
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleSendWithScreenshot}
              disabled={isCreatingTicket || !screenshotFile}
            >
              {isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer avec capture'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ticket created
  if (ticketCreated) {
    return (
      <div className={cn("flex flex-col h-full items-center justify-center p-6", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="font-semibold text-lg">Demande transmise</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Votre demande a été enregistrée. Retrouvez-la dans "Mes demandes" ci-dessous.
          </p>
          <Button variant="outline" onClick={handleNewChat} className="rounded-xl">
            Nouvelle question
          </Button>
        </div>
      </div>
    );
  }

  // Main chat
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Domain indicator + back */}
      <div className="px-4 pt-2 pb-1 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleGoBack} className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Button>
        <Badge variant="outline" className="rounded-full text-xs">
          {DOMAIN_OPTIONS.find(d => d.value === selectedDomain)?.emoji}{' '}
          {DOMAIN_OPTIONS.find(d => d.value === selectedDomain)?.label}
        </Badge>
      </div>

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
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-sm",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
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
                <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-accent-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Recherche en cours...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Resolution buttons */}
      {aiHasResponded && !isLoading && (
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            Votre problème est-il résolu ?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-green-500/40 text-green-600 hover:bg-green-500/10"
              onClick={handleProblemResolved}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Problème résolu
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
              onClick={handleStillBlocked}
              disabled={isCreatingTicket}
            >
              {isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Toujours bloqué
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
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
              className="rounded-xl"
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
