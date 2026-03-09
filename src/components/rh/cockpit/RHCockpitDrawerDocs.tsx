/**
 * Contenu du drawer Documents pour le Cockpit RH
 * Permet l'upload direct des documents obligatoires (Permis, CNI)
 */

import React from 'react';
import { DrawerSection } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { FolderOpen, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RHDocumentCell } from '@/components/rh/unified/RHDocumentCell';

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
  // Récupérer les documents depuis media_links via le dossier du collaborateur
  const { data: documents = [] } = useQuery({
    queryKey: ['rh-documents-check', collaborator.id],
    queryFn: async () => {
      // 1. Trouver le dossier du collaborateur
      const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', collaborator.agency_id)
        .eq('slug', `salarie-${collaborator.id}`)
        .is('deleted_at', null)
        .maybeSingle();

      if (!folder) return [];

      // 2. Récupérer aussi les sous-dossiers
      const { data: subFolders } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', collaborator.agency_id)
        .eq('parent_id', folder.id)
        .is('deleted_at', null);

      const folderIds = [folder.id, ...(subFolders || []).map(f => f.id)];

      // 3. Chercher les fichiers uniquement dans ces dossiers
      const { data, error } = await supabase
        .from('media_links')
        .select(`
          id,
          label,
          asset:media_assets!inner(file_name)
        `)
        .in('folder_id', folderIds)
        .is('deleted_at', null);
      
      if (error) throw error;
      
      // Déterminer le type de document à partir du label ou du nom de fichier
      return (data || []).map(d => {
        const name = ((d.label || (d.asset as any)?.file_name) || '').toLowerCase();
        let docType: string | null = null;
        if (name.includes('permis') || name.includes('license') || name.includes('driving')) {
          docType = 'permis';
        } else if (name.includes('cni') || name.includes('identité') || name.includes('identity') || name.includes('id_card')) {
          docType = 'cni';
        }
        return { id: d.id, doc_type: docType };
      }).filter(d => d.doc_type !== null);
    },
  });

  // Vérifier les documents obligatoires
  const docStatus = REQUIRED_DOCS.map(doc => ({
    ...doc,
    present: documents.some(d => d.doc_type === doc.key),
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

      {/* Liste des documents obligatoires avec upload */}
      <DrawerSection title="Documents obligatoires" className="mt-6">
        <div className="space-y-3">
          {docStatus.map(doc => (
            <div 
              key={doc.key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                doc.present 
                  ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800' 
                  : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{doc.icon}</span>
                <span className="text-sm font-medium">{doc.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={doc.present ? 'default' : 'secondary'} className="text-xs">
                  {doc.present ? '✓ Présent' : 'Manquant'}
                </Badge>
                <RHDocumentCell
                  collaboratorId={collaborator.id}
                  agencyId={collaborator.agency_id}
                  docType={doc.key as 'permis' | 'cni'}
                />
              </div>
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
