/**
 * PublicCategorySidebar - Sidebar permanente avec liste des catégories
 * Version Warm Pastel
 */

import { useMemo } from 'react';
import { Home, Clock, Ban, BookOpen, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { Block } from '@/types/block';

export function PublicCategorySidebar() {
  const { blocks, loading } = usePublicEditor();
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
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-muted/20 border-r border-border/50">
      <div className="p-4 border-b border-border/40">
        <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-warm-blue/15 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-warm-blue" />
          </div>
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
          
          <Separator className="my-3 bg-border/40" />
          
          {/* État de chargement */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-warm-blue" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
            </div>
          )}
          
          {/* Liste des catégories */}
          {!loading && categories.map(category => {
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
          
          {/* Message si aucune catégorie */}
          {!loading && categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune catégorie disponible
            </div>
          )}
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
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200',
        'hover:bg-warm-blue/10 hover:text-foreground',
        isActive && 'bg-warm-blue/15 text-warm-blue font-medium shadow-sm',
        badges?.isEmpty && 'opacity-40'
      )}
    >
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        isActive 
          ? 'bg-warm-blue/20 text-warm-blue' 
          : 'bg-muted/50 text-muted-foreground'
      )}>
        {customIcon ? (
          <img src={customIcon} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      
      <span className="truncate flex-1">{label}</span>
      
      {/* Badges */}
      {badges?.isEmpty && (
        <Ban className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
      )}
      {badges?.hasNew && !badges.isEmpty && (
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-warm-green/20 text-warm-green rounded-md shrink-0">
          NEW
        </span>
      )}
      {badges?.hasInProgress && !badges.isEmpty && (
        <Clock className="w-3.5 h-3.5 text-warm-orange shrink-0" />
      )}
    </button>
  );
}
