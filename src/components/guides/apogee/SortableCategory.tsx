/**
 * SortableCategory - Composant de catégorie triable pour le Guide Apogée (mode édition)
 * Extrait de ApogeeGuide.tsx pour réduire la taille du fichier page.
 */

import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import * as Icons from 'lucide-react';
import { Clock, Ban, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPicker } from '@/components/IconPicker';
import { ImageUploader } from '@/components/ImageUploader';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableCategoryProps {
  category: any;
  editingId: string | null;
  editTitle: string;
  editIcon: string;
  editImageUrl: string | null;
  editShowTitleOnCard: boolean;
  editIsEmpty: boolean;
  isEditMode: boolean;
  hasInProgress: boolean;
  hasNew: boolean;
  isEmpty: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditImageUrlChange: (value: string | null) => void;
  onEditShowTitleOnCardChange: (value: boolean) => void;
  onEditIsEmptyChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  IconComponent: (iconName: string) => any;
}

export const SortableCategory = ({
  category,
  editingId,
  editTitle,
  editIcon,
  editImageUrl,
  editShowTitleOnCard,
  editIsEmpty,
  isEditMode,
  hasInProgress,
  hasNew,
  isEmpty,
  onEditTitleChange,
  onEditIconChange,
  onEditImageUrlChange,
  onEditShowTitleOnCardChange,
  onEditIsEmptyChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  IconComponent,
}: SortableCategoryProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = IconComponent(category.icon || 'BookOpen');
  const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');

  const tileClass = isEmpty 
    ? "bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60"
    : "bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border-helpconfort-blue/20 border-l-helpconfort-blue hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 overflow-visible ${tileClass}`}
    >
      {isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
            <Ban className="w-3 h-3" />
            Vide
          </div>
        </div>
      )}
      {hasNew && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
          <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
            NEW
          </div>
        </div>
      )}
      {hasInProgress && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-helpconfort-blue text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </div>
        </div>
      )}
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute -top-2 -left-2 cursor-grab active:cursor-grabbing z-10 bg-background rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </div>
          {editingId !== category.id && (
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                onClick={() => onEdit(category.id)}
                size="icon"
                variant="outline"
                className="h-7 w-7 bg-background shadow-md"
                aria-label="Modifier"
              >
                <Icons.Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onDelete(category.id)}
                size="icon"
                variant="destructive"
                className="h-7 w-7 shadow-md"
                aria-label="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}
      
      {editingId === category.id ? (
        <div className="space-y-3 w-full">
          <Input
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            placeholder="Titre de la catégorie"
            autoFocus
          />
          <ImageUploader
            currentImage={editImageUrl || undefined}
            onImageChange={onEditImageUrlChange}
            bucketName="category-images"
          />
          <IconPicker value={editIcon} onChange={onEditIconChange} />
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-title-on-card"
              checked={editShowTitleOnCard}
              onCheckedChange={onEditShowTitleOnCardChange}
            />
            <label htmlFor="show-title-on-card" className="text-sm font-medium cursor-pointer">
              Afficher le titre sur la carte
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mark-empty"
              checked={editIsEmpty}
              onCheckedChange={onEditIsEmptyChange}
            />
            <label htmlFor="mark-empty" className="text-sm font-medium cursor-pointer text-muted-foreground">
              Marquer comme vide (grise la catégorie)
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} size="sm">Enregistrer</Button>
            <Button onClick={onCancel} size="sm" variant="outline">Annuler</Button>
          </div>
        </div>
      ) : (
        <Link to={`${ROUTES.academy.apogeeCategory(category.slug)}${isEditMode ? '?edit=true' : ''}`} className="flex items-center gap-3 flex-1 min-w-0">
          {(isCustomImage && category.icon) || editImageUrl ? (
            <img src={editImageUrl || category.icon} alt={category.title} className="w-6 h-6 object-contain flex-shrink-0" />
          ) : (
            <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          )}
          {(category.showTitleOnCard !== false) && (
            <span className="text-base font-medium text-foreground truncate">{category.title}</span>
          )}
        </Link>
      )}
    </div>
  );
};
