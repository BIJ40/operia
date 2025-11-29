import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Upload, Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  getAllApogeeGuides,
  insertApogeeGuide,
  updateApogeeGuide,
  deleteApogeeGuide,
  searchApogeeGuides,
} from '@/lib/apogee-guides-service';
import {
  importApogeeGuidesFromCSV,
  exportApogeeGuidesToCSV,
  generateCSVTemplate,
} from '@/lib/apogee-guides-csv';
import type { ApogeeGuide, ApogeeGuideInsert, ApogeeGuideUpdate } from '@/types/apogeeGuides';

export default function AdminApogeeGuides() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGuide, setEditingGuide] = useState<ApogeeGuide | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ApogeeGuideInsert>({
    titre: '',
    categorie: '',
    section: '',
    texte: '',
    version: '2025-11-29',
    tags: '',
  });

  // Fetch all guides
  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['apogee-guides', searchQuery],
    queryFn: () => searchQuery ? searchApogeeGuides(searchQuery) : getAllApogeeGuides(),
  });

  // Insert mutation
  const insertMutation = useMutation({
    mutationFn: insertApogeeGuide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-guides'] });
      toast.success('Guide créé avec succès');
      closeDialog();
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApogeeGuideUpdate }) => updateApogeeGuide(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-guides'] });
      toast.success('Guide mis à jour');
      closeDialog();
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteApogeeGuide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-guides'] });
      toast.success('Guide supprimé');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const openDialog = (guide?: ApogeeGuide) => {
    if (guide) {
      setEditingGuide(guide);
      setFormData({
        titre: guide.titre,
        categorie: guide.categorie,
        section: guide.section,
        texte: guide.texte,
        version: guide.version || '2025-11-29',
        tags: guide.tags || '',
      });
    } else {
      setEditingGuide(null);
      setFormData({
        titre: '',
        categorie: '',
        section: '',
        texte: '',
        version: '2025-11-29',
        tags: '',
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingGuide(null);
  };

  const handleSubmit = () => {
    if (!formData.titre || !formData.categorie || !formData.section || !formData.texte) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (editingGuide) {
      updateMutation.mutate({ id: editingGuide.id, data: formData });
    } else {
      insertMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce guide ?')) {
      deleteMutation.mutate(id);
    }
  };

  // CSV Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const result = await importApogeeGuidesFromCSV(content);

    if (result.success) {
      toast.success(`${result.imported} guides importés`);
      queryClient.invalidateQueries({ queryKey: ['apogee-guides'] });
    } else {
      toast.error(`Erreur d'import: ${result.errors.join(', ')}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // CSV Export
  const handleExport = () => {
    const csv = exportApogeeGuidesToCSV(guides);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apogee_guides_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'apogee_guides_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Apogee Guides (RAG)</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Template CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={guides.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Nouveau
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans titre, texte, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : guides.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun guide trouvé</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides.map((guide) => (
                    <TableRow key={guide.id}>
                      <TableCell className="font-medium">{guide.titre}</TableCell>
                      <TableCell>{guide.categorie}</TableCell>
                      <TableCell>{guide.section}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{guide.version}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(guide)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(guide.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            {guides.length} guide(s) trouvé(s)
          </p>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuide ? 'Modifier le guide' : 'Nouveau guide'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Titre *</label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Titre du guide"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Version</label>
                <Input
                  value={formData.version || ''}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="2025-11-29"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Catégorie *</label>
                <Input
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  placeholder="Catégorie"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Section *</label>
                <Input
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="Section"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (séparés par des virgules)</label>
              <Input
                value={formData.tags || ''}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Texte *</label>
              <Textarea
                value={formData.texte}
                onChange={(e) => setFormData({ ...formData, texte: e.target.value })}
                placeholder="Contenu du guide..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={insertMutation.isPending || updateMutation.isPending}>
              {editingGuide ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
