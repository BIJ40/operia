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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionEditForm } from '@/components/SectionEditForm';
import { TipsEditForm } from '@/components/TipsEditForm';
import { Section } from './types';
import { ColorPreset, TipsType } from '@/types/block';

interface SectionSaveData {
  title: string;
  content: string;
  colorPreset: ColorPreset;
  summary?: string;
  showSummary?: boolean;
  hideTitle?: boolean;
  hideFromSidebar?: boolean;
  isInProgress?: boolean;
  completedAt?: string;
  contentUpdatedAt?: string;
  isEmpty?: boolean;
}

interface CategoryDialogsProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  confirmDelete: () => void;
  editDialogOpen: boolean;
  closeEditDialog: () => void;
  editingSection: Section | null;
  handleSave: (data: SectionSaveData) => void;
  handleSaveTips: (title: string, content: string, tipsType: TipsType, hideFromSidebar: boolean) => Promise<void>;
}

export function CategoryDialogs({
  deleteDialogOpen,
  setDeleteDialogOpen,
  confirmDelete,
  editDialogOpen,
  closeEditDialog,
  editingSection,
  handleSave,
  handleSaveTips,
}: CategoryDialogsProps) {
  return (
    <>
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La section sera définitivement supprimée.
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection?.contentType === 'tips' ? 'Modifier le TIPS' : 'Modifier la section'}
            </DialogTitle>
          </DialogHeader>
          {editingSection && (
            editingSection.contentType === 'tips' ? (
              <TipsEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content}
                initialTipsType={(editingSection.tipsType || 'information') as TipsType}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                onSave={handleSaveTips}
                onCancel={closeEditDialog}
              />
            ) : (
              <SectionEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content}
                initialColor={editingSection.colorPreset as ColorPreset}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                initialSummary={editingSection.summary || ''}
                initialShowSummary={editingSection.showSummary || false}
                initialHideTitle={editingSection.hideTitle || false}
                initialIsInProgress={editingSection.isInProgress || false}
                initialCompletedAt={editingSection.completedAt}
                initialContentUpdatedAt={editingSection.contentUpdatedAt}
                initialIsEmpty={editingSection.isEmpty || false}
                onSave={handleSave}
                onCancel={closeEditDialog}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
