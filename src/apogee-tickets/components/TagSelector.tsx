import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTicketTags } from "../hooks/useTicketTags";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function TagSelector({ selectedTags, onTagsChange, disabled, compact = false }: TagSelectorProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { tags, ensureTagExists, getTagColor } = useTicketTags();

  const handleAddTag = async (tag: string) => {
    const upperTag = tag.toUpperCase().trim();
    if (upperTag && !selectedTags.includes(upperTag)) {
      // Ensure tag exists in database
      await ensureTagExists(upperTag);
      onTagsChange([...selectedTags, upperTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  const handleToggleTag = async (tag: string) => {
    if (selectedTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      await handleAddTag(tag);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {selectedTags.length > 0 ? (
          selectedTags.slice(0, 2).map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${getTagColor(tag)} text-xs py-0 px-1.5`}
            >
              {tag}
              {!disabled && (
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))
        ) : null}
        {selectedTags.length > 2 && (
          <span className="text-xs text-muted-foreground">+{selectedTags.length - 2}</span>
        )}
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-background z-50" align="start">
              <div className="space-y-3">
                <div className="text-sm font-medium">Tags disponibles</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${selectedTags.includes(tag.id) ? getTagColor(tag.id) : ''}`}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Créer un tag</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nouveau tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTag);
                        }
                      }}
                      className="h-8"
                    />
                    <Button size="sm" onClick={() => handleAddTag(newTag)} disabled={!newTag.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className={getTagColor(tag)}
          >
            {tag}
            {!disabled && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6">
                <Plus className="h-3 w-3 mr-1" />
                Ajouter tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-background z-50" align="start">
              <div className="space-y-3">
                <div className="text-sm font-medium">Tags disponibles</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${selectedTags.includes(tag.id) ? getTagColor(tag.id) : ''}`}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Créer un tag</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nouveau tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTag);
                        }
                      }}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddTag(newTag)}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
