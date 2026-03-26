/**
 * AgencyApporteurExchanges — Liste des échanges apporteurs côté OPERIA
 * Affiche les dossiers avec échanges, badge "Réponse requise", et popup dossier
 */

import { useState, useMemo } from 'react';
import { useAgencyExchanges, type AgencyExchangeSummary } from '@/hooks/useAgencyExchanges';
import { useAgencyDossierReply } from '@/hooks/useAgencyDossierReply';
import { useAuth } from '@/contexts/AuthContext';
import { canReplyToApporteur } from '@/lib/canReplyToApporteur';
import { DossierDetailDialog } from '@/apporteur/components/cockpit/DossierDetailDialog';
import type { DossierRow } from '@/apporteur/hooks/useApporteurDossiers';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AgencyApporteurExchanges() {
  const { data: exchanges = [], isLoading } = useAgencyExchanges();
  const { globalRole, roleAgence } = useAuth();
  const replyMutation = useAgencyDossierReply();
  const viewerCanReply = canReplyToApporteur(globalRole, roleAgence);

  const [search, setSearch] = useState('');
  const [selectedDossierRef, setSelectedDossierRef] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return exchanges;
    const q = search.toLowerCase();
    return exchanges.filter(ex =>
      ex.dossier_ref.toLowerCase().includes(q) ||
      ex.last_sender_name.toLowerCase().includes(q) ||
      ex.last_message_preview.toLowerCase().includes(q)
    );
  }, [exchanges, search]);

  // Build a minimal DossierRow for the dialog (since we only have the ref)
  const selectedDossier: DossierRow | null = selectedDossierRef
    ? {
        ref: selectedDossierRef,
        clientName: selectedDossierRef,
        status: 'en_cours',
        statusLabel: '',
        dateCreation: '',
        datePremierRdv: null,
        dateDevisEnvoye: null,
        dateDevisValide: null,
        dateFacture: null,
        dateReglement: null,
        devisHT: 0,
        factureHT: 0,
        restedu: 0,
        city: null,
        address: null,
      } as DossierRow
    : null;

  const handleSendMessage = async (message: string) => {
    if (!selectedDossierRef) return;
    await replyMutation.mutateAsync({ dossierRef: selectedDossierRef, message });
  };

  const needsReplyCount = exchanges.filter(e => e.needs_reply).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-5 h-5 text-primary" />
              Échanges apporteurs
              {needsReplyCount > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">
                  {needsReplyCount} en attente
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence dossier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Aucun résultat pour cette recherche' : 'Aucun échange avec les apporteurs'}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-1">
                {filtered.map((ex) => (
                  <ExchangeRow
                    key={ex.dossier_ref}
                    exchange={ex}
                    onClick={() => setSelectedDossierRef(ex.dossier_ref)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dossier detail dialog */}
      <DossierDetailDialog
        dossier={selectedDossier}
        onClose={() => setSelectedDossierRef(null)}
        viewerType="agence"
        viewerCanReply={viewerCanReply}
        onSendMessage={handleSendMessage}
        isSending={replyMutation.isPending}
      />
    </div>
  );
}

function ExchangeRow({ exchange, onClick }: { exchange: AgencyExchangeSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        exchange.needs_reply
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border bg-background'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">#{exchange.dossier_ref}</span>
            {exchange.needs_reply && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 shrink-0 gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Réponse requise
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {exchange.last_sender_name} : {exchange.last_message_preview}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {format(parseISO(exchange.last_message_at), 'dd/MM HH:mm', { locale: fr })}
          </p>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-1">
            {exchange.total_messages} msg
          </Badge>
        </div>
      </div>
    </button>
  );
}
