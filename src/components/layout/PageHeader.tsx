import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageMetadata, useUpsertPageMetadata } from '@/hooks/use-page-metadata';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GLOBAL_ROLES, GlobalRole } from '@/types/globalRoles';

interface PageHeaderProps {
  pageKey: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  backTo?: string;
  backLabel?: string;
}

// Vérifie si l'utilisateur est N5 ou N6
function canEditPageMetadata(globalRole: GlobalRole | null): boolean {
  if (!globalRole) return false;
  const level = GLOBAL_ROLES[globalRole];
  return level >= 5; // platform_admin (5) ou superadmin (6)
}

export function PageHeader({
  pageKey,
  defaultTitle,
  defaultSubtitle,
  backTo,
  backLabel,
}: PageHeaderProps) {
  const { globalRole } = useAuth();
  const { data: metadata, isLoading } = usePageMetadata(pageKey);
  const upsertMutation = useUpsertPageMetadata();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');

  const canEdit = canEditPageMetadata(globalRole);
  
  // Valeurs affichées (métadonnées ou défauts)
  const title = metadata?.header_title || defaultTitle;
  const subtitle = metadata?.header_subtitle || defaultSubtitle || '';

  const handleOpenEditDialog = () => {
    setEditTitle(title);
    setEditSubtitle(subtitle);
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        page_key: pageKey,
        header_title: editTitle || null,
        header_subtitle: editSubtitle || null,
      });
      toast.success('Header de page mis à jour');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating page metadata:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <>
      <div className="mb-6">
        {/* Lien retour */}
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel || 'Retour'}
          </Link>
        )}

        {/* Titre et bouton édition */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {defaultTitle}
                </span>
              ) : (
                title
              )}
            </h1>
            {subtitle && (
              <p className="mt-1 text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Bouton crayon pour N5/N6 */}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenEditDialog}
              className="shrink-0 text-muted-foreground hover:text-primary"
              title="Modifier le header de page"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le header de page</DialogTitle>
            <DialogDescription>
              Personnalisez le titre et la description affichés sur cette page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre de la page</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={defaultTitle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subtitle">Description (sous-titre)</Label>
              <Textarea
                id="edit-subtitle"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder={defaultSubtitle || 'Description de la page...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
