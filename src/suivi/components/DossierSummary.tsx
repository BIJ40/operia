import React from 'react';
import { MapPin, User, Building2, Phone, Mail, FolderOpen, Euro, CheckCircle2 } from 'lucide-react';
import { SuiviSummary } from '@/suivi/lib/dataProcessing/suiviDataProcessor';
import { ContactUpdateDialog } from './ContactUpdateDialog';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { HumidityWizardDialog } from './HumidityWizardDialog';
import { StripeButton } from './StripeButton';
import { usePaymentStatus } from '@/suivi/hooks/usePaymentStatus';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface DossierSummaryProps {
  summary: SuiviSummary;
  agencySlug?: string;
  verifiedPostalCode?: string;
  stripeEnabled?: boolean;
}

export const DossierSummary: React.FC<DossierSummaryProps> = ({ summary, agencySlug, verifiedPostalCode, stripeEnabled = false }) => {
  const { data: paymentStatus } = usePaymentStatus(summary.refDossier, verifiedPostalCode, agencySlug);
  const totalPaidFromStripe = (paymentStatus?.totalPaidCents || 0) / 100;
  
  const clientName = summary.clientInfo.raisonSociale || 
    `${summary.clientInfo.civilite || ''} ${summary.clientInfo.prenom || ''} ${summary.clientInfo.nom || ''}`.trim();

  return (
    <>
      <Accordion type="single" collapsible defaultValue="dossier" className="w-full mb-4 md:mb-8">
        <AccordionItem 
          value="dossier" 
          className="group rounded-xl border-0 bg-card shadow-card 
            transition-all duration-300 hover:shadow-card-hover px-4 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary 
                flex items-center justify-center shadow-sm">
                <FolderOpen className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg md:text-2xl text-foreground leading-tight">
                VOTRE DOSSIER
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 md:space-y-4 pt-2">
              {/* Encarts VOTRE DOSSIER et Apporteur côte à côte */}
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {/* Encart libellé */}
                <div className="group/tile rounded-xl bg-accent/40 p-2 md:p-4
                  border border-primary/10 
                  transition-all duration-300 hover:bg-accent/60 hover:shadow-sm hover:-translate-y-0.5">
                  <div className="space-y-1 md:space-y-2">
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/15 
                        flex items-center justify-center">
                        <Building2 className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                      </div>
                      <span className="text-xs md:text-base font-display font-semibold text-primary leading-tight">
                        {summary.libelle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Encart Apporteur */}
                {summary.mode === 'apporteur' && summary.apporteurInfo ? (
                  <div className="group/tile rounded-xl bg-primary-light/10 p-2 md:p-4
                    border border-primary-light/15
                    transition-all duration-300 hover:bg-primary-light/20 hover:shadow-sm hover:-translate-y-0.5">
                    <div className="space-y-1 md:space-y-2">
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary-light/20 
                          flex items-center justify-center">
                          <Building2 className="h-3 w-3 md:h-4 md:w-4 text-primary-light flex-shrink-0" />
                        </div>
                        <span className="text-xs md:text-base font-display font-semibold text-primary-light leading-tight">
                          GÉRÉ POUR
                        </span>
                      </div>
                      <div className="ml-7 md:ml-10 space-y-0.5 md:space-y-1">
                        <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight">
                          {summary.apporteurInfo.nom}
                        </p>
                        {summary.refApporteur && (
                          <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">
                            Réf: <span className="font-medium text-primary-light">{summary.refApporteur}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:block"></div>
                )}
              </div>

              {/* Encart Financier + Bouton Photos */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
                {summary.financier && (summary.financier.franchise > 0 || (summary.mode === 'direct' && (summary.financier.acompte > 0 || summary.financier.aPercevoir > 0))) && (
                  <div className="group/tile rounded-xl bg-secondary/10 p-2 md:p-4 flex-1
                    border border-secondary/20
                    transition-all duration-300 hover:bg-secondary/15 hover:shadow-sm hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-secondary/20 
                        flex items-center justify-center flex-shrink-0">
                        <Euro className="h-3 w-3 md:h-4 md:w-4 text-secondary" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-sm">
                        {summary.financier.franchise > 0 ? (
                          <>
                            <span className="text-foreground font-semibold">
                              Franchise : {summary.financier.franchise} €
                            </span>
                            {summary.financier.sumFranchisePaid !== undefined ? (
                              <>
                                {(() => {
                                  const totalRegle = (summary.financier.sumFranchisePaid || 0) + totalPaidFromStripe;
                                  const remaining = summary.financier.franchise - totalRegle;
                                  return (
                                    <>
                                      {totalRegle > 0 && (
                                        <span className="text-green-600 font-medium">
                                          Réglé : {totalRegle} €
                                        </span>
                                      )}
                                      {remaining > 0 ? (
                                        <>
                                          <span className="text-secondary font-medium">
                                            Dû : {remaining.toFixed(2)} €
                                          </span>
                                          {stripeEnabled && (
                                            <StripeButton refDossier={summary.refDossier} agencySlug={agencySlug || 'dax'} verifiedPostalCode={verifiedPostalCode} />
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" /> Réglé
                                          {paymentStatus?.paidDate && (
                                            <span className="text-[9px] md:text-xs">
                                              le {format(paymentStatus.paidDate, 'dd/MM/yyyy', { locale: fr })}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            ) : (
                              <>
                                {(() => {
                                  if (summary.financier.isSommesPercues === 'oui' && totalPaidFromStripe === 0) {
                                    return <span className="text-green-600 font-medium">✓ Réglé</span>;
                                  }
                                  const duAmount = summary.financier.aPercevoir - totalPaidFromStripe;
                                  if (totalPaidFromStripe > 0 && duAmount <= 0) {
                                    return (
                                      <span className="text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Réglé
                                        {paymentStatus?.paidDate && (
                                          <span className="text-[9px] md:text-xs">le {format(paymentStatus.paidDate, 'dd/MM/yyyy', { locale: fr })}</span>
                                        )}
                                      </span>
                                    );
                                  }
                                  if (duAmount > 0) {
                                    return (
                                      <>
                                        {totalPaidFromStripe > 0 && <span className="text-green-600 font-medium">Réglé : {totalPaidFromStripe} €</span>}
                                        <span className="text-secondary font-medium">Dû : {duAmount.toFixed(2)} €</span>
                                        {stripeEnabled && <StripeButton refDossier={summary.refDossier} agencySlug={agencySlug || 'dax'} verifiedPostalCode={verifiedPostalCode} />}
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {summary.financier.aPercevoir > 0 && (
                              <span className="text-foreground font-semibold">
                                Montant total : {summary.financier.aPercevoir} €
                              </span>
                            )}
                            {summary.mode === 'direct' && summary.financier.acompte > 0 && (
                              <span className={`font-medium ${summary.financier.isSommesPercues === 'oui' ? 'text-green-600' : 'text-secondary'}`}>
                                Acompte{summary.financier.isSommesPercues === 'oui' ? ' réglé' : ''} : {summary.financier.acompte} €
                              </span>
                            )}
                            {(() => {
                              const restantDu = summary.financier.aPercevoir - summary.financier.acompte - totalPaidFromStripe;
                              if (summary.financier.isSommesPercues === 'oui' && totalPaidFromStripe === 0) {
                                return <span className="text-green-600 font-medium">✓ Réglé</span>;
                              }
                              if (totalPaidFromStripe > 0 && restantDu <= 0) {
                                return (
                                  <span className="text-green-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Réglé
                                    {paymentStatus?.paidDate && (
                                      <span className="text-[9px] md:text-xs">le {format(paymentStatus.paidDate, 'dd/MM/yyyy', { locale: fr })}</span>
                                    )}
                                  </span>
                                );
                              }
                              if (restantDu > 0) {
                                return (
                                  <>
                                    {totalPaidFromStripe > 0 && <span className="text-green-600 font-medium">Réglé : {totalPaidFromStripe} €</span>}
                                    <span className="text-secondary font-medium">Restant dû : {restantDu.toFixed(2)} €</span>
                                    {stripeEnabled && <StripeButton refDossier={summary.refDossier} agencySlug={agencySlug || 'dax'} verifiedPostalCode={verifiedPostalCode} />}
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons actions client */}
                <div className="flex items-center justify-center gap-2">
                  <PhotoUploadDialog
                    refDossier={summary.refDossier}
                    clientName={clientName}
                    agencySlug={agencySlug}
                    verifiedPostalCode={verifiedPostalCode}
                  />
                  {summary.universes?.includes('renovation') && (
                    <HumidityWizardDialog
                      refDossier={summary.refDossier}
                      clientName={clientName}
                      agencySlug={agencySlug}
                      verifiedPostalCode={verifiedPostalCode}
                    />
                  )}
                </div>
              </div>

              {/* Informations client + coordonnées */}
              <div className="grid md:grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-border">
                {/* Encart gauche - Identité et adresse */}
                <div className="group/tile rounded-xl bg-accent/40 p-2 md:p-4
                  border border-primary/10
                  transition-all duration-300 hover:bg-accent/60 hover:shadow-sm hover:-translate-y-0.5">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/15 
                        flex items-center justify-center">
                        <User className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                      </div>
                      <span className="text-xs md:text-base font-display font-semibold text-primary leading-tight">
                        IDENTITÉ
                      </span>
                    </div>
                    <div className="ml-7 md:ml-10 space-y-1 md:space-y-2">
                      <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight">
                        {clientName}
                      </p>
                    </div>
                    
                    <div className="flex items-start gap-1 md:gap-2 pt-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/15 
                        flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight">
                          {summary.clientInfo.adresse}
                        </p>
                        <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">
                          {summary.clientInfo.codePostal} {summary.clientInfo.ville}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Encart droite - Contact */}
                <div className="group/tile rounded-xl bg-primary-light/8 p-2 md:p-4
                  border border-primary-light/15
                  transition-all duration-300 hover:bg-primary-light/15 hover:shadow-sm hover:-translate-y-0.5">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-1 md:gap-2 justify-between">
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary-light/20 
                          flex items-center justify-center">
                          <Mail className="h-3 w-3 md:h-4 md:w-4 text-primary-light flex-shrink-0" />
                        </div>
                        <span className="text-xs md:text-base font-display font-semibold text-primary-light leading-tight">
                          CONTACT
                        </span>
                      </div>
                      <ContactUpdateDialog
                        refDossier={summary.refDossier}
                        clientName={clientName}
                        currentEmail={summary.clientInfo.email}
                        currentFixe={summary.clientInfo.telephone}
                        currentPortable={summary.clientInfo.tel2}
                        agencySlug={agencySlug}
                      />
                    </div>
                    
                    {/* Email */}
                    <div className="ml-7 md:ml-10">
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5">Email</p>
                      <div className={`${summary.clientInfo.email ? 'bg-accent/50 border-primary/15' : 'bg-muted/30 border-muted'} border rounded-lg p-1.5 md:p-2`}>
                        <p className="text-[10px] md:text-xs text-foreground font-medium break-all leading-tight">
                          {summary.clientInfo.email || <span className="italic text-muted-foreground">Non renseigné</span>}
                        </p>
                      </div>
                    </div>

                    {/* Téléphones */}
                    <div className="ml-7 md:ml-10">
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5">Téléphones</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className={`${summary.clientInfo.telephone ? 'bg-accent/50 border-primary/15' : 'bg-muted/30 border-muted'} border rounded-lg p-1.5 md:p-2`}>
                          <p className="text-[9px] md:text-[10px] text-muted-foreground">Fixe</p>
                          <p className="text-[10px] md:text-xs text-foreground font-medium leading-tight">
                            {summary.clientInfo.telephone || <span className="italic text-muted-foreground">—</span>}
                          </p>
                        </div>
                        <div className={`${summary.clientInfo.tel2 ? 'bg-accent/50 border-primary/15' : 'bg-muted/30 border-muted'} border rounded-lg p-1.5 md:p-2`}>
                          <p className="text-[9px] md:text-[10px] text-muted-foreground">Portable</p>
                          <p className="text-[10px] md:text-xs text-foreground font-medium leading-tight">
                            {summary.clientInfo.tel2 || <span className="italic text-muted-foreground">—</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
