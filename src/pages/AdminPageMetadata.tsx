import { useState } from 'react';
import { useAllPageMetadata, useUpsertPageMetadata, PageMetadata } from '@/hooks/use-page-metadata';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPageMetadata() {
  const { data: allMetadata, isLoading } = useAllPageMetadata();
  const upsertMutation = useUpsertPageMetadata();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PageMetadata | null>(null);
  const [formData, setFormData] = useState({
    page_key: '',
    header_title: '',
    header_subtitle: '',
    menu_label: '',
  });

  const handleEdit = (item: PageMetadata) => {
    setEditingItem(item);
    setFormData({
      page_key: item.page_key,
      header_title: item.header_title || '',
      header_subtitle: item.header_subtitle || '',
      menu_label: item.menu_label || '',
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      page_key: '',
      header_title: '',
      header_subtitle: '',
      menu_label: '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.page_key.trim()) {
      toast.error('La clé de page est obligatoire');
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        page_key: formData.page_key.trim(),
        header_title: formData.header_title.trim() || null,
        header_subtitle: formData.header_subtitle.trim() || null,
        menu_label: formData.menu_label.trim() || null,
      });
      toast.success(editingItem ? 'Métadonnées mises à jour' : 'Métadonnées créées');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving page metadata:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader
        pageKey="admin_page_metadata"
        defaultTitle="Métadonnées des pages"
        defaultSubtitle="Gérez les titres, descriptions et labels de menu de toutes les pages"
        backTo={ROUTES.admin.index}
        backLabel="Retour Administration"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Pages configurées
            </CardTitle>
            <CardDescription>
              {allMetadata?.length || 0} métadonnée(s) enregistrée(s)
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : allMetadata && allMetadata.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Clé de page</TableHead>
                  <TableHead>Titre (header)</TableHead>
                  <TableHead>Sous-titre</TableHead>
                  <TableHead>Label menu</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMetadata.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.page_key}
                    </TableCell>
                    <TableCell>{item.header_title || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.header_subtitle || '—'}
                    </TableCell>
                    <TableCell>{item.menu_label || '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune métadonnée de page configurée.
              <br />
              <Button variant="link" onClick={handleCreate}>
                Créer la première
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition/création */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier les métadonnées' : 'Nouvelle métadonnée de page'}
            </DialogTitle>
            <DialogDescription>
              Configurez le titre, la description et le label de menu pour une page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="page_key">Clé de page *</Label>
              <Input
                id="page_key"
                value={formData.page_key}
                onChange={(e) => setFormData({ ...formData, page_key: e.target.value })}
                placeholder="ex: pilotage_indicateurs"
                disabled={!!editingItem}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Identifiant unique de la page (snake_case recommandé)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_title">Titre de la page</Label>
              <Input
                id="header_title"
                value={formData.header_title}
                onChange={(e) => setFormData({ ...formData, header_title: e.target.value })}
                placeholder="ex: Indicateurs généraux"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_subtitle">Sous-titre / Description</Label>
              <Textarea
                id="header_subtitle"
                value={formData.header_subtitle}
                onChange={(e) => setFormData({ ...formData, header_subtitle: e.target.value })}
                placeholder="ex: Suivez vos principaux KPI agence"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu_label">Label menu (navigation)</Label>
              <Input
                id="menu_label"
                value={formData.menu_label}
                onChange={(e) => setFormData({ ...formData, menu_label: e.target.value })}
                placeholder="ex: Indicateurs"
              />
              <p className="text-xs text-muted-foreground">
                Texte affiché dans la barre de navigation latérale
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
