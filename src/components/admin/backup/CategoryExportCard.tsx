import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, ChevronDown } from 'lucide-react';

interface Category {
  id: string;
  title: string;
}

interface CategoryExportCardProps {
  title: string;
  description: string;
  categories: Category[];
  selectedCategories: string[];
  onCategoriesChange: (ids: string[]) => void;
  onExportJson: () => void;
  onExportText: () => void;
  onExportPdf?: () => void;
  onExportMultiplePdf?: () => void;
  isLoading: boolean;
}

export function CategoryExportCard({
  title,
  description,
  categories,
  selectedCategories,
  onCategoriesChange,
  onExportJson,
  onExportText,
  onExportPdf,
  onExportMultiplePdf,
  isLoading,
}: CategoryExportCardProps) {
  const [open, setOpen] = useState(false);

  const allSelected = categories.length > 0 && selectedCategories.length === categories.length;
  const someSelected = selectedCategories.length > 0 && selectedCategories.length < categories.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onCategoriesChange([]);
    } else {
      onCategoriesChange(categories.map(c => c.id));
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const getSelectionLabel = () => {
    if (selectedCategories.length === 0) return 'Choisir une ou plusieurs catégories';
    if (selectedCategories.length === 1) {
      const cat = categories.find(c => c.id === selectedCategories[0]);
      return cat?.title || '1 catégorie';
    }
    if (allSelected) return 'Toutes les catégories';
    return `${selectedCategories.length} catégories`;
  };

  const hasMultipleSelected = selectedCategories.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <span className="truncate">{getSelectionLabel()}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-background z-50" align="start">
            <div className="p-2 border-b">
              <div
                className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleAll();
                }}
              >
                <Checkbox
                  checked={allSelected}
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  onCheckedChange={() => handleToggleAll()}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium text-sm">Tout sélectionner</span>
              </div>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleCategory(cat.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => handleToggleCategory(cat.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">{cat.title}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex gap-2">
          <Button 
            onClick={onExportJson} 
            disabled={selectedCategories.length === 0 || isLoading} 
            className="flex-1" 
            size="sm"
          >
            JSON
          </Button>
          <Button 
            onClick={onExportText} 
            disabled={selectedCategories.length === 0 || isLoading} 
            className="flex-1" 
            size="sm" 
            variant="outline"
          >
            Texte
          </Button>
        </div>

        {(onExportPdf || onExportMultiplePdf) && (
          <Button 
            onClick={hasMultipleSelected ? onExportMultiplePdf : onExportPdf} 
            disabled={selectedCategories.length === 0 || isLoading} 
            className="w-full" 
            size="sm" 
            variant="secondary"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isLoading 
              ? 'Export en cours...' 
              : hasMultipleSelected 
                ? `PDF avec images (${selectedCategories.length} fichiers)` 
                : 'PDF avec images'
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
