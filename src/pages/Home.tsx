import { useEditor } from '@/contexts/EditorContext';
import { BlockCard } from '@/components/BlockCard';
import { EditorToolbar } from '@/components/EditorToolbar';
import { Button } from '@/components/ui/button';
import { Plus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

export default function Home() {
  const { blocks, isEditMode, addBlock, reorderBlocks, loading } = useEditor();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id);
    const newIndex = sortedBlocks.findIndex((b) => b.id === over.id);

    const newBlocks = [...sortedBlocks];
    const [moved] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, moved);

    reorderBlocks(newBlocks);
  };

  const handleAddBlock = () => {
    addBlock({
      type: 'content',
      title: 'Nouveau bloc',
      content: '<p>Contenu du bloc...</p>',
      colorPreset: 'none',
      size: 'md',
      pinned: false,
      attachments: [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manuel CRM Apogee</h1>
            <p className="text-sm text-muted-foreground">Guide d'utilisation complet</p>
          </div>
          {!isAuthenticated && (
            <Button onClick={() => setLoginOpen(true)} variant="outline">
              <LogIn className="w-4 h-4 mr-2" />
              Connexion Admin
            </Button>
          )}
        </div>
      </header>

      <EditorToolbar />

      <main className="container mx-auto px-4 py-8">
        {isEditMode && (
          <div className="mb-6 flex justify-end">
            <Button onClick={handleAddBlock}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un bloc
            </Button>
          </div>
        )}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedBlocks.map(b => b.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedBlocks.map((block) => (
                <BlockCard key={block.id} block={block} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {sortedBlocks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun bloc disponible</p>
            {isEditMode && (
              <Button onClick={handleAddBlock}>
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier bloc
              </Button>
            )}
          </div>
        )}
      </main>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
