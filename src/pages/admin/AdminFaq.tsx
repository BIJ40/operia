/**
 * Admin FAQ Hub - Main page with context tiles and context detail view
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowLeft, HelpCircle } from 'lucide-react';
import {
  useFaqData,
  FaqContextTile,
  FaqCategoryAccordion,
  FaqEditDialog,
  FaqItem,
  ContextType,
  CONTEXT_OPTIONS,
} from '@/components/admin/faq';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AdminFaq() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedContext = searchParams.get('context') as ContextType | null;
  
  const {
    items,
    categories,
    loading,
    contextStats,
    getItemsByContext,
    createItem,
    updateItem,
    deleteItem,
    togglePublished,
  } = useFaqData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [searchResults, setSearchResults] = useState<FaqItem[] | null>(null);

  // Navigate to context
  const goToContext = (context: ContextType) => {
    setSearchParams({ context });
    setSearchResults(null);
  };

  // Back to hub
  const goToHub = () => {
    setSearchParams({});
    setSearchResults(null);
  };

  // Edit handlers
  const openCreateDialog = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: FaqItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    question: string;
    answer: string;
    context_type: string;
    category_id: string | null;
    is_published: boolean;
    role_cible: string | null;
  }) => {
    if (editingItem) {
      return await updateItem(editingItem.id, data);
    } else {
      return await createItem(data);
    }
  };

  // Get current context stats
  const currentContextStats = selectedContext
    ? contextStats.find(s => s.context === selectedContext)
    : null;

  // Get items for current context grouped by category
  const groupedItems = useMemo(() => {
    if (!selectedContext) return {};
    
    // If we have search results, group them
    if (searchResults) {
      const grouped: Record<string, FaqItem[]> = {};
      searchResults.forEach(item => {
        const categoryLabel = item.category?.label || 'Sans catégorie';
        if (!grouped[categoryLabel]) {
          grouped[categoryLabel] = [];
        }
        grouped[categoryLabel].push(item);
      });
      return grouped;
    }
    
    return getItemsByContext(selectedContext);
  }, [selectedContext, searchResults, getItemsByContext]);

  // Total stats
  const totalFaqs = items.length;
  const totalPublished = items.filter(i => i.is_published).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // CONTEXT VIEW
  if (selectedContext && currentContextStats) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={goToHub} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au HUB
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentContextStats.icon}</span>
              <div>
                <h1 className="text-2xl font-bold">{currentContextStats.label}</h1>
                <p className="text-muted-foreground">
                  {currentContextStats.count} Q/R · {currentContextStats.categories} catégories
                </p>
              </div>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle FAQ
          </Button>
        </div>


        {/* Categories Accordions */}
        {Object.keys(groupedItems).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchResults ? 'Aucun résultat trouvé' : 'Aucune FAQ dans ce contexte'}
              </p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer la première FAQ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([categoryName, categoryItems]) => (
                <FaqCategoryAccordion
                  key={categoryName}
                  categoryName={categoryName}
                  items={categoryItems}
                  defaultOpen={Object.keys(groupedItems).length <= 3}
                  onEdit={openEditDialog}
                  onDelete={(item) => deleteItem(item.id)}
                  onTogglePublish={togglePublished}
                />
              ))}
          </div>
        )}

        {/* Edit Dialog */}
        <FaqEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editingItem}
          categories={categories}
          defaultContext={selectedContext}
          onSave={handleSave}
        />
      </div>
    );
  }

  // HUB VIEW
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="HUB FAQ"
        subtitle={`${totalFaqs} FAQ au total · ${totalPublished} publiées`}
        backTo="/admin"
        backLabel="Administration"
        rightElement={
          <Button onClick={openCreateDialog} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle FAQ
          </Button>
        }
      />

      {/* Context Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contextStats.map(stats => (
          <FaqContextTile
            key={stats.context}
            stats={stats}
            onClick={() => goToContext(stats.context)}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <FaqEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  );
}
