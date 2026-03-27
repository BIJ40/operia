/**
 * Drawer latéral universel pour le Cockpit RH
 * Un seul composant réutilisé pour tous les domaines
 * Style LUCCA : fluide, pédagogique, sans friction
 */

import React, { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { IndicatorStatus, INDICATOR_COLORS } from '@/hooks/rh/useRHCockpitIndicators';

// Types de domaines du drawer
export type DrawerDomain = 
  | 'contact' 
  | 'ice' 
  | 'rh' 
  | 'epi' 
  | 'parc' 
  | 'docs' 
  | 'competences';

// Configuration des domaines
const DOMAIN_CONFIG: Record<DrawerDomain, {
  title: string;
  icon: string;
  description: string;
}> = {
  contact: {
    title: 'Coordonnées',
    icon: '📞',
    description: 'Email et téléphone du collaborateur',
  },
  ice: {
    title: 'Contacts d\'urgence',
    icon: '❤️',
    description: 'Personnes à contacter en cas d\'urgence',
  },
  rh: {
    title: 'Informations RH',
    icon: '📋',
    description: 'Dates d\'entrée et de sortie',
  },
  epi: {
    title: 'EPI & Tailles',
    icon: '🦺',
    description: 'Équipements de protection et mensurations',
  },
  parc: {
    title: 'Parc & Matériel',
    icon: '🚐',
    description: 'Véhicule et équipements attribués',
  },
  docs: {
    title: 'Documents',
    icon: '📄',
    description: 'Documents administratifs du collaborateur',
  },
  competences: {
    title: 'Compétences',
    icon: '🎓',
    description: 'Habilitations et qualifications',
  },
};

interface RHCockpitDrawerProps {
  /** Est-ce que le drawer est ouvert */
  open: boolean;
  /** Callback pour fermer le drawer */
  onOpenChange: (open: boolean) => void;
  /** Domaine affiché */
  domain: DrawerDomain;
  /** Collaborateur concerné */
  collaborator: RHCollaborator | null;
  /** Contenu du drawer */
  children: ReactNode;
  /** Statut global de la section (pour le message pédagogique) */
  status?: IndicatorStatus;
  /** Message pédagogique personnalisé */
  pedagogicalMessage?: string;
  /** Nombre d'éléments manquants */
  missingCount?: number;
}

export function RHCockpitDrawer({
  open,
  onOpenChange,
  domain,
  collaborator,
  children,
  status = 'ok',
  pedagogicalMessage,
  missingCount,
}: RHCockpitDrawerProps) {
  const config = DOMAIN_CONFIG[domain];
  
  // Message pédagogique automatique si non fourni
  const message = pedagogicalMessage || (
    status === 'ok' 
      ? '✅ Toutes les informations sont complètes'
      : status === 'warning'
        ? `⚠️ Il manque ${missingCount || 'des'} information${missingCount !== 1 ? 's' : ''}`
        : status === 'error'
          ? '❌ Section incomplète - action requise'
          : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          {/* Header avec nom du collaborateur - style warm-pastel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-blue/20 to-warm-teal/20 flex items-center justify-center">
                <span className="text-xl">{config.icon}</span>
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-warm-blue to-warm-purple bg-clip-text text-transparent">
                  {config.title}
                </DialogTitle>
                {collaborator && (
                  <p className="text-sm text-muted-foreground">
                    {collaborator.first_name} {collaborator.last_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogDescription className="text-sm text-muted-foreground">
            {config.description}
          </DialogDescription>

          {/* Message pédagogique style warm-pastel */}
          {message && status !== 'na' && (
            <div
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border shadow-sm',
                status === 'ok' && 'bg-warm-green/10 border-warm-green/30',
                status === 'warning' && 'bg-warm-orange/10 border-warm-orange/30',
                status === 'error' && 'bg-warm-pink/10 border-warm-pink/30'
              )}
            >
              {status === 'ok' ? (
                <Check className="h-5 w-5 mt-0.5 shrink-0 text-warm-green" />
              ) : status === 'warning' ? (
                <Lightbulb className="h-5 w-5 mt-0.5 shrink-0 text-warm-orange" />
              ) : (
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-warm-pink" />
              )}
              <p className={cn(
                'text-sm font-medium',
                status === 'ok' && 'text-warm-green',
                status === 'warning' && 'text-warm-orange',
                status === 'error' && 'text-warm-pink'
              )}>
                {message}
              </p>
            </div>
          )}
        </DialogHeader>

        {/* Contenu du drawer */}
        <div className="mt-6 space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Section à l'intérieur du drawer
 */
interface DrawerSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function DrawerSection({ title, children, className }: DrawerSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      )}
      {children}
    </div>
  );
}

/**
 * Champ éditable dans le drawer avec feedback auto-save
 */
interface DrawerFieldProps {
  label: string;
  icon?: string;
  children: ReactNode;
  status?: IndicatorStatus;
  hint?: string;
}

export function DrawerField({ label, icon, children, status, hint }: DrawerFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <label className="text-sm font-medium">{label}</label>
        {status && status !== 'na' && (
          <span className={cn('text-xs', INDICATOR_COLORS[status].text)}>
            {status === 'ok' ? '✓' : status === 'warning' ? '⚠' : '✗'}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
