/**
 * Centre d'aide — Page unique avec 4 blocs
 * 1. Base documentaire (liens vers guides)
 * 2. Aide en ligne (chat IA — bloc principal)
 * 3. FAQ (accordion inline)
 * 4. Mes demandes (suivi conversationnel)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Headphones,
  HelpCircle,
  FileText,
  Loader2,
  MessageCircle,
  Search,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SimplifiedSupportChat } from '@/components/support/SimplifiedSupportChat';
import { ProjectTicketDetailPanel } from '@/components/support/ProjectTicketDetailPanel';
import { HeatPriorityBadge } from '@/components/support/HeatPriorityBadge';
import { useCombinedUserTickets } from '@/hooks/use-user-project-tickets';
import { useUserProjectUnreadCount } from '@/hooks/use-project-ticket-notifications';
import { getFaqItems, type FaqItem } from '@/lib/rag-improvement';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/contexts/PermissionsContext';

// ─── Base documentaire config ───────────────────────────────────
const DOC_SECTIONS = [
  {
    id: 'apogee',
    label: 'Apogée',
    description: 'Guide complet du logiciel Apogée',
    href: ROUTES.academy.apogee,
    emoji: '📘',
    accentClass: 'border-l-primary',
    bgClass: 'bg-primary/5 hover:bg-primary/10',
  },
  {
    id: 'apporteurs',
    label: 'Apporteurs',
    description: 'Ressources apporteurs d\'affaires',
    href: ROUTES.academy.apporteurs,
    emoji: '🤝',
    accentClass: 'border-l-amber-500',
    bgClass: 'bg-amber-500/5 hover:bg-amber-500/10',
  },
  {
    id: 'hc-services',
    label: 'HC Services',
    description: 'Documentation HC Services',
    href: ROUTES.academy.hcServices,
    emoji: '🏠',
    accentClass: 'border-l-teal-500',
    bgClass: 'bg-teal-500/5 hover:bg-teal-500/10',
  },
  {
    id: 'hc-base',
    label: 'Base documentaire',
    description: 'Documents et ressources',
    href: ROUTES.academy.documents,
    emoji: '📂',
    accentClass: 'border-l-purple-500',
    bgClass: 'bg-purple-500/5 hover:bg-purple-500/10',
  },
];

// ─── FAQ inline component ───────────────────────────────────────
function InlineFaq() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getFaqItems({ publishedOnly: true }).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Aucune question fréquente pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans la FAQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun résultat.</p>
      ) : (
        <Accordion type="multiple" className="w-full">
          {filtered.slice(0, 15).map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b-muted/50">
              <AccordionTrigger className="text-left hover:no-underline py-3 text-sm">
                <div className="flex items-start gap-2 pr-4">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="font-medium">{item.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {item.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────
export default function SupportHubTabContent() {
  const queryClient = useQueryClient();
  const { hasModule } = usePermissions();
  const { tickets: combinedTickets, isLoading: combinedLoading } = useCombinedUserTickets();
  const { unreadCount: totalUnreadCount } = useUserProjectUnreadCount();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const handleTicketCreated = (_ticketId: string) => {
    queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['combined-user-tickets'] });
  };

  // Detail view
  if (selectedTicketId) {
    return (
      <div className="py-3 px-2 sm:px-4">
        <ProjectTicketDetailPanel
          ticketId={selectedTicketId}
          onBack={() => setSelectedTicketId(null)}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-2 sm:px-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Centre d'aide
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Documentation, assistance IA et suivi de vos demandes
        </p>
      </div>

      {/* ═══ Grille 2×2 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── Haut gauche : Aide en ligne ── */}
        <Card className="rounded-2xl border-2 border-primary/20 bg-card/90 backdrop-blur-sm shadow-lg overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              Aide en ligne
              <Badge variant="secondary" className="rounded-full text-xs font-normal">
                IA
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SimplifiedSupportChat
              onTicketCreated={handleTicketCreated}
              onChatClosed={() => {}}
              className="min-h-[340px] max-h-[400px]"
            />
          </CardContent>
        </Card>

        {/* ── Haut droite : Base documentaire ── */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-foreground/70" />
              </div>
              Base documentaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DOC_SECTIONS.filter(s => {
              if (s.id === 'apporteurs') return hasModule('organisation.apporteurs');
              return true;
            }).map((section) => (
              <Link
                key={section.id}
                to={section.href}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-l-4 transition-all',
                  section.accentClass,
                  section.bgClass,
                )}
              >
                <span className="text-xl">{section.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* ── Bas gauche : Mes demandes ── */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-foreground/70" />
              </div>
              Mes demandes
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse rounded-full px-2">
                  {totalUnreadCount} nouveau{totalUnreadCount > 1 ? 'x' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[320px] pr-2">
              {combinedLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : combinedTickets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <FileText className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="text-sm">Aucune demande en cours</p>
                  <p className="text-xs mt-1">Utilisez l'aide en ligne pour poser une question</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {combinedTickets.map((ticket) => {
                    const hasUnread = ticket.unread_exchanges_count > 0;
                    return (
                      <button
                        key={`${ticket.ticketType}-${ticket.id}`}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-muted/30 transition-all',
                          hasUnread && 'animate-pulse ring-2 ring-destructive ring-offset-1 bg-destructive/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-medium text-sm truncate flex-1 flex items-center gap-1">
                            {ticket.subject}
                            {ticket.unread_exchanges_count > 0 && (
                              <Badge variant="secondary" className="text-xs gap-0.5 ml-1 rounded-full">
                                <MessageCircle className="h-3 w-3" />
                                {ticket.unread_exchanges_count}
                              </Badge>
                            )}
                          </p>
                          <Badge
                            style={{
                              backgroundColor: ticket.statusColor ? `${ticket.statusColor}20` : undefined,
                              color: ticket.statusColor || undefined,
                            }}
                            variant="secondary"
                            className="rounded-full text-xs"
                          >
                            {ticket.statusLabel || ticket.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(ticket.created_at), 'dd MMM', { locale: fr })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Bas droite : FAQ ── */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-foreground/70" />
              </div>
              Questions fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InlineFaq />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
