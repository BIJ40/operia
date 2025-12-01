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

const DEFAULT_TAGS = ['BUG', 'EVO', 'NTH'];

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ selectedTags, onTagsChange, disabled }: TagSelectorProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTag = (tag: string) => {
    const upperTag = tag.toUpperCase().trim();
    if (upperTag && !selectedTags.includes(upperTag)) {
      onTagsChange([...selectedTags, upperTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'BUG':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'EVO':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'NTH':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    }
  };

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
                className="ml-1 hover:text-red-600"
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
                <div className="text-sm font-medium">Tags prédéfinis</div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer ${selectedTags.includes(tag) ? getTagColor(tag) : ''}`}
                      onClick={() => handleToggleTag(tag)}
                    >
                      {tag}
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
