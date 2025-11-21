import { useState, useRef } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FAQ() {
  const { blocks, isEditMode, addBlock, updateBlock, deleteBlock } = useEditor();
  const { isAdmin } = useAuth();
  
  // Récupérer la catégorie FAQ principale
  const faqCategory = blocks.find(b => b.type === 'category' && b.slug === 'faq');
  
  // Récupérer les sous-catégories (thèmes)
  const faqSubcategories = blocks
    .filter(b => b.type === 'category' && b.parentId === faqCategory?.id)
    .sort((a, b) => a.order - b.order);
  
  // Grouper les questions par sous-catégorie
  const questionsByCategory = faqSubcategories.map(subcat => ({
    category: subcat,
    items: blocks
      .filter(b => b.type === 'section' && b.parentId === subcat.id)
      .sort((a, b) => a.order - b.order)
  }));

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Filtrer les questions selon la recherche
  const filteredQuestionsByCategory = questionsByCategory.map(({ category, items }) => {
    return {
      category,
      items: items.filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query)
        );
      }),
    };
  });

  // Compter le nombre total de résultats
  const totalResults = filteredQuestionsByCategory.reduce(
    (sum, { items }) => sum + items.length, 
    0
  );

  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    
    if (element) {
      const offset = 150;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Fonction pour surligner le texte recherché
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-foreground px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Créer la catégorie FAQ si elle n'existe pas
  const ensureFaqCategory = async () => {
    if (!faqCategory) {
      await addBlock({
        type: 'category',
        title: 'FAQ',
        content: '',
        icon: 'HelpCircle',
        colorPreset: 'blue',
        slug: 'faq',
        parentId: null,
        attachments: [],
        order: 999,
      });
    }
  };

  const handleAdd = async (subcategoryId: string) => {
    await ensureFaqCategory();
    
    const subcategory = blocks.find(b => b.id === subcategoryId);
    if (subcategory) {
      const itemsCount = blocks.filter(b => b.type === 'section' && b.parentId === subcategoryId).length;
      
      const newBlockId = await addBlock({
        type: 'section',
        title: 'Nouvelle question',
        content: 'Nouvelle réponse',
        colorPreset: 'white',
        parentId: subcategoryId,
        slug: `faq-${Date.now()}`,
        attachments: [],
        order: itemsCount,
        contentType: 'section',
      });

      if (newBlockId) {
        setEditingId(newBlockId);
        setEditQuestion('Nouvelle question');
        setEditAnswer('Nouvelle réponse');
        setEditDialogOpen(true);
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditQuestion(item.title);
    setEditAnswer(item.content);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateBlock(editingId, {
        title: editQuestion,
        content: editAnswer,
      });
      setEditDialogOpen(false);
      setEditingId(null);
      setEditQuestion('');
      setEditAnswer('');
    }
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteBlock(itemToDelete);
      setItemToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Foire Aux Questions
          </h1>
          
          {/* Boutons de navigation par thème */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {faqSubcategories.map((subcat) => (
              <Button
                key={subcat.id}
                variant="outline"
                size="sm"
                onClick={() => scrollToCategory(subcat.id)}
                className="rounded-full"
              >
                {subcat.title}
              </Button>
            ))}
          </div>

          {/* Barre de recherche */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher dans la FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {totalResults} {totalResults === 1 ? 'résultat trouvé' : 'résultats trouvés'}
              </p>
            )}
          </div>
        </div>

        {filteredQuestionsByCategory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun résultat trouvé pour votre recherche' : 'Aucune question pour le moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredQuestionsByCategory.map(({ category, items }) => (
              <div 
                key={category.id} 
                className="space-y-4"
                ref={(el) => (categoryRefs.current[category.id] = el)}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground scroll-mt-24">
                    {category.title}
                  </h2>
                  {isEditMode && isAdmin && (
                    <Button 
                      onClick={() => handleAdd(category.id)} 
                      size="sm" 
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une question
                    </Button>
                  )}
                </div>
                
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aucune question dans cette catégorie
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {items.map((item) => (
                      <AccordionItem 
                        key={item.id} 
                        value={item.id}
                        className="bg-card border-2 border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-1 text-left font-semibold">
                            {highlightText(item.title, searchQuery)}
                          </AccordionTrigger>
                          {isEditMode && isAdmin && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(item)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(item.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <AccordionContent className="text-muted-foreground pt-4 pb-2">
                          {highlightText(item.content, searchQuery)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier la question' : 'Nouvelle question'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Question</label>
                <Input
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  placeholder="Posez votre question..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Réponse</label>
                <Textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="Écrivez la réponse..."
                  rows={8}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={() => setEditDialogOpen(false)} variant="outline">
                  Annuler
                </Button>
                <Button onClick={handleSave}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette question ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
