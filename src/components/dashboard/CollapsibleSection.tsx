import { ReactNode, memo, useState, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  id: string;
  title: ReactNode;
  icon: LucideIcon;
  colorClass: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const STORAGE_KEY = 'dashboard-sections-state';

function getStoredState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export const CollapsibleSection = memo(function CollapsibleSection({
  id,
  title,
  icon: Icon,
  colorClass,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredState();
    return stored[id] ?? defaultOpen;
  });

  // Persist state to localStorage
  useEffect(() => {
    const currentState = getStoredState();
    currentState[id] = isOpen;
    setStoredState(currentState);
  }, [id, isOpen]);

  const toggleOpen = () => setIsOpen(prev => !prev);

  return (
    <section className="group/section">
      {/* Header - 72px+ imposant */}
      <button
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between",
          "min-h-[72px] py-4 px-5 -mx-1 rounded-2xl",
          "border border-transparent",
          "bg-gradient-to-r from-muted/50 via-background to-muted/30",
          "hover:border-border hover:from-muted/80 hover:via-background hover:to-muted/50",
          "hover:shadow-md",
          "transition-all duration-300 cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
        aria-expanded={isOpen}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-helpconfort-blue/15 to-helpconfort-blue/5",
            "border border-helpconfort-blue/20",
            "group-hover/section:from-helpconfort-blue/25 group-hover/section:to-helpconfort-blue/10",
            "transition-all duration-300"
          )}>
            <Icon className={cn("w-6 h-6", colorClass)} />
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {title}
          </h2>
        </div>

        {/* Right: Combo barre + chevron */}
        <div className="flex items-center gap-3">
          {/* Barre décorative */}
          <div className={cn(
            "hidden sm:block w-16 h-1 rounded-full",
            "bg-gradient-to-r from-helpconfort-blue/40 to-helpconfort-blue/10",
            "group-hover/section:from-helpconfort-blue/60 group-hover/section:to-helpconfort-blue/20",
            "transition-all duration-300"
          )} />
          
          {/* Chevron animé */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-muted/80 border border-border/50",
            "group-hover/section:bg-helpconfort-blue/10 group-hover/section:border-helpconfort-blue/30",
            "transition-all duration-300"
          )}>
            <ChevronDown 
              className={cn(
                "w-5 h-5 text-muted-foreground",
                "group-hover/section:text-helpconfort-blue",
                "transition-all duration-300",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </div>
      </button>

      {/* Content with fade + slide animation */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn(
            "pt-5 pb-2",
            "transition-transform duration-300 ease-out",
            isOpen ? "translate-y-0" : "-translate-y-2"
          )}>
            {/* Desktop: grid, Mobile: horizontal scroll */}
            <div className="
              flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory
              md:grid md:grid-cols-3 md:overflow-visible md:pb-0
              scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent
            ">
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default CollapsibleSection;
