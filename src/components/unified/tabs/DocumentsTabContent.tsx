/**
 * Contenu de l'onglet Documents - Médiathèque Centralisée v6
 */

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Star, Trash2 } from 'lucide-react';
import { MediaLibraryManager } from '@/components/media-library/MediaLibraryManager';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

type DocumentsSubTab = 'library' | 'shortcuts' | 'trash';

export default function DocumentsTabContent() {
  const [activeSubTab, setActiveSubTab] = useState<DocumentsSubTab>('library');
  const { hasModule } = usePermissions();
  
  // Clés COMPAT_MAP : mediatheque.gerer → divers_documents.gerer, mediatheque.corbeille → divers_documents.corbeille_vider
  const canManage = hasModule('mediatheque.gerer' as any);
  const canEmptyTrash = hasModule('mediatheque.corbeille' as any);

  return (
    <DomainAccentProvider accent="teal">
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as DocumentsSubTab)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Médiathèque centralisée de l'agence</p>
          </div>
          
          <TabsList className="bg-muted/50">
            <TabsTrigger value="library" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Médiathèque
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="shortcuts" className="gap-2">
                <Star className="w-4 h-4" />
                Raccourcis
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="trash" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Corbeille
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="library" className="mt-0">
          <MediaLibraryManager />
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-0">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Raccourcis</h3>
            <p className="text-muted-foreground max-w-md">
              Les fichiers et dossiers épinglés apparaîtront ici pour un accès rapide.
            </p>
          </div>
        </TabsContent>

        {canManage && (
          <TabsContent value="trash" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Corbeille</h3>
              <p className="text-muted-foreground max-w-md">
                Les éléments supprimés sont conservés 30 jours avant d'être définitivement effacés.
                {canEmptyTrash && ' Vous pouvez vider la corbeille définitivement.'}
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
