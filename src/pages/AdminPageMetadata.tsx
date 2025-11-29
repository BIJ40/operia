import { useState, useMemo } from 'react';
import { useAllPageMetadata, useUpsertPageMetadata } from '@/hooks/use-page-metadata';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { PAGE_DEFAULTS } from '@/config/pageDefaults';
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
import { Pencil, Loader2, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function AdminPageMetadata() {
  const { data: allMetadata, isLoading } = useAllPageMetadata();
  const upsertMutation = useUpsertPageMetadata();
  
  // Fusionner les pages connues avec les métadonnées existantes
  const mergedPages = useMemo(() => {
    const metadataMap = new Map(allMetadata?.map(m => [m.page_key, m]) || []);
    
    return PAGE_DEFAULTS.map(page => ({
      ...page,
      metadata: metadataMap.get(page.pageKey) || null,
      hasCustomMetadata: metadataMap.has(page.pageKey),
    }));
  }, [allMetadata]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<typeof mergedPages[0] | null>(null);
  const [formData, setFormData] = useState({
    page_key: '',
    header_title: '',
    header_subtitle: '',
    menu_label: '',
  });

  const handleEdit = (page: typeof mergedPages[0]) => {
    setEditingPage(page);
    setFormData({
      page_key: page.pageKey,
      header_title: page.metadata?.header_title || page.defaultTitle,
      header_subtitle: page.metadata?.header_subtitle || page.defaultSubtitle || '',
      menu_label: page.metadata?.menu_label || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        page_key: formData.page_key.trim(),
        header_title: formData.header_title.trim() || null,
        header_subtitle: formData.header_subtitle.trim() || null,
        menu_label: formData.menu_label.trim() || null,
      });
      toast.success('Métadonnées mises à jour');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving page metadata:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  const customizedCount = mergedPages.filter(p => p.hasCustomMetadata).length;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader
        pageKey="admin_page_metadata"
        backTo={ROUTES.admin.index}
        backLabel="Retour Administration"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Pages du système
          </CardTitle>
          <CardDescription>
            {customizedCount} / {mergedPages.length} pages personnalisées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Clé de page</TableHead>
                  <TableHead>Titre affiché</TableHead>
                  <TableHead>Sous-titre</TableHead>
                  <TableHead className="w-[100px]">Statut</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedPages.map((page) => (
                  <TableRow key={page.pageKey}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {page.pageKey}
                    </TableCell>
                    <TableCell>
                      {page.metadata?.header_title || page.defaultTitle}
                      {page.hasCustomMetadata && page.metadata?.header_title && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (défaut: {page.defaultTitle})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {page.metadata?.header_subtitle || page.defaultSubtitle || '—'}
                    </TableCell>
                    <TableCell>
                      {page.hasCustomMetadata ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="w-3 h-3" />
                          Personnalisé
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Par défaut</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(page)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Modifier les métadonnées
            </DialogTitle>
            <DialogDescription>
              Page : <span className="font-mono">{editingPage?.pageKey}</span>
              <br />
              Route : <span className="text-primary">{editingPage?.route}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="header_title">Titre de la page</Label>
              <Input
                id="header_title"
                value={formData.header_title}
                onChange={(e) => setFormData({ ...formData, header_title: e.target.value })}
                placeholder={editingPage?.defaultTitle}
              />
              <p className="text-xs text-muted-foreground">
                Par défaut : {editingPage?.defaultTitle}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_subtitle">Sous-titre / Description</Label>
              <Textarea
                id="header_subtitle"
                value={formData.header_subtitle}
                onChange={(e) => setFormData({ ...formData, header_subtitle: e.target.value })}
                placeholder={editingPage?.defaultSubtitle || 'Aucune description par défaut'}
                rows={3}
              />
              {editingPage?.defaultSubtitle && (
                <p className="text-xs text-muted-foreground">
                  Par défaut : {editingPage.defaultSubtitle}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu_label">Label menu (navigation)</Label>
              <Input
                id="menu_label"
                value={formData.menu_label}
                onChange={(e) => setFormData({ ...formData, menu_label: e.target.value })}
                placeholder="Texte affiché dans le menu"
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser le label par défaut de la navigation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
