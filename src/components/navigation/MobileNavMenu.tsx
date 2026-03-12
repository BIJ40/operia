import { useState } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { HeaderNavGroup } from '@/config/headerNavigation';
import type { UnifiedTab } from '@/components/unified/workspace/types';

interface MobileNavMenuProps {
  groups: HeaderNavGroup[];
  activeTab: UnifiedTab;
  onSelect: (tab: UnifiedTab) => void;
}

export function MobileNavMenu({ groups, activeTab, onSelect }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-lg font-bold text-primary">Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 px-2 pb-4">
          {groups.map((group) => {
            const Icon = group.icon;
            const isGroupActive = group.children.some(c => c.tab === activeTab);

            if (group.children.length === 1) {
              const child = group.children[0];
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => {
                    if (child.path) navigate(child.path);
                    else if (child.tab) onSelect(child.tab);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isGroupActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                >
                  <Icon className="w-4 h-4" />
                  {group.label}
                </button>
              );
            }

            return (
              <Collapsible key={group.label} defaultOpen={isGroupActive}>
                <CollapsibleTrigger className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isGroupActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {group.label}
                  </span>
                  <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 mt-0.5 flex flex-col gap-0.5">
                  {group.children.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={child.label}
                        type="button"
                        onClick={() => { if (child.tab) onSelect(child.tab); setOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                          ${child.tab === activeTab ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                      >
                        <ChildIcon className="w-4 h-4" />
                        {child.label}
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
