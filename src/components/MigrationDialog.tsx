import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEditor } from '@/contexts/EditorContext';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapping des IDs HTML vers les slugs actuels
const HTML_ID_TO_SLUG_MAP: Record<string, string> = {
  'intro': 'introduction-principes',
  'theme-client': 'client-apporteur',
  'theme-dossier': 'dossier-projet',
  'theme-rdv': 'rendez-vous-planning',
  'theme-app-tech': 'application-technicien',
  'theme-devis-commandes': 'devis-commandes',
  'theme-facturation': 'facturation-paiements',
  'theme-articles': 'comptabilite-articles',
  'theme-docs-medias': 'documents-mediatheque',
  'theme-workflow': 'workflow-statuts',
  'theme-gestion-listes': 'gestion-listes-pictos',
  'theme-reporting': 'reporting-suivi',
  'faq-global': 'faq-globale-structuree',
  'rt': 'application-technicien',
};

export function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, converted: 0 });
  const [isDone, setIsDone] = useState(false);
  const { blocks, updateBlock } = useEditor();
  const { toast } = useToast();

  const convertLinkToMention = (linkText: string, href: string): string => {
    const anchorId = href.replace('#', '');
    const slug = HTML_ID_TO_SLUG_MAP[anchorId];

    if (!slug) return linkText;

    const block = blocks.find(b => b.slug === slug);
    if (!block) return linkText;

    return `<span data-mention="" data-id="${block.id}" data-label="${block.title}" data-prefix="@" data-slug="${block.slug}" data-type="${block.type}" class="mention cursor-pointer text-primary font-medium hover:underline">@${block.title}</span>`;
  };

  const migrateHTMLContent = (htmlContent: string): string => {
    let result = htmlContent;
    const linkPattern = /<a\s+href="#([^"]+)"[^>]*>([^<]+)<\/a>/g;
    
    result = result.replace(linkPattern, (match, hrefId, linkText) => {
      return convertLinkToMention(linkText, `#${hrefId}`);
    });

    return result;
  };

  const handleMigration = async () => {
    setIsProcessing(true);
    setIsDone(false);
    
    let convertedCount = 0;
    const blocksToUpdate = blocks.filter(b => b.content && b.content.includes('<a href="#'));
    
    setProgress({ current: 0, total: blocksToUpdate.length, converted: 0 });

    for (let i = 0; i < blocksToUpdate.length; i++) {
      const block = blocksToUpdate[i];
      const originalContent = block.content;
      const newContent = migrateHTMLContent(originalContent);

      if (originalContent !== newContent) {
        await updateBlock(block.id, { content: newContent });
        convertedCount++;
        
        // Simuler un délai pour voir la progression
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress({ current: i + 1, total: blocksToUpdate.length, converted: convertedCount });
    }

    setIsProcessing(false);
    setIsDone(true);

    toast({
      title: 'Migration terminée !',
      description: `${convertedCount} bloc(s) converti(s) avec succès.`,
    });

    setTimeout(() => {
      onOpenChange(false);
      setIsDone(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrer les liens HTML vers TipTap</DialogTitle>
          <DialogDescription>
            Cette opération va convertir tous les liens HTML <code>&lt;a href="#..."&gt;</code> en mentions TipTap cliquables.
          </DialogDescription>
        </DialogHeader>

        {isProcessing && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Migration en cours...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progression</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress.converted} bloc(s) converti(s)
              </p>
            </div>
          </div>
        )}

        {isDone && (
          <div className="py-8 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-600" />
            <p className="text-lg font-medium">Migration réussie !</p>
            <p className="text-sm text-muted-foreground">{progress.converted} bloc(s) converti(s)</p>
          </div>
        )}

        {!isProcessing && !isDone && (
          <>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Ce qui va se passer :</p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Détection de tous les liens <code>&lt;a href="#..."&gt;</code></li>
                    <li>• Conversion en mentions TipTap cliquables</li>
                    <li>• Navigation automatique entre sections</li>
                    <li>• Aucune donnée ne sera perdue</li>
                  </ul>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Blocs à traiter : <strong>{blocks.filter(b => b.content && b.content.includes('<a href="#')).length}</strong></p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleMigration}>
                Lancer la migration
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
