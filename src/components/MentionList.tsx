import { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react';
import { MentionSuggestion } from '@/lib/mentions';

interface MentionListProps {
  items: MentionSuggestion[];
  command: (item: MentionSuggestion) => void;
}

export const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const categories = props.items.filter(item => item.type === 'category');
    const sections = props.items.filter(item => item.type === 'section');
    
    return {
      categories,
      sections: sections.reduce((acc, section) => {
        const categoryLabel = section.label.split(' → ')[0];
        if (!acc[categoryLabel]) acc[categoryLabel] = [];
        acc[categoryLabel].push(section);
        return acc;
      }, {} as Record<string, MentionSuggestion[]>)
    };
  }, [props.items]);

  const toggleCategory = (categoryLabel: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryLabel)) {
        next.delete(categoryLabel);
      } else {
        next.add(categoryLabel);
      }
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        if (props.items[selectedIndex]) {
          props.command(props.items[selectedIndex]);
        }
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[400px] overflow-y-auto z-[9999]">
      {/* Categories with expandable sections */}
      {groupedItems.categories.map((category) => {
        const sections = groupedItems.sections[category.label] || [];
        const isExpanded = expandedCategories.has(category.label);
        const hasSection = sections.length > 0;

        return (
          <div key={category.id}>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm transition-colors border-b border-border/50 hover:bg-accent/50 flex items-center justify-between"
              onClick={() => hasSection ? toggleCategory(category.label) : props.command(category)}
            >
              <div className="font-medium text-foreground">{category.label}</div>
              {hasSection && (
                <span className="text-xs text-muted-foreground">
                  {isExpanded ? '▼' : '▶'} {sections.length}
                </span>
              )}
            </button>
            
            {/* Sections */}
            {isExpanded && sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 pl-6 text-sm transition-colors border-b border-border/30 hover:bg-accent/50"
                onClick={() => props.command(item)}
              >
                <div className="font-medium text-foreground text-sm">
                  {item.label.split(' → ')[1] || item.label}
                </div>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
});

MentionList.displayName = 'MentionList';
