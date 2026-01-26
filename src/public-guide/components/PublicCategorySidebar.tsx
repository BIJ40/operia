/**
 * PublicCategorySidebar - Sidebar permanente avec liste des catégories
 */

import { useMemo } from 'react';
import { Home, Clock, Ban, BookOpen } from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { Block } from '@/types/block';

export function PublicCategorySidebar() {
  const { blocks } = usePublicEditor();
  const { openTab, activeTabId } = usePublicGuideTabs();

  // Filtrer les catégories Apogée (exclure FAQ, HelpConfort, support de formation, recap fiches rapides)
  const categories = useMemo(() => 
    blocks
      .filter(b => 
        b.type === 'category' && 
        b.slug !== 'faq' && 
        !b.title.toLowerCase().includes('faq') && 
        !b.slug.startsWith('helpconfort-') &&
        !b.title.toLowerCase().includes('support de formation') &&
        !b.title.toLowerCase().includes('recap fiches rapides') &&
        !b.title.toLowerCase().includes('récap fiches rapides')
      )
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  // Helper pour les badges
  const getCategoryBadges = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: Block) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      const hasInProgress = sections.some(s => s.isInProgress);
      const hasNew = sections.some(s => {
        if (!s.completedAt) return false;
        return new Date(s.completedAt) > sevenDaysAgo;
      });
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { hasInProgress, hasNew, isEmpty };
    };
  }, [blocks]);

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) return BookOpen;
    const IconsRecord = Icons as unknown as Record<string, LucideIcon>;
    const Icon = IconsRecord[iconName];
    return Icon || BookOpen;
  };

  return (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Catégories
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Bouton Accueil */}
          <SidebarItem
            icon={Home}
            label="Accueil"
            isActive={activeTabId === 'home'}
            onClick={() => openTab('home', 'Accueil', Home)}
          />
          
          <Separator className="my-2" />
          
          {/* Liste des catégories */}
          {categories.map(category => {
            const badges = getCategoryBadges(category.id, category);
            const Icon = getIcon(category.icon);
            const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
            
            return (
              <SidebarItem
                key={category.id}
                icon={Icon}
                customIcon={isCustomImage ? category.icon : undefined}
                label={category.title}
                isActive={activeTabId === category.slug}
                onClick={() => openTab(category.slug, category.title, Icon)}
                badges={badges}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SidebarItemProps {
  icon: LucideIcon;
  customIcon?: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badges?: { hasInProgress: boolean; hasNew: boolean; isEmpty: boolean };
}

function SidebarItem({ icon: Icon, customIcon, label, isActive, onClick, badges }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-primary/10 text-primary font-medium',
        badges?.isEmpty && 'opacity-50'
      )}
    >
      {customIcon ? (
        <img src={customIcon} alt="" className="w-4 h-4 object-contain shrink-0" />
      ) : (
        <Icon className="w-4 h-4 shrink-0" />
      )}
      
      <span className="truncate flex-1">{label}</span>
      
      {/* Badges */}
      {badges?.isEmpty && (
        <Ban className="w-3 h-3 text-muted-foreground shrink-0" />
      )}
      {badges?.hasNew && !badges.isEmpty && (
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded shrink-0">
          NEW
        </span>
      )}
      {badges?.hasInProgress && !badges.isEmpty && (
        <Clock className="w-3 h-3 text-primary shrink-0" />
      )}
    </button>
  );
}
