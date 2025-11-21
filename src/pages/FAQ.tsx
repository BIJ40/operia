import { useState } from 'react';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2 } from 'lucide-react';
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
  
  // Récupérer la catégorie FAQ et ses sections
  const faqCategory = blocks.find(b => b.type === 'category' && b.slug === 'faq');
  const faqItems = blocks
    .filter(b => b.type === 'section' && b.parentId === faqCategory?.id)
    .sort((a, b) => a.order - b.order);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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

  const handleAdd = async () => {
    await ensureFaqCategory();
    const category = blocks.find(b => b.type === 'category' && b.slug === 'faq');
    
    if (category) {
      const newBlockId = await addBlock({
        type: 'section',
        title: 'Nouvelle question',
        content: 'Nouvelle réponse',
        colorPreset: 'white',
        parentId: category.id,
        slug: `faq-${Date.now()}`,
        attachments: [],
        order: faqItems.length,
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

  const handleEdit = (item: typeof faqItems[0]) => {
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Foire Aux Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Trouvez rapidement des réponses à vos questions
          </p>
        </div>

        {faqItems.length === 0 && !isEditMode ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune question pour le moment</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqItems.map((item) => (
              <AccordionItem 
                key={item.id} 
                value={item.id}
                className="bg-card border-2 border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="flex-1 text-left font-semibold">
                    {item.title}
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
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {isEditMode && isAdmin && (
          <div className="flex justify-center mt-8">
            <Button onClick={handleAdd} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Ajouter une question
            </Button>
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
