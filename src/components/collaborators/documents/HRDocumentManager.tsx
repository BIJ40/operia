/**
 * HRDocumentManager - Gestionnaire de documents collaborateur
 * Utilise MediaLibraryPortal pour une vue Finder unifiée
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaLibraryPortal } from '@/components/media-library/MediaLibraryPortal';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

interface HRDocumentManagerProps {
  collaboratorId: string;
  canManage: boolean;
}

export function HRDocumentManager({ collaboratorId, canManage }: HRDocumentManagerProps) {
  const { agencyId } = useAuth();

  // Trouver le dossier du collaborateur dans la médiathèque
  const { data: collaboratorFolder, isLoading } = useQuery({
    queryKey: ['collaborator-media-folder', collaboratorId, agencyId],
    queryFn: async () => {
      if (!collaboratorId || !agencyId) return null;

      // Le slug du dossier collaborateur est "salarie-{collaborator_id}"
      const targetSlug = `salarie-${collaboratorId}`;
      
      // Chercher le dossier "Salariés" (parent)
      const { data: salariesFolder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('slug', 'salaries')
        .is('parent_id', null)
        .single();

      if (!salariesFolder) {
        console.warn('[HRDocumentManager] Dossier "Salariés" non trouvé');
        return null;
      }

      // Chercher le dossier du collaborateur
      const { data: collabFolder } = await supabase
        .from('media_folders')
        .select('id, name, slug')
        .eq('agency_id', agencyId)
        .eq('slug', targetSlug)
        .eq('parent_id', salariesFolder.id)
        .single();

      return collabFolder;
    },
    enabled: !!collaboratorId && !!agencyId,
  });

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-helpconfort-blue">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Chargement des documents...</span>
        </CardContent>
      </Card>
    );
  }

  // Si pas de dossier trouvé, afficher un message
  if (!collaboratorFolder) {
    return (
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
            Documents RH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucun dossier trouvé</p>
            <p className="text-sm text-center mt-1">
              Le dossier de ce collaborateur n'existe pas encore dans la médiathèque.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Construire le chemin racine pour le portail
  // Format: salaries/salarie-{collaborator_id}
  const rootPath = `salaries/${collaboratorFolder.slug}`;

  return (
    <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
          Documents RH
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <MediaLibraryPortal
          rootPath={rootPath}
          canManage={canManage}
          showBreadcrumbRoot={false}
          height="500px"
        />
      </CardContent>
    </Card>
  );
}
