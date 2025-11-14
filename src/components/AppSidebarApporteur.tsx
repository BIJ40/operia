import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';

interface BlockCategory {
  id: string;
  title: string;
  slug: string;
  icon?: string;
}

interface BlockSection {
  id: string;
  title: string;
  slug: string;
  parentId: string;
  hideFromSidebar?: boolean;
}

export function AppSidebarApporteur() {
  const location = useLocation();
  const { blocks } = useApporteurEditor();
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([]);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  
  // Charger depuis blocks pour Apporteurs
  useEffect(() => {
    const cats = blocks
      .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        icon: b.icon
      }));
    
    setBlockCategories(cats);
    
    const secs = blocks
      .filter(b => b.type === 'section' && !b.hideFromSidebar)
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        parentId: b.parentId || '',
        hideFromSidebar: b.hideFromSidebar
      }));
    
    setBlockSections(secs);
  }, [blocks]);

  // Ouvrir automatiquement la catégorie active
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const categorySlug = pathParts[3];
    
    if (categorySlug) {
      const activeCategory = blockCategories.find(c => c.slug === categorySlug);
      if (activeCategory) {
        setOpenCategories(prev => new Set(prev).add(activeCategory.id));
      }
    }
  }, [location.pathname, blockCategories]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const IconComponent = (iconName?: string) => {
    if (!iconName) return Icons.BookOpen;
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.BookOpen;
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 border-b">
        <Link to="/apporteurs" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icons.Users className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Guide Apporteurs</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Catégories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {blockCategories.map((category) => {
                const Icon = IconComponent(category.icon);
                const categorySections = blockSections.filter(s => s.parentId === category.id);
                const isOpen = openCategories.has(category.id);
                const categoryPath = `/apporteurs/category/${category.slug}`;
                const isActive = isActiveLink(categoryPath);

                return (
                  <Collapsible
                    key={category.id}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`w-full ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          <span className="flex-1 text-left">{category.title}</span>
                          {categorySections.length > 0 && (
                            <ChevronRight 
                              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {categorySections.length > 0 && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {categorySections.map((section) => {
                              const sectionPath = `/apporteurs/category/${category.slug}#${section.slug}`;
                              const isSectionActive = location.pathname === categoryPath && 
                                                      location.hash === `#${section.slug}`;
                              
                              return (
                                <SidebarMenuSubItem key={section.id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    className={isSectionActive ? 'bg-accent/50 text-accent-foreground' : ''}
                                  >
                                    <Link to={sectionPath}>
                                      {section.title}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
