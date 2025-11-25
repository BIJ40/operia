import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Accordion } from '@/components/ui/accordion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SectionEditForm } from '@/components/SectionEditForm';
import { TipsEditForm } from '@/components/TipsEditForm';
import { DocumentsList } from '@/components/DocumentsList';
import { useCategory } from '@/hooks/use-category';
import { SortableAccordionItem } from '@/components/category/SortableAccordionItem';

export default function Category() {
  const navigate = useNavigate();
  const {
    category,
    sections,
    availableCategories,
    editingSection,
    deleteDialogOpen,
    editDialogOpen,
    tipsEditDialogOpen,
    showTips,
    showSections,
    accordionStates,
    isAdmin,
    setDeleteDialogOpen,
    setEditDialogOpen,
    setTipsEditDialogOpen,
    setShowTips,
    setShowSections,
    setAccordionStates,
    handleEdit,
    handleSave,
    handleSaveTips,
    confirmDelete,
    handleAddSection,
    handleAddTips,
    handleDuplicate,
    handleMoveToCategory,
    handleDragEnd,
    handleDeleteClick,
  } = useCategory();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  if (!category) {
    return null;
  }

  const filteredSections = sections.filter((section) => {
    if (section.contentType === 'tips') return showTips;
    return showSections;
  });

  const allExpanded = filteredSections.every((s) => accordionStates[s.id]);
  const handleToggleAll = () => {
    const newState = !allExpanded;
    const newStates: Record<string, boolean> = {};
    filteredSections.forEach((s) => {
      newStates[s.id] = newState;
    });
    setAccordionStates(newStates);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/apogee')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {category.title}
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTips(!showTips)}
              className="gap-2"
            >
              {showTips ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTips ? 'Masquer' : 'Afficher'} TIPS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSections(!showSections)}
              className="gap-2"
            >
              {showSections ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSections ? 'Masquer' : 'Afficher'} Tutoriels
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              className="gap-2"
            >
              {allExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {allExpanded ? 'Tout réduire' : 'Tout déplier'}
            </Button>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6 flex gap-2">
            <Button onClick={handleAddSection} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une section
            </Button>
            <Button onClick={handleAddTips} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un TIPS
            </Button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <Accordion
              type="multiple"
              value={Object.entries(accordionStates)
                .filter(([_, isOpen]) => isOpen)
                .map(([id]) => id)}
              onValueChange={(value) => {
                const newStates: Record<string, boolean> = { ...accordionStates };
                Object.keys(newStates).forEach((id) => {
                  newStates[id] = value.includes(id);
                });
                setAccordionStates(newStates);
              }}
              className="space-y-4"
            >
              {filteredSections.map((section) => (
                <SortableAccordionItem
                  key={section.id}
                  section={section}
                  isAdmin={isAdmin}
                  availableCategories={availableCategories}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteClick}
                  onMove={handleMoveToCategory}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>

        <DocumentsList blockId={category.id} scope="apogee" />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette section ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {editingSection && (
              <SectionEditForm
                section={editingSection}
                onSave={handleSave}
                onCancel={() => setEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={tipsEditDialogOpen} onOpenChange={setTipsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {editingSection && (
              <TipsEditForm
                section={editingSection}
                onSave={handleSaveTips}
                onCancel={() => setTipsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
