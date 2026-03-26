/**
 * DossierDetailDialog — Fiche dossier complète et unifiée
 * Layout: gauche (infos + actions) | droite (fil d'échanges)
 * Ouvert depuis n'importe où dans le portail apporteur
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  FolderOpen, CheckCircle2, XCircle, Ban, RefreshCw, Info,
  Send, MessageCircle, Loader2, FileText,
} from 'lucide-react';
import { DossierRow, STATUS_CONFIG, formatCurrency, formatDate } from '../../hooks/useApporteurDossiers';
import { DossierStepper } from './DossierStepper';
import { DocDownloadButton } from '../DocDownloadButton';
import type { DossierRowV2 } from '../../types/apporteur-dossier-v2';
import { useApporteurDossierActions } from '../../hooks/useApporteurDossierActions';
import { useApporteurExchanges, type DossierExchange } from '../../hooks/useApporteurExchanges';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DossierDetailDialogProps {
  dossier: DossierRow | null;
  onClose: () => void;
}

const getApporteurLabel = (d: DossierRow): string => {
  if (d.status === 'en_cours') return d.datePremierRdv ? 'Planifié' : 'À planifier';
  if (d.status === 'programme') return 'Planifié';
  return d.statusLabel;
};

const canRefuserDevis = (d: DossierRow) => d.status === 'devis_envoye';
const canValiderDevis = (d: DossierRow) => d.status === 'devis_envoye';

const ACTION_CONFIG = {
  annuler: { label: 'Annuler', icon: Ban, color: 'text-destructive border-destructive/40 hover:bg-destructive/10' },
  relancer: { label: 'Relancer', icon: RefreshCw, color: 'text-[hsl(var(--ap-warning))] border-[hsl(var(--ap-warning))]/40 hover:bg-[hsl(var(--ap-warning-light))]' },
  info: { label: 'Donner une info', icon: Info, color: 'text-[hsl(var(--ap-info))] border-[hsl(var(--ap-info))]/40 hover:bg-[hsl(var(--ap-info-light))]' },
} as const;

type QuickAction = keyof typeof ACTION_CONFIG;

function ExchangeThread({ exchanges, isLoading }: { exchanges: DossierExchange[]; isLoading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (exchanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Aucun échange pour ce dossier</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Utilisez les actions ci-contre pour contacter l'agence</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exchanges.map((ex) => {
        const isApporteur = ex.sender_type === 'apporteur';
        const actionLabel = ex.action_type === 'annuler' ? '🚫 Annulation'
          : ex.action_type === 'relancer' ? '🔄 Relance'
          : ex.action_type === 'info' ? 'ℹ️ Information'
          : ex.action_type === 'reponse' ? '💬 Réponse' : ex.action_type;

        return (
          <div
            key={ex.id}
            className={cn(
              'rounded-lg p-3 text-sm',
              isApporteur
                ? 'bg-primary/5 border border-primary/10 ml-0 mr-4'
                : 'bg-muted/50 border border-border ml-4 mr-0'
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs">{ex.sender_name}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                  {actionLabel}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(ex.created_at), 'dd/MM HH:mm', { locale: fr })}
              </span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{ex.message}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export function DossierDetailDialog({ dossier, onClose }: DossierDetailDialogProps) {
  const [message, setMessage] = useState('');
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);
  const dossierAction = useApporteurDossierActions();
  const { data: exchanges = [], isLoading: exchangesLoading, invalidate } = useApporteurExchanges(dossier?.ref || null);

  const handleClose = () => {
    setMessage('');
    setActiveAction(null);
    onClose();
  };

  const handleSendAction = (actionType: QuickAction) => {
    if (!dossier || !message.trim()) return;
    dossierAction.mutate(
      {
        action: 'dossier_inactif',
        dossierRefs: [dossier.ref],
        inactifAction: actionType === 'info' ? 'donner_info' : actionType,
        message: message.trim(),
      },
      {
        onSuccess: () => {
          setMessage('');
          setActiveAction(null);
          invalidate();
        },
      }
    );
  };

  const handleDevisAction = (action: 'valider_devis' | 'refuser_devis') => {
    if (!dossier) return;
    dossierAction.mutate(
      { action, dossierRefs: [dossier.ref], message: message.trim() || undefined },
      {
        onSuccess: () => {
          setMessage('');
          invalidate();
        },
      }
    );
  };

  const v2 = dossier ? (dossier as DossierRowV2)?.v2 : undefined;

  return (
    <Dialog open={!!dossier} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="w-5 h-5 text-primary" />
            Dossier — {dossier?.clientName}
            {dossier?.ref && (
              <span className="text-sm font-normal text-muted-foreground ml-2">#{dossier.ref}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {dossier && (
          <div className="flex flex-col lg:flex-row min-h-0 max-h-[calc(90vh-72px)]">
            {/* ─── LEFT: Info + Actions ─── */}
            <ScrollArea className="flex-1 lg:border-r border-border">
              <div className="p-6 pt-2 space-y-4">
                {/* Stepper */}
                <div className="pb-1">
                  <DossierStepper
                    v2={v2}
                    dates={{
                      dateCreation: dossier.dateCreation,
                      datePremierRdv: dossier.datePremierRdv,
                      dateDevisEnvoye: dossier.dateDevisEnvoye,
                      dateDevisValide: dossier.dateDevisValide,
                      dateFacture: dossier.dateFacture,
                      dateReglement: dossier.dateReglement,
                    }}
                  />
                </div>

                {/* Client info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium text-sm">{dossier.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <p className="font-medium text-sm">{getApporteurLabel(dossier)}</p>
                  </div>
                  {dossier.city && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ville</p>
                      <p className="font-medium text-sm">{dossier.city}</p>
                    </div>
                  )}
                  {dossier.address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Adresse</p>
                      <p className="font-medium text-sm">{dossier.address}</p>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={cn(
                    STATUS_CONFIG[dossier.status]?.bgColor,
                    STATUS_CONFIG[dossier.status]?.color,
                    'text-xs'
                  )}>
                    📁 {getApporteurLabel(dossier)}
                  </Badge>
                  {v2?.status && (
                    <>
                      <Badge variant="outline" className="text-xs">📄 Devis: {v2.status.devis.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className="text-xs">🧾 Facture: {v2.status.facture.replace('_', ' ')}</Badge>
                    </>
                  )}
                  {v2?.universes?.map(u => (
                    <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                  ))}
                </div>

                {/* Financier */}
                {(dossier.devisHT > 0 || dossier.factureHT > 0) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Financier</p>
                      <div className="grid grid-cols-3 gap-2">
                        {dossier.devisHT > 0 && (
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Devis HT</p>
                            <p className="font-semibold text-sm">{formatCurrency(dossier.devisHT)}</p>
                          </div>
                        )}
                        {dossier.factureHT > 0 && (
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">Facturé HT</p>
                            <p className="font-semibold text-sm">{formatCurrency(dossier.factureHT)}</p>
                          </div>
                        )}
                        <div className="text-center p-2 bg-muted/30 rounded-lg">
                          <p className="text-[10px] text-muted-foreground">Reste dû</p>
                          <p className={cn(
                            "font-semibold text-sm",
                            dossier.restedu > 0 ? "text-[hsl(var(--ap-danger))]" : "text-[hsl(var(--ap-success))]"
                          )}>
                            {dossier.restedu > 0 ? formatCurrency(dossier.restedu) : 'Réglé'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Documents PDF */}
                {(dossier.devisHT > 0 || dossier.factureHT > 0) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Documents</p>
                      <div className="flex gap-2">
                        {dossier.devisHT > 0 && (
                          <DocDownloadButton dossierRef={dossier.ref} docType="devis" label="Devis PDF" className="text-xs" />
                        )}
                        {dossier.factureHT > 0 && (
                          <DocDownloadButton dossierRef={dossier.ref} docType="factures" label="Facture PDF" className="text-xs" />
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Jalons */}
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Jalons</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Création</span><span>{formatDate(dossier.dateCreation)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">1er RDV</span><span>{formatDate(dossier.datePremierRdv)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Devis envoyé</span><span>{formatDate(dossier.dateDevisEnvoye)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Devis validé</span><span>{formatDate(dossier.dateDevisValide)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Facturé</span><span>{formatDate(dossier.dateFacture)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Réglé</span><span>{formatDate(dossier.dateReglement)}</span></div>
                  </div>
                </div>

                {/* Actions directes */}
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Actions</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {/* Devis actions */}
                    {canValiderDevis(dossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs border-[hsl(var(--ap-success)/.4)] text-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success-light))]"
                        disabled={dossierAction.isPending}
                        onClick={() => handleDevisAction('valider_devis')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valider devis
                      </Button>
                    )}
                    {canRefuserDevis(dossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs border-[hsl(var(--ap-danger)/.4)] text-[hsl(var(--ap-danger))] hover:bg-[hsl(var(--ap-danger-light))]"
                        disabled={dossierAction.isPending}
                        onClick={() => handleDevisAction('refuser_devis')}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Refuser devis
                      </Button>
                    )}

                    {/* Quick actions: Annuler, Relancer, Info */}
                    {(Object.entries(ACTION_CONFIG) as [QuickAction, typeof ACTION_CONFIG[QuickAction]][]).map(([key, conf]) => {
                      const Icon = conf.icon;
                      const isActive = activeAction === key;
                      return (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          className={cn('gap-1.5 text-xs', conf.color, isActive && 'ring-2 ring-offset-1')}
                          onClick={() => setActiveAction(isActive ? null : key)}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {conf.label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Message input for active action */}
                  {activeAction && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder={`Votre message pour "${ACTION_CONFIG[activeAction].label}"...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={!message.trim() || dossierAction.isPending}
                          onClick={() => handleSendAction(activeAction)}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {dossierAction.isPending ? 'Envoi…' : 'Envoyer à l\'agence'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => { setActiveAction(null); setMessage(''); }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* ─── RIGHT: Fil d'échanges + chat input ─── */}
            <div className="w-full lg:w-80 flex flex-col min-h-0 border-t lg:border-t-0">
              <div className="px-4 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Fil d'échanges</p>
                  {exchanges.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{exchanges.length}</Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1 max-h-[300px] lg:max-h-none">
                <div className="p-3">
                  <ExchangeThread exchanges={exchanges} isLoading={exchangesLoading} />
                </div>
              </ScrollArea>
              {/* Chat input bar */}
              <div className="border-t bg-background p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatMessage.trim() || !dossier || dossierAction.isPending) return;
                    dossierAction.mutate(
                      {
                        action: 'dossier_inactif',
                        dossierRefs: [dossier.ref],
                        inactifAction: 'donner_info',
                        message: chatMessage.trim(),
                      },
                      {
                        onSuccess: () => {
                          setChatMessage('');
                          invalidate();
                        },
                      }
                    );
                  }}
                  className="flex items-end gap-1.5"
                >
                  <Textarea
                    placeholder="Écrire à l'agence…"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    rows={1}
                    className="resize-none text-sm min-h-[36px] max-h-[80px] flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!chatMessage.trim() || dossierAction.isPending}
                  >
                    {dossierAction.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
