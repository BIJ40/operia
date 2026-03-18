import { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HeaderNavGroup, HeaderNavChild } from '@/config/headerNavigation';
import type { UnifiedTab } from '@/components/unified/workspace/types';
import type { ModuleKey } from '@/types/modules';

interface AccentDropdown {
  bg: string;
  border: string;
  text: string;
  hoverBg: string;
  hoverBorder: string;
}

interface HeaderNavDropdownProps {
  group: HeaderNavGroup;
  isActive: boolean;
  onSelect: (tab: UnifiedTab) => void;
  pillBase: string;
  pillActive: string;
  pillInactive: string;
  accentDropdown?: AccentDropdown;
  /** Check if a module scope is deployed (is_deployed=true in registry) */
  isDeployedModule?: (key: ModuleKey) => boolean;
  /** Check if user has access to a module scope */
  hasModule?: (key: ModuleKey) => boolean;
  /** Admin bypass — admins see deployed-but-inaccessible as clickable */
  isAdmin?: boolean;
}

export function HeaderNavDropdown({ group, isActive, onSelect, pillBase, pillActive, pillInactive, accentDropdown, isDeployedModule, hasModule, isAdmin }: HeaderNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const Icon = group.icon;

  // Filter children: hide non-deployed scopes
  const filteredChildren = group.children.filter(child => {
    if (!child.scope || !isDeployedModule) return true;
    return isDeployedModule(child.scope as ModuleKey);
  });

  const hasDropdown = filteredChildren.length > 1;

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (hasDropdown) setOpen(true);
  }, [hasDropdown]);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handleSelect = useCallback((child: HeaderNavChild) => {
    if (child.subTabKey && child.subTabValue) {
      try {
        sessionStorage.setItem(child.subTabKey, JSON.stringify(child.subTabValue));
        window.dispatchEvent(new CustomEvent('session-state-change', { detail: { key: child.subTabKey, value: child.subTabValue } }));
      } catch {}
    }
    if (child.tab) onSelect(child.tab);
    setOpen(false);
  }, [onSelect]);

  /** Check if a child with a scope is accessible (greyed if not) */
  const isChildAccessible = (child: HeaderNavChild): boolean => {
    if (!child.scope || !hasModule) return true;
    if (isAdmin) return true; // Admins can click deployed modules
    return hasModule(child.scope as ModuleKey);
  };

  if (filteredChildren.length === 0) return null;

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
          if (!hasDropdown && filteredChildren[0]?.tab) {
            onSelect(filteredChildren[0].tab);
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
          {filteredChildren.map((child) => {
            const ChildIcon = child.icon;
            const accessible = isChildAccessible(child);
            return (
              <button
                key={child.label}
                type="button"
                onClick={() => accessible ? handleSelect(child) : undefined}
                disabled={!accessible}
                className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 group ${
                  accessible
                    ? 'hover:bg-muted/50 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  accentDropdown 
                    ? `${accentDropdown.bg} ${accentDropdown.border} ${accessible ? `${accentDropdown.hoverBg} ${accentDropdown.hoverBorder}` : ''}`
                    : `bg-primary/10 border-primary/15 ${accessible ? 'group-hover:bg-primary/15 group-hover:border-primary/30' : ''}`
                }`}>
                  <ChildIcon className={`w-4 h-4 ${accentDropdown ? accentDropdown.text : 'text-primary'}`} />
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
