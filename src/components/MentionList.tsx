import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
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
    <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto z-[9999]">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
            index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          }`}
          onClick={() => props.command(item)}
        >
          <div className="font-medium text-foreground">{item.label || 'Sans titre'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.type === 'category' ? 'Catégorie' : 'Section'}
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
