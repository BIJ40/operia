import { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DashboardWidget } from './DashboardWidget';
import { useEditor } from '@/contexts/EditorContext';
import { Link } from 'react-router-dom';

interface QuickSearchWidgetProps {
  size?: 'small' | 'medium' | 'large';
  isConfigMode?: boolean;
  onRemove?: () => void;
}

export function QuickSearchWidget({ size = 'medium', isConfigMode, onRemove }: QuickSearchWidgetProps) {
  const { blocks } = useEditor();
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = searchTerm.trim().length > 2
    ? blocks
        .filter(block => 
          block.type === 'section' &&
          (block.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           block.content.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  return (
    <DashboardWidget
      title="Recherche rapide"
      description="Trouvez rapidement ce que vous cherchez"
      size={size}
      isConfigMode={isConfigMode}
      onRemove={onRemove}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les guides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((result) => {
              const category = blocks.find(b => b.id === result.parentId);
              return (
                <Link
                  key={result.id}
                  to={`/apogee/category/${category?.slug || ''}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                  onClick={() => setSearchTerm('')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {category && (
                      <p className="text-xs text-muted-foreground">{category.title}</p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                </Link>
              );
            })}
          </div>
        )}

        {searchTerm.trim().length > 2 && searchResults.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun résultat trouvé
          </div>
        )}

        {searchTerm.trim().length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Tapez au moins 3 caractères pour rechercher
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
