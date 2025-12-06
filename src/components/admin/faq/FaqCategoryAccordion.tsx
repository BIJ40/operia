/**
 * FAQ Category Accordion - Collapsible category with items
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FaqItem } from './types';
import { FaqItemRow } from './FaqItemRow';

interface FaqCategoryAccordionProps {
  categoryName: string;
  items: FaqItem[];
  defaultOpen?: boolean;
  onEdit: (item: FaqItem) => void;
  onDelete: (item: FaqItem) => void;
  onTogglePublish: (item: FaqItem) => void;
}

export function FaqCategoryAccordion({
  categoryName,
  items,
  defaultOpen = false,
  onEdit,
  onDelete,
  onTogglePublish,
}: FaqCategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const publishedCount = items.filter(i => i.is_published).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
        
        <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
        
        <span className="font-medium flex-1">{categoryName}</span>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background">
            {items.length} Q/R
          </Badge>
          {publishedCount < items.length && (
            <Badge variant="secondary" className="text-amber-600">
              {items.length - publishedCount} masquées
            </Badge>
          )}
        </div>
      </button>
      
      {/* Content */}
      {isOpen && (
        <div className="border-t border-border">
          {items.map(item => (
            <FaqItemRow
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}
