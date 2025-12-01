import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';

interface Category {
  id: string;
  title: string;
}

interface CategoryExportCardProps {
  title: string;
  description: string;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onExportJson: () => void;
  onExportText: () => void;
  onExportPdf?: () => void;
  isLoading: boolean;
}

export function CategoryExportCard({
  title,
  description,
  categories,
  selectedCategory,
  onCategoryChange,
  onExportJson,
  onExportText,
  onExportPdf,
  isLoading,
}: CategoryExportCardProps) {
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
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={onExportJson} disabled={!selectedCategory || isLoading} className="flex-1" size="sm">
            JSON
          </Button>
          <Button onClick={onExportText} disabled={!selectedCategory || isLoading} className="flex-1" size="sm" variant="outline">
            Texte
          </Button>
        </div>
        {onExportPdf && (
          <Button 
            onClick={onExportPdf} 
            disabled={!selectedCategory || isLoading} 
            className="w-full" 
            size="sm" 
            variant="secondary"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF avec images
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
