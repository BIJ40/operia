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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Pencil, Loader2, FileText, Check, Search, Filter, BookOpen, BarChart3, HeadphonesIcon, Building2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Définition des sections pour regrouper les pages
const PAGE_SECTIONS = [
  { 
    id: 'academy', 
    label: 'Help Academy', 
    icon: BookOpen,
    prefixes: ['academy_', 'apogee_', 'apporteur_', 'helpconfort_'],
    color: 'text-blue-600'
  },
  { 
    id: 'pilotage', 
    label: 'Pilotage Agence', 
    icon: BarChart3,
    prefixes: ['pilotage_'],
    color: 'text-emerald-600'
  },
  { 
    id: 'support', 
    label: 'Support', 
    icon: HeadphonesIcon,
    prefixes: ['support_', 'mes_demandes'],
    color: 'text-orange-600'
  },
  { 
    id: 'reseau', 
    label: 'Réseau Franchiseur', 
    icon: Building2,
    prefixes: ['franchiseur_', 'reseau_'],
    color: 'text-purple-600'
  },
  { 
    id: 'admin', 
    label: 'Administration', 
    icon: Settings,
    prefixes: ['admin_'],
    color: 'text-red-600'
  },
  { 
    id: 'other', 
    label: 'Autres pages', 
    icon: FileText,
    prefixes: [],
    color: 'text-muted-foreground'
  },
];

function getSectionForPage(pageKey: string): string {
  for (const section of PAGE_SECTIONS) {
    if (section.prefixes.some(prefix => pageKey.startsWith(prefix))) {
      return section.id;
    }
  }
  return 'other';
}

export default function AdminPageMetadata() {
  const { data: allMetadata, isLoading } = useAllPageMetadata();
  const upsertMutation = useUpsertPageMetadata();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'custom' | 'default'>('all');
  
  // Fusionner les pages connues avec les métadonnées existantes
  const mergedPages = useMemo(() => {
    const metadataMap = new Map(allMetadata?.map(m => [m.page_key, m]) || []);
    
    return PAGE_DEFAULTS.map(page => ({
      ...page,
      metadata: metadataMap.get(page.pageKey) || null,
      hasCustomMetadata: metadataMap.has(page.pageKey),
      section: getSectionForPage(page.pageKey),
    }));
  }, [allMetadata]);
  
  // Filtrer les pages
  const filteredPages = useMemo(() => {
    return mergedPages.filter(page => {
      // Filtre de recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          page.pageKey.toLowerCase().includes(query) ||
          page.defaultTitle.toLowerCase().includes(query) ||
          page.metadata?.header_title?.toLowerCase().includes(query) ||
          page.defaultSubtitle?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Filtre de statut
      if (filterStatus === 'custom' && !page.hasCustomMetadata) return false;
      if (filterStatus === 'default' && page.hasCustomMetadata) return false;
      
      return true;
    });
  }, [mergedPages, searchQuery, filterStatus]);
  
  // Grouper par section
  const pagesBySection = useMemo(() => {
    const grouped: Record<string, typeof filteredPages> = {};
    for (const section of PAGE_SECTIONS) {
      grouped[section.id] = filteredPages.filter(p => p.section === section.id);
    }
    return grouped;
  }, [filteredPages]);
  
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
  
  // Sections avec des pages (après filtrage)
  const activeSections = PAGE_SECTIONS.filter(s => pagesBySection[s.id]?.length > 0);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader
        pageKey="admin_page_metadata"
        backTo={ROUTES.admin.index}
        backLabel="Retour Administration"
      />

      {/* Stats et filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-2xl font-bold">{customizedCount}</div>
                <div className="text-sm text-muted-foreground">pages personnalisées</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold">{mergedPages.length - customizedCount}</div>
                <div className="text-sm text-muted-foreground">pages par défaut</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold">{mergedPages.length}</div>
                <div className="text-sm text-muted-foreground">pages total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filterStatus === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('custom')}
            className="gap-1"
          >
            <Check className="w-3 h-3" />
            Personnalisées
          </Button>
          <Button
            variant={filterStatus === 'default' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('default')}
          >
            Par défaut
          </Button>
        </div>
      </div>

      {/* Liste des pages par section */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeSections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune page ne correspond à votre recherche
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={activeSections.map(s => s.id)} className="space-y-3">
          {activeSections.map((section) => {
            const pages = pagesBySection[section.id];
            const customCount = pages.filter(p => p.hasCustomMetadata).length;
            const Icon = section.icon;
            
            return (
              <AccordionItem 
                key={section.id} 
                value={section.id}
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={cn("w-5 h-5", section.color)} />
                    <span className="font-medium">{section.label}</span>
                    <Badge variant="secondary" className="ml-auto mr-2">
                      {pages.length} page{pages.length > 1 ? 's' : ''}
                    </Badge>
                    {customCount > 0 && (
                      <Badge variant="default" className="gap-1">
                        <Check className="w-3 h-3" />
                        {customCount}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <div
                        key={page.pageKey}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          page.hasCustomMetadata 
                            ? "bg-primary/5 border-primary/20" 
                            : "bg-muted/30 border-transparent hover:border-border"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {page.metadata?.header_title || page.defaultTitle}
                            </span>
                            {page.hasCustomMetadata && (
                              <Badge variant="default" className="text-xs shrink-0">
                                Personnalisé
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {page.metadata?.header_subtitle || page.defaultSubtitle || '—'}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground/70 mt-1">
                            {page.pageKey}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(page)}
                          className="shrink-0"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

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
