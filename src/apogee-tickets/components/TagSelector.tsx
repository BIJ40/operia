import { useState, useMemo, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Check, Search, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTicketTags, isLegacyImpactTag } from "../hooks/useTicketTags";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function TagSelector({ selectedTags, onTagsChange, disabled, compact = false }: TagSelectorProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags, ensureTagExists, getTagColor } = useTicketTags();
  const cleanSelectedTags = useMemo(() => selectedTags.filter(t => !isLegacyImpactTag(t)), [selectedTags]);

  const handleAddTag = useCallback((tag: string) => {
    const upperTag = tag.toUpperCase().trim();
    if (upperTag && !selectedTags.includes(upperTag)) {
      onTagsChange([...selectedTags, upperTag]);
      ensureTagExists(upperTag);
    }
    setNewTag('');
  }, [selectedTags, onTagsChange, ensureTagExists]);

  const handleRemoveTag = useCallback((tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  }, [selectedTags, onTagsChange]);

  const handleToggleTag = useCallback((tag: string) => {
    if (selectedTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  }, [selectedTags, handleRemoveTag, handleAddTag]);

  // Filter tags based on search input
  const filteredTags = useMemo(() => {
    const search = newTag.toUpperCase().trim();
    if (!search) return tags;
    return tags.filter(t => t.id.includes(search) || t.label.includes(search));
  }, [tags, newTag]);

  // Check if the typed text matches an existing tag exactly
  const isNewTagUnique = useMemo(() => {
    const search = newTag.toUpperCase().trim();
    if (!search) return false;
    return !tags.some(t => t.id === search);
  }, [tags, newTag]);

  const popoverContent = (
    <div
      className="space-y-2"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Search / create input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Rechercher ou créer…"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (newTag.trim()) handleAddTag(newTag);
            }
          }}
          className="h-8 pl-8 text-sm"
          autoFocus
        />
      </div>

      {/* Tag list */}
      <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto -mx-1 px-1">
        {filteredTags.map(tag => {
          const isSelected = cleanSelectedTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-sm transition-colors",
                isSelected
                  ? "bg-accent font-medium"
                  : "hover:bg-muted/80"
              )}
              onClick={() => handleToggleTag(tag.id)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <Badge variant="secondary" className={cn("text-xs py-0 px-1.5 pointer-events-none", getTagColor(tag.id))}>
                {tag.label}
              </Badge>
            </button>
          );
        })}

        {/* Create new tag option */}
        {isNewTagUnique && newTag.trim() && (
          <button
            type="button"
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-sm hover:bg-muted/80 text-primary font-medium"
            onClick={() => handleAddTag(newTag)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Plus className="h-4 w-4" />
            <span>Créer "{newTag.toUpperCase().trim()}"</span>
          </button>
        )}

        {filteredTags.length === 0 && !isNewTagUnique && (
          <p className="text-xs text-muted-foreground text-center py-3">Aucun tag trouvé</p>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-1 flex-wrap cursor-pointer group">
            {cleanSelectedTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn("text-[10px] py-0 px-1.5 gap-0.5 leading-tight", getTagColor(tag))}
              >
                {tag}
                {!disabled && (
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveTag(tag); }}
                    className="hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
            {!disabled && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground group-hover:text-foreground transition-colors">
                <Plus className="h-3 w-3" />
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-popover z-50" side="top" align="start" sideOffset={4}>
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <div className="space-y-2 cursor-pointer group">
          <div className="flex flex-wrap gap-1.5 items-center">
            {cleanSelectedTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn("gap-1", getTagColor(tag))}
              >
                {tag}
                {!disabled && (
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveTag(tag); }}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {!disabled && (
              <Button variant="outline" size="sm" className="h-6 gap-1 text-xs" asChild>
                <span>
                  <Tag className="h-3 w-3" />
                  Ajouter
                </span>
              </Button>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-popover z-50" side="top" align="start" sideOffset={4}>
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
}
