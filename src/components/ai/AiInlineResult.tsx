/**
 * AI Inline Result - Displays results directly under the search bar
 * No modal, no overlay - fluid inline experience
 * Mode conversationnel avec historique visible
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Sparkles, MessageCircle, HelpCircle, ChevronDown, ChevronUp, User, Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useNavigate } from 'react-router-dom';
import { AiMessage, StatResultData, DocResultData, ChartData } from './types';
import { AiStatChartCard } from './AiStatChartCard';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LiveSupportChat } from '@/components/support/LiveSupportChat';

interface AiInlineResultProps {
  messages: AiMessage[];
  isLoading: boolean;
  onClose: () => void;
  onContactSupport?: () => void;
  onOpenLiveChat?: () => void;
}

export function AiInlineResult({ messages, isLoading, onClose, onContactSupport, onOpenLiveChat }: AiInlineResultProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  const navigate = useNavigate();
  const { user, agence, agencyId } = useAuth();
  
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
  const conversationHistory = messages.slice(0, -1); // All messages except last
  
  if (!lastAssistantMessage && !isLoading) return null;

  const handleContactSupport = () => {
    // Pre-fill with conversation context
    const context = messages
      .map(m => `${m.role === 'user' ? 'Moi' : 'IA'}: ${m.content}`)
      .join('\n');
    setSupportMessage(`Je n'ai pas trouvé de réponse satisfaisante à ma question.\n\nContexte de la conversation:\n${context}`);
    setShowSupportDialog(true);
  };

  const handleSubmitTicket = async () => {
    if (!supportMessage.trim() || !user?.id) return;
    
    setIsSendingTicket(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        subject: 'Question depuis l\'IA Assistant',
        type: 'chat_ai',
        status: 'new',
        heat_priority: 4,
        user_id: user.id,
        agency_slug: agence,
        chatbot_conversation: { context: supportMessage },
      });

      if (error) throw error;

      toast.success('Votre demande a été envoyée au support');
      setShowSupportDialog(false);
      setSupportMessage('');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSendingTicket(false);
    }
  };

  const goToSupportChat = () => {
    // Always use internal dialog which properly initializes the session
    setShowSupportChat(true);
  };

  const hasHistory = conversationHistory.length > 0;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full mx-auto mt-2"
        >
          {/* Container with sparkle border animation */}
          <div className="relative rounded-xl">
            {/* Animated sparkle border */}
            <div className="absolute inset-0 rounded-xl overflow-visible pointer-events-none z-10">
              {/* Traveling sparkle - tiny */}
              <div 
                className="absolute w-2 h-2 rounded-full animate-sparkle-travel"
                style={{
                  background: 'radial-gradient(circle, hsl(200 100% 55%) 0%, transparent 70%)',
                  filter: 'blur(1px)',
                  boxShadow: '0 0 4px 1px hsl(200 100% 55% / 0.4)',
                }}
              />
              {/* Corner sparkles */}
              <div className="absolute top-0.5 left-0.5 animate-corner-sparkle">
                <div className="flex gap-0.5">
                  <span 
                    className="w-0.5 h-0.5 rounded-full animate-twinkle" 
                    style={{ background: 'hsl(200 100% 55%)' }} 
                  />
                  <span 
                    className="w-0.5 h-0.5 rounded-full animate-twinkle" 
                    style={{ background: 'hsl(200 100% 65%)', animationDelay: '150ms' }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="relative rounded-xl border bg-card shadow-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Réponse IA</span>
                  {hasHistory && (
                    <Badge variant="outline" className="text-xs">
                      {Math.ceil(conversationHistory.length / 2)} échanges
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Two-column layout: History left, Response right */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:divide-x">
                {/* Left column: Conversation History (always visible on desktop) */}
                <div className={cn(
                  "md:col-span-2 bg-muted/5",
                  !hasHistory && "hidden md:flex md:items-center md:justify-center"
                )}>
                  {hasHistory ? (
                    <ScrollArea className="h-56 md:h-64">
                      <div className="p-3 space-y-2">
                        {conversationHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex gap-2 text-sm",
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Bot className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <div
                              className={cn(
                                "max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs",
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/50'
                              )}
                            >
                              <p className="line-clamp-4">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs hidden md:block">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p>Historique vide</p>
                    </div>
                  )}
                </div>

                {/* Right column: Current response + chart */}
                <div className="md:col-span-3">
                  <ScrollArea className="h-56 md:h-64">
                    <div className="p-4 space-y-3 overflow-x-hidden">
                      {/* Loading state */}
                      {isLoading && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-sm">Je réfléchis...</span>
                        </div>
                      )}

                      {/* Message content */}
                      {lastAssistantMessage && (
                        <div className="space-y-3">
                          {/* Text content with markdown */}
                          <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-hidden break-words [&_p]:break-words [&_li]:break-words">
                            <ReactMarkdown>{lastAssistantMessage.content}</ReactMarkdown>
                          </div>

                          {/* Stat with Chart */}
                          {(lastAssistantMessage.type === 'stat' || lastAssistantMessage.type === 'chart') && 
                           lastAssistantMessage.data && (
                            <StatResultView 
                              data={lastAssistantMessage.data as StatResultData} 
                              showChart={lastAssistantMessage.type === 'chart'}
                            />
                          )}

                          {/* Doc results */}
                          {lastAssistantMessage.type === 'doc' && lastAssistantMessage.data && (
                            <DocResultView data={lastAssistantMessage.data as DocResultData} />
                          )}

                          {/* Error state */}
                          {lastAssistantMessage.type === 'error' && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                              <p className="text-sm text-destructive">{lastAssistantMessage.content}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/hc-agency/indicateurs">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Pilotage
                    </Link>
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={goToSupportChat}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Chat support
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleContactSupport}
                    className="text-helpconfort-orange border-helpconfort-orange/30 hover:bg-helpconfort-orange/10"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    Créer un ticket
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Support Ticket Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-helpconfort-orange" />
              Contacter le support
            </DialogTitle>
            <DialogDescription>
              Décrivez votre question ou problème et notre équipe vous répondra rapidement.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Décrivez votre question..."
              rows={6}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupportDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitTicket}
              disabled={!supportMessage.trim() || isSendingTicket}
              className="bg-helpconfort-orange hover:bg-helpconfort-orange/90"
            >
              {isSendingTicket ? (
                <>Envoi...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Support Chat Dialog - fermeture uniquement via bouton explicite */}
      <Dialog open={showSupportChat} onOpenChange={setShowSupportChat} modal={true}>
        <DialogContent 
          className="sm:max-w-xl h-[70vh] p-0 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Chat Support en direct
            </DialogTitle>
            <DialogDescription className="sr-only">
              Conversation en direct avec le support HelpConfort
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <LiveSupportChat />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sub-component for stat results
function StatResultView({ data, showChart }: { data: StatResultData; showChart?: boolean }) {
  const hasRanking = data.ranking && data.ranking.length > 0;
  const hasChart = showChart && data.chart;

  return (
    <div className="space-y-4">
      {/* Period badge */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          📊 {data.metricLabel}
        </Badge>
        {data.period.label && (
          <Badge 
            variant={data.period.isDefault ? "outline" : "secondary"} 
            className={cn(data.period.isDefault && "border-dashed border-amber-500/50 text-amber-600")}
          >
            📅 {data.period.label}
            {data.period.isDefault && <span className="text-[10px] ml-1">(par défaut)</span>}
          </Badge>
        )}
        {data.agencyName && (
          <Badge variant="outline">🏢 {data.agencyName}</Badge>
        )}
      </div>

      {/* Chart if available */}
      {hasChart && data.chart && (
        <AiStatChartCard chart={data.chart} />
      )}

      {/* Simple value display (if no chart and no ranking) */}
      {!hasChart && !hasRanking && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-2xl font-bold text-primary">
            {formatValue(data.value, data.unit)}
          </p>
        </div>
      )}

      {/* Ranking table (if no chart) */}
      {!hasChart && hasRanking && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Nom</th>
                <th className="text-right px-3 py-2 font-medium">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking!.slice(0, 5).map((item, idx) => (
                <tr key={item.id} className={cn("border-t", idx === 0 && "bg-primary/5")}>
                  <td className="px-3 py-2">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : item.rank}
                  </td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-right text-primary font-medium">
                    {formatValue(item.value, data.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top item highlight */}
      {data.topItem && !hasRanking && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <span className="text-xl">🏆</span>
          <div>
            <p className="font-medium">{data.topItem.name}</p>
            <p className="text-sm text-muted-foreground">Meilleur résultat</p>
          </div>
          <p className="ml-auto font-bold text-primary">
            {formatValue(data.topItem.value, data.unit)}
          </p>
        </div>
      )}
    </div>
  );
}

// Sub-component for doc results
function DocResultView({ data }: { data: DocResultData }) {
  if (!data.results || data.results.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Aucun document trouvé</p>
      </div>
    );
  }

  const sourceLabels: Record<string, { label: string; emoji: string }> = {
    apogee: { label: 'Apogée', emoji: '📘' },
    helpconfort: { label: 'HelpConfort', emoji: '🏠' },
    apporteurs: { label: 'Apporteurs', emoji: '🤝' },
    faq: { label: 'FAQ', emoji: '❓' },
  };

  return (
    <div className="space-y-2">
      {data.results.slice(0, 5).map((doc) => {
        const source = sourceLabels[doc.source] || { label: doc.source, emoji: '📄' };
        
        return (
          <Link
            key={doc.id}
            to={doc.url}
            className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">{source.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{source.label}</Badge>
                  {doc.similarity && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(doc.similarity * 100)}%
                    </Badge>
                  )}
                </div>
                <h5 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {doc.title}
                </h5>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {doc.snippet}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Helper
function formatValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') return value;
  
  if (unit === '€' || unit === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  return new Intl.NumberFormat('fr-FR').format(value);
}
