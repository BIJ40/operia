import { useState, useMemo } from 'react';
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
import { Pencil, Loader2, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Liste des pages connues du système avec leurs valeurs par défaut
const KNOWN_PAGES: Array<{ pageKey: string; defaultTitle: string; defaultSubtitle?: string; route: string }> = [
  // Home
  { pageKey: 'home', defaultTitle: 'Tableau de bord', route: ROUTES.home },
  
  // Help Academy
  { pageKey: 'academy_index', defaultTitle: 'Help! Academy', defaultSubtitle: 'Accédez à tous les guides et ressources', route: ROUTES.academy.index },
  { pageKey: 'academy_apogee', defaultTitle: 'Guide Apogée', defaultSubtitle: 'Tout ce que vous devez savoir sur l\'utilisation d\'Apogée', route: ROUTES.academy.apogee },
  { pageKey: 'academy_apporteurs', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Ressources pour les apporteurs d\'affaires', route: ROUTES.academy.apporteurs },
  { pageKey: 'academy_documents', defaultTitle: 'Base Documentaire', defaultSubtitle: 'Documents et ressources HelpConfort', route: ROUTES.academy.documents },
  
  // Pilotage Agence
  { pageKey: 'pilotage_index', defaultTitle: 'Pilotage Agence', defaultSubtitle: 'Gérez votre activité au quotidien', route: ROUTES.pilotage.index },
  { pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux', defaultSubtitle: 'Suivez vos principaux KPI agence', route: ROUTES.pilotage.indicateurs },
  { pageKey: 'pilotage_indicateurs_apporteurs', defaultTitle: 'Indicateurs Apporteurs', defaultSubtitle: 'Performance de vos apporteurs d\'affaires', route: ROUTES.pilotage.indicateursApporteurs },
  { pageKey: 'pilotage_indicateurs_univers', defaultTitle: 'Indicateurs Univers', defaultSubtitle: 'Répartition par univers de métier', route: ROUTES.pilotage.indicateursUnivers },
  { pageKey: 'pilotage_indicateurs_techniciens', defaultTitle: 'Indicateurs Techniciens', defaultSubtitle: 'Performance de vos techniciens', route: ROUTES.pilotage.indicateursTechniciens },
  { pageKey: 'pilotage_indicateurs_sav', defaultTitle: 'Indicateurs SAV', defaultSubtitle: 'Suivi du service après-vente', route: ROUTES.pilotage.indicateursSav },
  { pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener', defaultSubtitle: 'Suivi des actions et tâches en cours', route: ROUTES.pilotage.actions },
  { pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion', defaultSubtitle: 'Affichage TV pour l\'agence', route: ROUTES.pilotage.diffusion },
  { pageKey: 'pilotage_rh_tech', defaultTitle: 'RH Tech', defaultSubtitle: 'Planning hebdomadaire des techniciens', route: ROUTES.pilotage.rhTech },
  { pageKey: 'pilotage_equipe', defaultTitle: 'Mon équipe', defaultSubtitle: 'Gestion des collaborateurs de l\'agence', route: ROUTES.pilotage.equipe },
  
  // Support
  { pageKey: 'support_index', defaultTitle: 'Support', defaultSubtitle: 'Assistance et demandes', route: ROUTES.support.index },
  { pageKey: 'support_mes_demandes', defaultTitle: 'Mes Demandes', defaultSubtitle: 'Créer et suivre vos demandes de support', route: ROUTES.support.userTickets },
  { pageKey: 'support_console', defaultTitle: 'Console Support', defaultSubtitle: 'Traiter les demandes de support', route: ROUTES.support.console },
  
  // Réseau Franchiseur
  { pageKey: 'reseau_index', defaultTitle: 'Réseau Franchiseur', defaultSubtitle: 'Pilotage du réseau HelpConfort', route: ROUTES.reseau.index },
  { pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau', defaultSubtitle: 'Vue d\'ensemble du réseau', route: ROUTES.reseau.dashboard },
  { pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau', defaultSubtitle: 'Gestion des agences franchisées', route: ROUTES.reseau.agences },
  { pageKey: 'reseau_animateurs', defaultTitle: 'Gestion Animateurs', defaultSubtitle: 'Équipe d\'animation réseau', route: ROUTES.reseau.animateurs },
  { pageKey: 'reseau_stats', defaultTitle: 'Statistiques Réseau', defaultSubtitle: 'KPI consolidés du réseau', route: ROUTES.reseau.stats },
  { pageKey: 'reseau_comparatifs', defaultTitle: 'Comparatifs', defaultSubtitle: 'Comparaison entre agences', route: ROUTES.reseau.comparatifs },
  { pageKey: 'reseau_redevances', defaultTitle: 'Redevances', defaultSubtitle: 'Calcul et suivi des redevances', route: ROUTES.reseau.redevances },
  
  // Administration
  { pageKey: 'admin_index', defaultTitle: 'Administration', defaultSubtitle: 'Configuration du système', route: ROUTES.admin.index },
  { pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs', defaultSubtitle: 'Comptes et permissions', route: ROUTES.admin.users },
  { pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences', defaultSubtitle: 'Configuration des agences', route: ROUTES.admin.agencies },
  { pageKey: 'admin_backup', defaultTitle: 'Sauvegardes', defaultSubtitle: 'Export et import des données', route: ROUTES.admin.backup },
  { pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages', defaultSubtitle: 'Titres et descriptions des pages', route: ROUTES.admin.pageMetadata },
];

export default function AdminPageMetadata() {
  const { data: allMetadata, isLoading } = useAllPageMetadata();
  const upsertMutation = useUpsertPageMetadata();
  
  // Fusionner les pages connues avec les métadonnées existantes
  const mergedPages = useMemo(() => {
    const metadataMap = new Map(allMetadata?.map(m => [m.page_key, m]) || []);
    
    return KNOWN_PAGES.map(page => ({
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
        defaultTitle="Métadonnées des pages"
        defaultSubtitle="Gérez les titres, descriptions et labels de menu de toutes les pages"
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
