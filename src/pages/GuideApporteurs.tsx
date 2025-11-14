import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SectionEditForm } from '@/components/SectionEditForm';
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

export default function GuideApporteurs() {
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  
  const sections = blocks
    .filter(b => b.type === 'section' && b.parentId === 'guide-apporteurs-cat')
    .sort((a, b) => a.order - b.order);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddSection = () => {
    const newOrder = sections.length > 0 
      ? Math.max(...sections.map(s => s.order)) + 1 
      : 0;
    
    addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '',
      slug: `section-${Date.now()}`,
      parentId: 'guide-apporteurs-cat',
      colorPreset: 'blue',
      attachments: [],
    });
  };

  const handleDelete = (id: string) => {
    setSectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteBlock(sectionToDelete);
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      
      reorderedSections.forEach((section, index) => {
        updateBlock(section.id, { order: index });
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Guide des apporteurs
        </h1>
        <p className="text-lg text-muted-foreground">
          Toutes les informations pour les apporteurs d'affaires
        </p>
      </div>

      {isEditMode && isAuthenticated && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions}>
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  editingId={editingId}
                  onEdit={setEditingId}
                  onDelete={handleDelete}
                  onSave={(data) => {
                    updateBlock(section.id, data);
                    setEditingId(null);
                  }}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      {!isEditMode && (
        <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions}>
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-xl font-semibold hover:text-primary">
                {section.title}
              </AccordionTrigger>
              <AccordionContent>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {isEditMode && isAuthenticated && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleAddSection} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une section
          </Button>
        </div>
      )}

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
    </div>
  );
}

interface SortableSectionProps {
  section: any;
  editingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (data: { title: string; content: string; colorPreset: any; hideFromSidebar: boolean }) => void;
}

function SortableSection({ section, editingId, onEdit, onDelete, onSave }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (editingId === section.id) {
    return (
      <div ref={setNodeRef} style={style} className="mb-4 border rounded-lg p-4">
        <SectionEditForm
          sectionId={section.id}
          initialTitle={section.title}
          initialContent={section.content}
          initialColor={section.colorPreset}
          initialHideFromSidebar={section.hideFromSidebar || false}
          onSave={onSave}
          onCancel={() => onEdit(null)}
        />
      </div>
    );
  }

  return (
    <AccordionItem ref={setNodeRef} style={style} value={section.id}>
      <div className="flex items-center gap-2 group">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        
        <AccordionTrigger className="flex-1 text-xl font-semibold hover:text-primary">
          {section.title}
        </AccordionTrigger>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={() => onEdit(section.id)}
            size="sm"
            variant="outline"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(section.id)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <AccordionContent>
        <div 
          className="prose prose-sm max-w-none dark:prose-invert ml-9"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
