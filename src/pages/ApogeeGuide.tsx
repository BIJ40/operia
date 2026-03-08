// Page dédiée au Guide Apogée (anciennement Home)
import { useEditor } from '@/contexts/EditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import * as Icons from 'lucide-react';
import { Clock, RefreshCw, Ban } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Block } from '@/types/block';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import { SortableCategory } from '@/components/guides/apogee/SortableCategory';

export default function ApogeeGuide() {
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, loading } = useEditor();
  const { isAuthenticated } = useAuthCore();
  const { hasGlobalRole, hasModuleOption } = usePermissions();
  
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('guides', 'edition');
  const canDelete = hasGlobalRole('platform_admin');
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editIsEmpty, setEditIsEmpty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const apogeeCategories = useMemo(() => 
    blocks
      .filter(b => b.type === 'category' && b.slug !== 'faq' && !b.title.toLowerCase().includes('faq') && !b.slug.startsWith('helpconfort-'))
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  const getCategoryBadges = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: Block) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      const hasInProgress = sections.some(s => s.isInProgress);
      const hasNew = sections.some(s => s.completedAt && new Date(s.completedAt) > sevenDaysAgo);
      const hasUpdate = sections.some(s => s.contentUpdatedAt && new Date(s.contentUpdatedAt) > sevenDaysAgo);
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { hasInProgress, hasNew, hasUpdate, isEmpty };
    };
  }, [blocks]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const effectiveEditMode = isEditMode && canEdit;

  const tileClass = "bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border-helpconfort-blue/20 border-l-helpconfort-blue hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg";

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const handleEdit = (id: string) => {
    const category = apogeeCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      const isImageUrl = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
      setEditImageUrl(isImageUrl ? category.icon : null);
      setEditShowTitleOnCard(category.showTitleOnCard !== false);
      setEditIsEmpty(category.isEmpty || false);
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, {
        title: editTitle,
        icon: editImageUrl || editIcon,
        slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        showTitleOnCard: editShowTitleOnCard,
        isEmpty: editIsEmpty,
      });
      setEditingId(null);
      setEditImageUrl(null);
    }
  };

  const handleCancel = () => setEditingId(null);

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteBlock(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddCategory = () => {
    addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      icon: 'BookOpen',
      colorPreset: 'blue',
      slug: `categorie-${Date.now()}`,
      parentId: null,
      attachments: [],
      order: apogeeCategories.length,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = apogeeCategories.findIndex(c => c.id === active.id);
      const newIndex = apogeeCategories.findIndex(c => c.id === over.id);
      const reorderedCategories = arrayMove(apogeeCategories, oldIndex, newIndex);
      reorderedCategories.forEach((category, index) => {
        updateBlock(category.id, { order: index });
      });
    }
  };

  const filteredCategories = searchTerm 
    ? apogeeCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : apogeeCategories;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="text-center mb-8">
            <div className="h-10 w-96 bg-muted animate-pulse rounded mx-auto mb-3" />
            <div className="h-6 w-64 bg-muted animate-pulse rounded mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Guide Apogée"
          subtitle="Toutes les informations pour maîtriser le logiciel Apogée"
          backTo={ROUTES.academy.index}
          backLabel="Help! Academy"
        />
        {!isEditMode && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {isEditMode && canEdit ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {filteredCategories.map(category => {
                  const badges = getCategoryBadges(category.id, category);
                  return (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      editingId={editingId}
                      editTitle={editTitle}
                      editIcon={editIcon}
                      editImageUrl={editImageUrl}
                      editShowTitleOnCard={editShowTitleOnCard}
                      editIsEmpty={editIsEmpty}
                      isEditMode={isEditMode}
                      hasInProgress={badges.hasInProgress}
                      hasNew={badges.hasNew}
                      isEmpty={badges.isEmpty}
                      onEditTitleChange={setEditTitle}
                      onEditIconChange={setEditIcon}
                      onEditImageUrlChange={setEditImageUrl}
                      onEditShowTitleOnCardChange={setEditShowTitleOnCard}
                      onEditIsEmptyChange={setEditIsEmpty}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      IconComponent={IconComponent}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
              const badges = getCategoryBadges(category.id, category);
              
              if (badges.isEmpty) {
                return (
                  <div
                    key={category.id}
                    className="group relative border-2 border-l-4 rounded-full px-4 py-2 transition-all duration-300 flex items-center gap-3 overflow-visible bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60 cursor-default"
                  >
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
                        <Ban className="w-3 h-3" />
                        Vide
                      </div>
                    </div>
                    {isCustomImage ? (
                      <img src={category.icon} alt={category.title} className="w-6 h-6 object-contain flex-shrink-0 opacity-50" />
                    ) : (
                      <Icon className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                    )}
                    {(category.showTitleOnCard !== false) && (
                      <span className="text-base font-medium text-muted-foreground truncate">{category.title}</span>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={category.id}
                  to={ROUTES.academy.apogeeCategory(category.slug)}
                  className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 overflow-visible ${tileClass}`}
                >
                  {badges.hasNew && (
                    <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                      <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
                        NEW
                      </div>
                    </div>
                  )}
                  {badges.hasInProgress && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-helpconfort-blue text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En cours
                      </div>
                    </div>
                  )}
                  {badges.hasUpdate && !badges.hasInProgress && (
                    <div className="absolute -top-3 -right-1 z-20 flex flex-col items-center">
                      <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md border border-primary-foreground/20">
                        <RefreshCw className="w-2.5 h-2.5" />
                        M.A.J
                      </div>
                      <div className="w-0.5 h-2 bg-primary/80 rounded-b" />
                    </div>
                  )}
                  {isCustomImage ? (
                    <img src={category.icon} alt={category.title} className="w-6 h-6 object-contain flex-shrink-0" />
                  ) : (
                    <Icon className="w-6 h-6 text-primary flex-shrink-0" />
                  )}
                  {(category.showTitleOnCard !== false) && (
                    <span className="text-base font-medium text-foreground truncate">{category.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {isEditMode && canEdit && (
          <div className="flex justify-center mt-8">
            <Button onClick={handleAddCategory} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Ajouter une catégorie
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Toutes les sections associées seront également supprimées.
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
