import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HelpiChatBubble } from './HelpiChatBubble';
import helpiMascot from '@/assets/helpi/helpi-mascot.png';

/** Format the unified-search response into a readable answer */
function formatHelpiResponse(data: any, error: any): string {
  if (error) return 'Désolé, une erreur est survenue.';
  if (!data) return 'Je n\'ai pas trouvé de réponse.';

  if (data.type === 'stat' && data.result) {
    const r = data.result;
    const label = r.label || r.metricId || 'Résultat';
    const period = r.period
      ? `du ${new Date(r.period.from).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} au ${new Date(r.period.to).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
      : '';

    if (r.displayText) return r.displayText;

    if (r.ranking && r.ranking.length > 0) {
      const lines = r.ranking.slice(0, 5).map((item: any, i: number) =>
        `${i + 1}. **${item.label || item.name}** — ${fmtVal(item.value, r.unit)}`
      );
      return `📊 **${label}** ${period}\n\n${lines.join('\n')}`;
    }

    if (r.value !== undefined && r.value !== null) {
      if (r.hasData === false || (r.value === 0 && r.dataCount === 0)) {
        return `📊 **${label}** ${period}\n\nAucune donnée trouvée pour cette période.`;
      }
      return `📊 **${label}** ${period}\n\n**${fmtVal(r.value, r.unit)}**${r.dataCount ? ` (${r.dataCount} éléments)` : ''}`;
    }
  }

  if (data.type === 'doc' && data.result?.answer) return data.result.answer;
  if (data.type === 'error' || data.type === 'access_denied') return data.error?.message || 'Erreur lors de la recherche.';
  if (data.type === 'ambiguous' && Array.isArray(data.result)) {
    const lines = data.result.map((o: any) => `• ${o.label || o.metricId}`);
    return `🤔 Question ambiguë. Vouliez-vous dire :\n\n${lines.join('\n')}`;
  }

  return data?.result?.answer || data?.answer || 'Je n\'ai pas compris votre question. Essayez de reformuler.';
}

function fmtVal(value: number, unit?: string): string {
  if (unit === '€' || unit === 'euros') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'jours' || unit === 'j') return `${value} jours`;
  return new Intl.NumberFormat('fr-FR').format(value);
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function HelpiMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Auto-focus input when opening
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(async () => {
    const q = query.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: {
          query: q,
          conversationHistory: history.length > 0 ? history : undefined,
        },
      });

      console.log('[Helpi] Response:', JSON.stringify(data, null, 2)?.slice(0, 500));
      const answer = formatHelpiResponse(data, error);

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: answer },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Erreur de connexion. Réessayez.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, messages]);

  // Keep only last 8 messages visible
  const visibleMessages = messages.slice(-8);

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="w-[360px] max-h-[480px] bg-background border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <img src={helpiMascot} alt="Helpi" className="w-7 h-7 object-contain" />
                <span className="font-semibold text-sm text-foreground">Helpi — Assistant Stats</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {visibleMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-8">
                  <p className="font-medium text-sm mb-1">👋 Bonjour !</p>
                  <p>Posez-moi une question sur vos statistiques.</p>
                  <p className="mt-2 italic text-[11px]">Ex: "Combien de chantiers en mars ?"</p>
                </div>
              )}
              {visibleMessages.map(msg => (
                <HelpiChatBubble key={msg.id} content={msg.content} variant={msg.role} />
              ))}
              {isLoading && <HelpiChatBubble content="" variant="assistant" isLoading />}
            </div>

            {/* Input */}
            <div className="border-t border-border px-3 py-2 flex items-center gap-2 bg-muted/20">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Posez votre question..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!query.trim() || isLoading}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="w-16 h-16 rounded-full bg-primary shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center overflow-hidden border-2 border-primary-foreground/20"
      >
        <div
          className="w-12 h-12 bg-contain bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url(${helpiMascot})` }}
          aria-label="Helpi"
        />
      </motion.button>
    </div>
  );
}
