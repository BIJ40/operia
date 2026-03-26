/**
 * DossierDetailDialog — Shared popup for dossier detail
 * Same format as DossiersTabContent dialog (stepper, badges, univers, actions)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FolderOpen, CheckCircle2, XCircle, MessageSquarePlus } from 'lucide-react';
import { DossierRow, STATUS_CONFIG, formatCurrency } from '../../hooks/useApporteurDossiers';
import { DossierStepper } from './DossierStepper';
import type { DossierRowV2 } from '../../types/apporteur-dossier-v2';
import { useApporteurDossierActions } from '../../hooks/useApporteurDossierActions';

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
const canDeclareRegle = (d: DossierRow) => d.restedu > 0 && d.factureId !== null;
const isInactif = (d: DossierRow) => d.status === 'stand_by' || d.status === 'en_cours';

export function DossierDetailDialog({ dossier, onClose }: DossierDetailDialogProps) {
  const [inlineComment, setInlineComment] = useState('');
  const dossierAction = useApporteurDossierActions();

  const handleClose = () => {
    setInlineComment('');
    onClose();
  };

  return (
    <Dialog open={!!dossier} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Dossier — {dossier?.clientName}
          </DialogTitle>
        </DialogHeader>
        {dossier && (
          <div className="space-y-4">
            {/* Stepper */}
            <div className="pb-2">
              <DossierStepper
                v2={(dossier as DossierRowV2)?.v2}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{dossier.clientName}</p>
              </div>
              {dossier.city && (
                <div>
                  <p className="text-sm text-muted-foreground">Ville</p>
                  <p className="font-medium">{dossier.city}</p>
                </div>
              )}
              {dossier.address && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{dossier.address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Statut du dossier</p>
                <p className="font-medium">{getApporteurLabel(dossier)}</p>
              </div>
            </div>

            {/* Triple badges (V2) or single badge (V1) */}
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Statuts</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const v2 = (dossier as DossierRowV2)?.v2;
                  if (v2?.status) {
                    return (
                      <>
                        <Badge className={cn(
                          STATUS_CONFIG[dossier.status]?.bgColor,
                          STATUS_CONFIG[dossier.status]?.color
                        )}>
                          📁 {getApporteurLabel(dossier)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          📄 Devis: {v2.status.devis.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          🧾 Facture: {v2.status.facture.replace('_', ' ')}
                        </Badge>
                      </>
                    );
                  }
                  return (
                    <Badge className={cn(
                      STATUS_CONFIG[dossier.status]?.bgColor,
                      STATUS_CONFIG[dossier.status]?.color
                    )}>
                      {getApporteurLabel(dossier)}
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* Univers (V2) */}
            {(() => {
              const v2 = (dossier as DossierRowV2)?.v2;
              if (v2?.universes && v2.universes.length > 0) {
                return (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Univers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v2.universes.map(u => (
                        <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Financier */}
            {dossier.factureHT > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Financier</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Facturé HT:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(dossier.factureHT)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Facturé TTC:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(dossier.factureTTC || dossier.factureHT)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reste dû HT:</span>
                    <span className={cn(
                      "ml-2 font-semibold",
                      dossier.restedu > 0 ? "text-[hsl(var(--ap-danger))]" : "text-[hsl(var(--ap-success))]"
                    )}>
                      {dossier.restedu > 0 ? formatCurrency(dossier.restedu) : 'Réglé'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reste dû TTC:</span>
                    <span className={cn(
                      "ml-2 font-semibold",
                      (dossier.resteduTTC || dossier.restedu) > 0 ? "text-[hsl(var(--ap-danger))]" : "text-[hsl(var(--ap-success))]"
                    )}>
                      {(dossier.resteduTTC || dossier.restedu) > 0 ? formatCurrency(dossier.resteduTTC || dossier.restedu) : 'Réglé'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {(canRefuserDevis(dossier) || canValiderDevis(dossier) || canDeclareRegle(dossier) || isInactif(dossier)) && (
              <div className="border-t pt-4 space-y-3">
                {(canRefuserDevis(dossier) || canValiderDevis(dossier)) && (
                  <div>
                    <p className="text-sm font-medium mb-1.5">Commentaire</p>
                    <Textarea
                      placeholder="Commentaire à transmettre à l'agence (optionnel)..."
                      value={inlineComment}
                      onChange={(e) => setInlineComment(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {canValiderDevis(dossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[hsl(var(--ap-success)/.4)] text-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success-light))]"
                        disabled={dossierAction.isPending}
                        onClick={() => {
                          dossierAction.mutate(
                            { action: 'valider_devis', dossierRefs: [dossier.ref], message: inlineComment || undefined },
                            { onSuccess: () => handleClose() }
                          );
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {dossierAction.isPending ? 'Envoi…' : 'Valider le devis'}
                      </Button>
                    )}
                    {canRefuserDevis(dossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[hsl(var(--ap-danger)/.4)] text-[hsl(var(--ap-danger))] hover:bg-[hsl(var(--ap-danger-light))]"
                        disabled={dossierAction.isPending}
                        onClick={() => {
                          dossierAction.mutate(
                            { action: 'refuser_devis', dossierRefs: [dossier.ref], message: inlineComment || undefined },
                            { onSuccess: () => handleClose() }
                          );
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        {dossierAction.isPending ? 'Envoi…' : 'Refuser le devis'}
                      </Button>
                    )}
                    {isInactif(dossier) && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquarePlus className="w-4 h-4" />
                        Action dossier
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
