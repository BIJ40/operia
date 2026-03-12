import { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HeaderNavGroup, HeaderNavChild } from '@/config/headerNavigation';
import type { UnifiedTab } from '@/components/unified/workspace/types';

interface HeaderNavDropdownProps {
  group: HeaderNavGroup;
  isActive: boolean;
  onSelect: (tab: UnifiedTab) => void;
  pillBase: string;
  pillActive: string;
  pillInactive: string;
}

export function HeaderNavDropdown({ group, isActive, onSelect, pillBase, pillActive, pillInactive }: HeaderNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const Icon = group.icon;
  const hasDropdown = group.children.length > 1;

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (hasDropdown) setOpen(true);
  }, [hasDropdown]);

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
        className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
        onClick={() => {
          if (!hasDropdown && group.children[0]?.tab) {
            onSelect(group.children[0].tab);
          } else {
            setOpen(!open);
          }
        }}
      >
        <Icon className="w-4 h-4" />
        <span>{group.label}</span>
        {hasDropdown && (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && hasDropdown && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[260px] rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 z-50">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.label}
                type="button"
                onClick={() => handleSelect(child)}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/5 group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15 group-hover:border-primary/30">
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
