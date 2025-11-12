import { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react';
import { MentionSuggestion } from '@/lib/mentions';

interface MentionListProps {
  items: MentionSuggestion[];
  command: (item: MentionSuggestion) => void;
}

export const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      {/* Categories */}
      {groupedItems.categories.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
            Catégories
          </div>
          {groupedItems.categories.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-border/50 ${
                index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
              onClick={() => props.command(item)}
            >
              <div className="font-medium text-foreground">{item.label || 'Sans titre'}</div>
            </button>
          ))}
        </div>
      )}
      
      {/* Sections grouped by category */}
      {Object.entries(groupedItems.sections).map(([categoryLabel, sections]) => (
        <div key={categoryLabel}>
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
            {categoryLabel}
          </div>
          {sections.map((item, sectionIndex) => {
            const globalIndex = groupedItems.categories.length + 
              Object.entries(groupedItems.sections)
                .slice(0, Object.keys(groupedItems.sections).indexOf(categoryLabel))
                .reduce((sum, [, items]) => sum + items.length, 0) + 
              sectionIndex;
            
            return (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left px-3 py-2 pl-5 text-sm transition-colors border-b border-border/30 ${
                  globalIndex === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onClick={() => props.command(item)}
              >
                <div className="font-medium text-foreground">
                  {item.label.split(' → ')[1] || item.label}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
