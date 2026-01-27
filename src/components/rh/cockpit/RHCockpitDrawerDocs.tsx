/**
 * Contenu du drawer Documents pour le Cockpit RH
 * Version simplifiée pointant vers le Finder existant
 */

import React from 'react';
import { DrawerSection } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { FileText, Upload, FolderOpen, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RHCockpitDrawerDocsProps {
  collaborator: RHCollaborator;
  onOpenFinder?: () => void;
  onUpdate?: () => void;
}

// Documents obligatoires
const REQUIRED_DOCS = [
  { key: 'permis', label: 'Permis de conduire', icon: '🚗' },
  { key: 'cni', label: 'Carte d\'identité', icon: '🪪' },
];

export function RHCockpitDrawerDocs({ collaborator, onOpenFinder, onUpdate }: RHCockpitDrawerDocsProps) {
  // Vérifier les documents obligatoires
  const docStatus = REQUIRED_DOCS.map(doc => ({
    ...doc,
    present: !!collaborator[doc.key as keyof RHCollaborator],
  }));

  const filledCount = docStatus.filter(d => d.present).length;
  const totalCount = REQUIRED_DOCS.length;
  const allComplete = filledCount === totalCount;

  return (
    <>
      {/* Résumé */}
      <DrawerSection>
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          allComplete ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
        )}>
          {allComplete ? (
            <Check className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <span className={cn(
            'text-sm font-medium',
            allComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
          )}>
            {allComplete 
              ? 'Tous les documents obligatoires sont présents' 
              : `${totalCount - filledCount} document(s) manquant(s)`}
          </span>
        </div>
      </DrawerSection>

      {/* Liste des documents obligatoires */}
      <DrawerSection title="Documents obligatoires" className="mt-6">
        <div className="space-y-3">
          {docStatus.map(doc => (
            <div 
              key={doc.key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                doc.present 
                  ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800' 
                  : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{doc.icon}</span>
                <span className="text-sm font-medium">{doc.label}</span>
              </div>
              <Badge variant={doc.present ? 'default' : 'secondary'}>
                {doc.present ? '✓ Présent' : 'Manquant'}
              </Badge>
            </div>
          ))}
        </div>
      </DrawerSection>

      {/* Accès au Finder complet */}
      <DrawerSection className="mt-6">
        <Button 
          onClick={onOpenFinder}
          className="w-full"
          variant="outline"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Ouvrir le gestionnaire de documents
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Accédez à tous les documents du collaborateur
        </p>
      </DrawerSection>
    </>
  );
}
