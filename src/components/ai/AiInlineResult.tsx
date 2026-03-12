/**
 * AI Inline Result - Displays results directly under the search bar
 * Documentation search only - no direct ticket creation
 * V4: Removed ticket bypass, redirects to Centre d'aide
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Sparkles, MessageCircle, HelpCircle, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useNavigate } from 'react-router-dom';
import { AiMessage, DocResultData } from './types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AiInlineResultProps {
  messages: AiMessage[];
  isLoading: boolean;
  onClose: () => void;
  onContactSupport?: () => void;
  onOpenLiveChat?: () => void;
}

export function AiInlineResult({ messages, isLoading, onClose }: AiInlineResultProps) {
  const navigate = useNavigate();
  
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
  const conversationHistory = messages.slice(0, -1);
  
  if (!lastAssistantMessage && !isLoading) return null;

  const hasHistory = conversationHistory.length > 0;

  const goToHelpCenter = () => {
    // Navigate to the unified workspace with support tab
    navigate('/?tab=support');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full mx-auto mt-2"
      >
        <div className="relative rounded-xl">
          <div className="absolute inset-0 rounded-xl overflow-visible pointer-events-none z-10">
            <div 
              className="absolute w-2 h-2 rounded-full animate-sparkle-travel"
              style={{
                background: 'radial-gradient(circle, hsl(200 100% 55%) 0%, transparent 70%)',
                filter: 'blur(1px)',
                boxShadow: '0 0 4px 1px hsl(200 100% 55% / 0.4)',
              }}
            />
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

            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:divide-x">
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

              <div className="md:col-span-3">
                <ScrollArea className="h-56 md:h-64">
                  <div className="p-4 space-y-3 overflow-x-hidden">
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

                    {lastAssistantMessage && (
                      <div className="space-y-3">
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-hidden break-words [&_p]:break-words [&_li]:break-words">
                          <ReactMarkdown>{lastAssistantMessage.content}</ReactMarkdown>
                        </div>

                        {lastAssistantMessage.type === 'doc' && lastAssistantMessage.data && (
                          <DocResultView data={lastAssistantMessage.data as DocResultData} />
                        )}

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

            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/help-academy">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Academy
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToHelpCenter}
                  className="gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Accéder à l'aide
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
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
    documents: { label: 'Document', emoji: '📄' },
  };

  return (
    <div className="space-y-2">
      {data.results.slice(0, 5).map((doc, idx) => {
        const sourceInfo = sourceLabels[doc.source] || { label: doc.source, emoji: '📎' };
        
        return (
          <Link
            key={doc.id || idx}
            to={doc.url}
            className="group flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg">{sourceInfo.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {doc.title}
              </p>
              {doc.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {doc.snippet}
                </p>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
