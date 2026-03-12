import { useState, useRef, useCallback } from 'react';
import type { HeaderNavGroup, HeaderNavChild } from '@/config/headerNavigation';
import type { UnifiedTab } from '@/components/unified/workspace/types';

interface HeaderNavDropdownProps {
  group: HeaderNavGroup;
  isActive: boolean;
  onSelect: (tab: UnifiedTab) => void;
}

export function HeaderNavDropdown({ group, isActive, onSelect }: HeaderNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const Icon = group.icon;

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handleSelect = useCallback((child: HeaderNavChild) => {
    if (child.tab) onSelect(child.tab);
    setOpen(false);
  }, [onSelect]);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        onClick={() => {
          if (group.children.length === 1 && group.children[0].tab) {
            onSelect(group.children[0].tab);
          } else {
            setOpen(!open);
          }
        }}
      >
        <Icon className="w-4 h-4" />
        <span>{group.label}</span>
      </button>

      {open && group.children.length > 1 && (
        <div className="absolute top-full left-0 mt-1 min-w-[240px] rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 z-50">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.label}
                type="button"
                onClick={() => handleSelect(child)}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/5 group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/20">
                  <ChildIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{child.label}</p>
                  {child.description && (
                    <p className="text-xs text-muted-foreground truncate">{child.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
