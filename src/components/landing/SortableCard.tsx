import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/IconPicker';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import helpConfortServicesImg from '@/assets/help-confort-services.png';
import { SortableCardProps, ColorPreset } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { memo } from 'react';

export const SortableCard = memo(function SortableCard({
  card,
  editingId,
  editTitle,
  editDescription,
  editLink,
  editIcon,
  editColor,
  isEditMode,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditLinkChange,
  onEditIconChange,
  onEditColorChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  getColorClass,
  IconComponent,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = IconComponent(card.icon || 'BookOpen');
  const isLarge = card.size === 'large';
  const isLogo = card.is_logo || false;

  // Si c'est un logo, afficher l'image avec taille fixe
  if (isLogo) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full max-w-sm mx-auto"
      >
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10 bg-background/80 rounded p-1"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </div>
        )}
        <img 
          src={helpConfortServicesImg} 
          alt={card.title} 
          className="w-full h-auto pointer-events-auto select-none transition-all duration-500 hover:scale-105 hover:brightness-110 cursor-pointer"
          draggable="false"
        />
      </div>
    );
  }

  const baseClassName = isLarge
    ? "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-6 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 min-h-[240px] h-[240px] flex flex-col"
    : "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 h-[72px] flex items-center gap-2";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={baseClassName}
    >
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </div>
          {editingId !== card.id && (
            <div className="absolute top-10 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                onClick={() => onEdit(card.id)}
                size="icon"
                variant="outline"
                className="h-7 w-7"
              >
                <Icons.Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onDelete(card.id)}
                size="icon"
                variant="destructive"
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}
      
      <Dialog open={editingId === card.id} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la carte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titre</label>
              <Input
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                placeholder="Titre de la carte"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lien</label>
              <Input
                value={editLink}
                onChange={(e) => onEditLinkChange(e.target.value)}
                placeholder="Lien (ex: /apogee)"
              />
            </div>
            <IconPicker
              value={editIcon}
              onChange={onEditIconChange}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'red', color: 'bg-red-100 border-2 border-red-300 text-red-800', label: 'Rouge' },
                  { value: 'blanc', color: 'bg-white border-2 border-gray-300 text-gray-800', label: 'Blanc' },
                  { value: 'blue', color: 'bg-blue-100 border-2 border-blue-300 text-blue-800', label: 'Bleu' },
                  { value: 'green', color: 'bg-green-100 border-2 border-green-300 text-green-800', label: 'Vert' },
                  { value: 'yellow', color: 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800', label: 'Jaune' },
                  { value: 'purple', color: 'bg-purple-100 border-2 border-purple-300 text-purple-800', label: 'Violet' },
                  { value: 'orange', color: 'bg-orange-100 border-2 border-orange-300 text-orange-800', label: 'Orange' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onEditColorChange(preset.value as ColorPreset)}
                    className={`${preset.color} px-3 py-1.5 rounded text-xs font-medium ${
                      editColor === preset.value ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4 justify-end">
              <Button onClick={onCancel} variant="outline">
                Annuler
              </Button>
              <Button onClick={onSave}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {editingId !== card.id && (
        <>
          {card.link && card.link !== '#' ? (
            <Link to={card.link} className={isLarge ? "flex-1" : "flex items-center gap-2 flex-1"}>
              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300"} />
              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{card.title}</h2>
                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{card.description}</p>
              </div>
            </Link>
          ) : (
            <div className={isLarge ? "flex-1" : "flex items-center gap-2 flex-1"}>
              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0"} />
              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{card.title}</h2>
                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{card.description}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
