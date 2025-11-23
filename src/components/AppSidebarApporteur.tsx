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
  showTitleInMenu?: boolean;
}

interface BlockSubcategory {
  id: string;
  title: string;
  slug: string;
  parentId: string;
  hideFromSidebar?: boolean;
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
  const [blockSubcategories, setBlockSubcategories] = useState<BlockSubcategory[]>([]);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openSubcategories, setOpenSubcategories] = useState<Set<string>>(new Set());
  
  // Charger depuis blocks pour Apporteurs
  useEffect(() => {
    const cats = blocks
      .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        icon: b.icon,
        showTitleInMenu: b.showTitleInMenu
      }));
    
    setBlockCategories(cats);
    
    const subs = blocks
      .filter(b => b.type === 'subcategory')
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        parentId: b.parentId || '',
        hideFromSidebar: b.hideFromSidebar
      }));
    
    setBlockSubcategories(subs);
    
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

  // Ouvrir automatiquement la catégorie et sous-catégorie actives
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const categorySlug = pathParts[3];
    const subSlug = pathParts[5];
    
    if (categorySlug) {
      const activeCategory = blockCategories.find(c => c.slug === categorySlug);
      if (activeCategory) {
        setOpenCategories(prev => new Set(prev).add(activeCategory.id));
      }
    }
    
    if (subSlug) {
      const activeSubcategory = blockSubcategories.find(s => s.slug === subSlug);
      if (activeSubcategory) {
        setOpenSubcategories(prev => new Set(prev).add(activeSubcategory.id));
      }
    }
  }, [location.pathname, blockCategories, blockSubcategories]);

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

  const toggleSubcategory = (subcategoryId: string) => {
    setOpenSubcategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subcategoryId)) {
        newSet.delete(subcategoryId);
      } else {
        newSet.add(subcategoryId);
      }
      return newSet;
    });
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const IconComponent = (iconName?: string) => {
    if (!iconName) return Icons.BookOpen;
    // Si c'est une URL d'image, retourner null pour afficher l'image
    if (iconName.startsWith('http')) return null;
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.BookOpen;
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-2 border-b">
        <Link to="/apporteurs" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icons.Users className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Guide Apporteurs</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>Catégories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {blockCategories.map((category) => {
                const Icon = IconComponent(category.icon);
                const categorySubcategories = blockSubcategories.filter(s => s.parentId === category.id);
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
                          className={`w-full bg-white hover:border-2 hover:border-helpconfort-orange hover:rounded-lg hover:scale-105 transition-all duration-200 group ${isActive ? 'border-2 border-helpconfort-orange rounded-lg shadow-[0_0_15px_hsl(var(--orange-accent)/0.5)]' : ''}`}
                        >
                          {Icon ? (
                            <Icon 
                              className="w-4 h-4 mr-2 cursor-pointer group-hover:rotate-12 group-hover:scale-110 transition-all duration-200" 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = categoryPath;
                              }}
                            />
                          ) : category.icon?.startsWith('http') ? (
                            <img 
                              src={category.icon} 
                              alt="" 
                              className="w-4 h-4 mr-2 object-contain cursor-pointer group-hover:rotate-12 group-hover:scale-110 transition-all duration-200" 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = categoryPath;
                              }}
                            />
                          ) : null}
                          {(category.showTitleInMenu !== false) && (
                            <span className="flex-1 text-left group-hover:translate-x-1 transition-transform duration-200">{category.title}</span>
                          )}
                          {categorySubcategories.length > 0 && (
                            <ChevronRight 
                              className={`w-4 h-4 transition-transform duration-200 group-hover:scale-125 ${isOpen ? 'rotate-90' : ''}`} 
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {categorySubcategories.length > 0 && (
                        <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[state=closed]:opacity-0 data-[state=open]:animate-fade-in">
                          <SidebarMenuSub>
                            {categorySubcategories.map((subcategory) => {
                              const subcategorySections = blockSections.filter(s => s.parentId === subcategory.id);
                              const isSubOpen = openSubcategories.has(subcategory.id);
                              const subcategoryPath = `/apporteurs/category/${category.slug}/sub/${subcategory.slug}`;
                              const isSubActive = isActiveLink(subcategoryPath);
                              
                              return (
                                <Collapsible
                                  key={subcategory.id}
                                  open={isSubOpen}
                                  onOpenChange={() => toggleSubcategory(subcategory.id)}
                                >
                                  <SidebarMenuSubItem>
                                    <div className="flex items-center w-full">
                                      <SidebarMenuSubButton
                                        asChild
                                        className={`flex-1 hover:border-2 hover:border-[#0096D6] hover:rounded-lg hover:scale-105 transition-all duration-200 group ${isSubActive ? 'border-2 border-[#0096D6] rounded-lg shadow-[0_0_15px_rgba(0,150,214,0.5)]' : ''}`}
                                      >
                                        <Link to={subcategoryPath}>
                                          <span className="flex-1 group-hover:translate-x-1 transition-transform duration-200">{subcategory.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                      {subcategorySections.length > 0 && (
                                        <CollapsibleTrigger asChild>
                                          <button className="p-1 hover:bg-accent/20 rounded">
                                            <ChevronRight 
                                              className={`w-3 h-3 transition-transform ${isSubOpen ? 'rotate-90' : ''}`} 
                                            />
                                          </button>
                                        </CollapsibleTrigger>
                                      )}
                                    </div>
                                    
                                    {subcategorySections.length > 0 && (
                                      <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[state=closed]:opacity-0 data-[state=open]:animate-fade-in">
                                        <SidebarMenuSub className="ml-2">
                                          {subcategorySections.map((section) => {
                                            const sectionPath = `/apporteurs/category/${category.slug}/sub/${subcategory.slug}#${section.slug}`;
                                            const isSectionActive = location.pathname === subcategoryPath && 
                                                                    location.hash === `#${section.slug}`;
                                            
                                            return (
                                              <SidebarMenuSubItem key={section.id}>
                                                <SidebarMenuSubButton
                                                  asChild
                                                  className={`hover:border-2 hover:border-[#0096D6] hover:rounded-lg hover:scale-105 transition-all duration-200 group ${isSectionActive ? 'border-2 border-[#0096D6] rounded-lg shadow-[0_0_15px_rgba(0,150,214,0.5)]' : ''}`}
                                                >
                                                  <Link to={sectionPath}>
                                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{section.title}</span>
                                                  </Link>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            );
                                          })}
                                        </SidebarMenuSub>
                                      </CollapsibleContent>
                                    )}
                                  </SidebarMenuSubItem>
                                </Collapsible>
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
