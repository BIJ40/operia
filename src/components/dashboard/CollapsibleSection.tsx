import { ReactNode, memo, useState, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  id: string;
  title: ReactNode;
  icon: LucideIcon;
  colorClass: string;
  children: ReactNode;
  defaultOpen?: boolean;
  href?: string;
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
  href,
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

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  const IconBox = (
    <div className={cn(
      "w-14 h-14 rounded-xl flex items-center justify-center",
      "bg-gradient-to-br from-helpconfort-blue/15 to-helpconfort-blue/5",
      "border border-helpconfort-blue/20",
      "transition-all duration-300",
      href && "hover:from-helpconfort-blue/25 hover:to-helpconfort-blue/10 hover:border-helpconfort-blue/40 cursor-pointer"
    )}>
      <Icon className={cn("w-7 h-7", colorClass)} />
    </div>
  );

  return (
    <section className="group/section">
      {/* Header - 72px+ imposant */}
      <div
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between cursor-pointer",
          "min-h-[72px] py-4 px-5 -mx-1 rounded-2xl",
          "border border-transparent",
          "bg-gradient-to-r from-muted/50 via-background to-muted/30",
          "hover:border-border hover:from-muted/80 hover:via-background hover:to-muted/50",
          "hover:shadow-md",
          "transition-all duration-300"
        )}
      >
        {/* Left: Icon + Title (navigates if href) */}
        <div className="flex items-center gap-4">
          {href ? (
            <Link 
              to={href} 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl hover:opacity-80 transition-opacity"
            >
              {IconBox}
              <h2 className="text-xl font-bold text-foreground tracking-tight hover:text-helpconfort-blue transition-colors">
                {title}
              </h2>
            </Link>
          ) : (
            <>
              {IconBox}
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {title}
              </h2>
            </>
          )}
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
            "transition-all duration-300"
          )}>
            <ChevronDown 
              className={cn(
                "w-5 h-5 text-muted-foreground",
                "transition-all duration-300",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </div>
      </div>

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
              flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory
              md:grid md:grid-cols-2 md:overflow-visible md:pb-0
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
