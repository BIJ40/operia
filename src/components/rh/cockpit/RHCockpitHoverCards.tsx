/**
 * HoverCards informatifs pour le tableau cockpit RH
 * Affiche des détails au survol de chaque cellule
 */

import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { RHCollaborator } from '@/types/rh-suivi';
import { CockpitIndicators } from '@/hooks/rh/useRHCockpitIndicators';
import { Phone, Mail, User, Shield, Car, FileText, Award, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSensitiveData } from '@/hooks/useSensitiveData';

interface HoverCardWrapperProps {
  children: React.ReactNode;
  content: React.ReactNode;
  hasContent?: boolean;
}

function HoverCardWrapper({ children, content, hasContent = true }: HoverCardWrapperProps) {
  if (!hasContent) return <>{children}</>;
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-auto max-w-xs p-3 text-sm z-[100]"
        sideOffset={4}
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Contact HoverCard - Email et téléphone */
export function ContactHoverCard({ 
  collaborator, 
  children 
}: { 
  collaborator: RHCollaborator; 
  children: React.ReactNode;
}) {
  const hasEmail = !!collaborator.email;
  const hasPhone = !!collaborator.phone;
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-2">
          <p className="font-medium text-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Contact
          </p>
          <div className="space-y-1.5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className={cn("h-3.5 w-3.5", hasEmail ? "text-emerald-500" : "text-rose-400")} />
              <span className="truncate">{collaborator.email || 'Non renseigné'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className={cn("h-3.5 w-3.5", hasPhone ? "text-emerald-500" : "text-rose-400")} />
              <span>{collaborator.phone || 'Non renseigné'}</span>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}

/** ICE HoverCard - Contact d'urgence avec données déchiffrées */
export function ICEHoverCard({ 
  collaborator, 
  children 
}: { 
  collaborator: RHCollaborator; 
  children: React.ReactNode;
}) {
  const { sensitiveData, isLoading } = useSensitiveData(collaborator.id);
  
  const hasContact = !!sensitiveData?.emergency_contact;
  const hasPhone = !!sensitiveData?.emergency_phone;
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-2">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            Contact d'urgence (ICE)
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : (
            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className={cn("h-3.5 w-3.5", hasContact ? "text-emerald-500" : "text-rose-400")} />
                <span>{sensitiveData?.emergency_contact || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className={cn("h-3.5 w-3.5", hasPhone ? "text-emerald-500" : "text-rose-400")} />
                <span>{sensitiveData?.emergency_phone || 'Non renseigné'}</span>
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}

/** EPI HoverCard - Liste des EPI */
export function EPIHoverCard({ 
  collaborator, 
  children 
}: { 
  collaborator: RHCollaborator; 
  children: React.ReactNode;
}) {
  const epi = collaborator.epi_profile;
  
  if (!epi) {
    return (
      <HoverCardWrapper
        content={
          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              EPI & Tailles
            </p>
            <p className="text-muted-foreground">Aucun profil EPI configuré</p>
          </div>
        }
      >
        {children}
      </HoverCardWrapper>
    );
  }
  
  const tailles = [
    { label: 'Haut', value: epi.taille_haut },
    { label: 'Bas', value: epi.taille_bas },
    { label: 'Pointure', value: epi.pointure },
    { label: 'Gants', value: epi.taille_gants },
  ].filter(t => t.value);
  
  const epiItems = epi.epi_requis || [];
  const epiRemis = epi.epi_remis || [];
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-3">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            EPI & Tailles
          </p>
          
          {/* Tailles */}
          {tailles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Tailles</p>
              <div className="flex flex-wrap gap-1.5">
                {tailles.map(t => (
                  <span key={t.label} className="px-2 py-0.5 bg-secondary rounded text-xs">
                    {t.label}: {t.value}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* EPI */}
          {epiItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                EPI ({epiRemis.length}/{epiItems.length} remis)
              </p>
              <div className="flex flex-wrap gap-1">
                {epiItems.slice(0, 6).map(item => (
                  <span 
                    key={item} 
                    className={cn(
                      "px-1.5 py-0.5 rounded text-xs",
                      epiRemis.includes(item) 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    )}
                  >
                    {item}
                  </span>
                ))}
                {epiItems.length > 6 && (
                  <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                    +{epiItems.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {tailles.length === 0 && epiItems.length === 0 && (
            <p className="text-muted-foreground text-xs">Aucune donnée EPI</p>
          )}
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}

/** Parc HoverCard - Véhicule */
export function ParcHoverCard({ 
  collaborator, 
  children 
}: { 
  collaborator: RHCollaborator; 
  children: React.ReactNode;
}) {
  const assets = collaborator.assets;
  const hasVehicle = !!assets?.vehicule_attribue;
  
  // Parse le JSON du véhicule
  let vehicleInfo: { marque?: string; modele?: string; immatriculation?: string } | null = null;
  if (hasVehicle && assets?.vehicule_attribue) {
    try {
      vehicleInfo = typeof assets.vehicule_attribue === 'string' 
        ? JSON.parse(assets.vehicule_attribue) 
        : assets.vehicule_attribue;
    } catch {
      vehicleInfo = null;
    }
  }
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-2">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Car className="h-3.5 w-3.5" />
            Véhicule
          </p>
          {hasVehicle && vehicleInfo ? (
            <div className="space-y-1 text-muted-foreground">
              {vehicleInfo.immatriculation && (
                <p className="font-mono text-sm font-semibold text-foreground">
                  {vehicleInfo.immatriculation}
                </p>
              )}
              {(vehicleInfo.marque || vehicleInfo.modele) && (
                <p className="text-sm">
                  {[vehicleInfo.marque, vehicleInfo.modele].filter(Boolean).join(' ')}
                </p>
              )}
              {!vehicleInfo.immatriculation && !vehicleInfo.modele && !vehicleInfo.marque && (
                <p className="text-sm">Véhicule attribué</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun véhicule attribué</p>
          )}
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}

/** Documents HoverCard */
export function DocsHoverCard({ 
  collaborator,
  indicators,
  children 
}: { 
  collaborator: RHCollaborator;
  indicators: CockpitIndicators;
  children: React.ReactNode;
}) {
  const hasPermis = !!collaborator.permis;
  const hasCNI = !!collaborator.cni;
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-2">
          <p className="font-medium text-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Documents ({indicators.documents.count})
          </p>
          <div className="space-y-1.5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={hasPermis ? "text-emerald-500" : "text-rose-400"}>
                {hasPermis ? '✓' : '✗'}
              </span>
              <span>Permis de conduire</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasCNI ? "text-emerald-500" : "text-rose-400"}>
                {hasCNI ? '✓' : '✗'}
              </span>
              <span>Carte d'identité</span>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}

/** Compétences HoverCard */
export function CompetencesHoverCard({ 
  collaborator, 
  children 
}: { 
  collaborator: RHCollaborator; 
  children: React.ReactNode;
}) {
  const competencies = collaborator.competencies;
  const techniques = competencies?.competences_techniques || [];
  const caces = competencies?.caces || [];
  const habilitation = competencies?.habilitation_electrique_statut;
  
  const hasAny = techniques.length > 0 || caces.length > 0 || habilitation;
  
  return (
    <HoverCardWrapper
      content={
        <div className="space-y-3">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Award className="h-3.5 w-3.5" />
            Compétences
          </p>
          
          {!hasAny ? (
            <p className="text-muted-foreground">Aucune compétence renseignée</p>
          ) : (
            <div className="space-y-2">
              {/* Compétences techniques */}
              {techniques.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Techniques</p>
                  <div className="flex flex-wrap gap-1">
                    {techniques.slice(0, 5).map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                        {c}
                      </span>
                    ))}
                    {techniques.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{techniques.length - 5}</span>
                    )}
                  </div>
                </div>
              )}
              
              {/* CACES */}
              {caces.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CACES</p>
                  <div className="flex flex-wrap gap-1">
                    {caces.map((c, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs">
                        {typeof c === 'string' ? c : c.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Habilitation électrique */}
              {habilitation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Habilitation électrique</p>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs">
                    {habilitation}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      {children}
    </HoverCardWrapper>
  );
}
