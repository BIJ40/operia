/**
 * Admin FAQ Management Page
 * CRUD operations for FAQ items
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Plus, Pencil, Trash2, Search, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeQuery, safeMutation } from '@/lib/safeQuery';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  context_type: string;
  category_id: string | null;
  is_published: boolean;
  role_cible: string | null;
  display_order: number;
  created_at: string;
  category?: { id: string; label: string } | null;
}

interface FaqCategory {
  id: string;
  label: string;
  slug: string;
}

const CONTEXT_OPTIONS = [
  { value: 'apogee', label: 'Apogée' },
  { value: 'apporteurs', label: 'Apporteurs' },
  { value: 'helpconfort', label: 'HelpConfort' },
  { value: 'documents', label: 'Documents' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'metier', label: 'Métier' },
  { value: 'auto', label: 'Auto' },
] as const;

type ContextType = 'apogee' | 'apporteurs' | 'helpconfort' | 'documents' | 'franchise' | 'metier' | 'auto';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tous les utilisateurs' },
  { value: 'base_user', label: 'Utilisateurs de base (N0+)' },
  { value: 'franchisee_user', label: 'Équipe agence (N1+)' },
  { value: 'franchisee_admin', label: 'Dirigeants (N2+)' },
  { value: 'franchisor_user', label: 'Franchiseur (N3+)' },
  { value: 'platform_admin', label: 'Admin plateforme (N5+)' },
];

export default function AdminFaq() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextFilter, setContextFilter] = useState<string>('all');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [formData, setFormData] = useState<{
    question: string;
    answer: string;
    context_type: ContextType;
    category_id: string;
    is_published: boolean;
    role_cible: string;
  }>({
    question: '',
    answer: '',
    context_type: 'apogee',
    category_id: '',
    is_published: true,
    role_cible: 'all',
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    
    const [itemsResult, categoriesResult] = await Promise.all([
      safeQuery<FaqItem[]>(
        supabase
          .from('faq_items')
          .select('*, category:faq_categories(id, label)')
          .order('display_order', { ascending: true }),
        'ADMIN_FAQ_LOAD_ITEMS'
      ),
      safeQuery<FaqCategory[]>(
        supabase.from('faq_categories').select('*').order('display_order'),
        'ADMIN_FAQ_LOAD_CATEGORIES'
      ),
    ]);

    if (itemsResult.success) setItems(itemsResult.data || []);
    if (categoriesResult.success) setCategories(categoriesResult.data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery.trim() || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContext = contextFilter === 'all' || item.context_type === contextFilter;
    return matchesSearch && matchesContext;
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({
      question: '',
      answer: '',
      context_type: 'apogee',
      category_id: '',
      is_published: true,
      role_cible: 'all',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: FaqItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      context_type: item.context_type as ContextType,
      category_id: item.category_id || '',
      is_published: item.is_published,
      role_cible: item.role_cible || 'all',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Veuillez remplir la question et la réponse');
      return;
    }

    setSaving(true);

    const data = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      context_type: formData.context_type,
      category_id: formData.category_id || null,
      is_published: formData.is_published,
      role_cible: formData.role_cible === 'all' ? null : formData.role_cible,
    };

    if (editingItem) {
      const result = await safeMutation(
        supabase.from('faq_items').update(data).eq('id', editingItem.id),
        'ADMIN_FAQ_UPDATE'
      );
      if (result.success) {
        toast.success('FAQ mise à jour');
        setDialogOpen(false);
        loadData();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } else {
      const result = await safeMutation(
        supabase.from('faq_items').insert({
          ...data,
          display_order: items.length,
        }),
        'ADMIN_FAQ_CREATE'
      );
      if (result.success) {
        toast.success('FAQ créée');
        setDialogOpen(false);
        loadData();
      } else {
        toast.error('Erreur lors de la création');
      }
    }

    setSaving(false);
  };

  const handleDelete = async (item: FaqItem) => {
    if (!confirm(`Supprimer la FAQ "${item.question.substring(0, 50)}..." ?`)) return;

    const result = await safeMutation(
      supabase.from('faq_items').delete().eq('id', item.id),
      'ADMIN_FAQ_DELETE'
    );

    if (result.success) {
      toast.success('FAQ supprimée');
      loadData();
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublished = async (item: FaqItem) => {
    const result = await safeMutation(
      supabase.from('faq_items').update({ is_published: !item.is_published }).eq('id', item.id),
      'ADMIN_FAQ_TOGGLE_PUBLISH'
    );

    if (result.success) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: !i.is_published } : i));
      toast.success(item.is_published ? 'FAQ dépubliée' : 'FAQ publiée');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des FAQ</h1>
          <p className="text-muted-foreground">Créer et gérer les questions fréquemment posées</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle FAQ
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={contextFilter} onValueChange={setContextFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Contexte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous contextes</SelectItem>
                {CONTEXT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {filteredItems.length} FAQ{filteredItems.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune FAQ trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead>Contexte</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="line-clamp-2">{item.question}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CONTEXT_OPTIONS.find(c => c.value === item.context_type)?.label || item.context_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.category?.label || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublished(item)}
                        className={item.is_published ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {item.is_published ? (
                          <><Eye className="h-4 w-4 mr-1" /> Publié</>
                        ) : (
                          <><EyeOff className="h-4 w-4 mr-1" /> Masqué</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Quelle est la question ?"
              />
            </div>

            <div>
              <Label>Réponse</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="La réponse détaillée..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contexte</Label>
                <Select
                  value={formData.context_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, context_type: v as ContextType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Catégorie</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune catégorie</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Visible par</Label>
              <Select
                value={formData.role_cible}
                onValueChange={(v) => setFormData(prev => ({ ...prev, role_cible: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_published: v }))}
              />
              <Label htmlFor="is_published">Publier immédiatement</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
