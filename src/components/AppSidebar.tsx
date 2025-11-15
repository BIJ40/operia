import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import logoApogee from '@/assets/logo_helpogee.png';
import { supabase } from '@/integrations/supabase/client';
import { useEditor } from '@/contexts/EditorContext';

interface Category {
  id: string;
  title: string;
  icon: string;
  color_preset: string;
  scope: string;
  display_order: number;
}

interface Section {
  id: string;
  title: string;
  category_id: string;
  display_order: number;
}

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

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { blocks } = useEditor();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([]);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  
  // Déterminer le scope selon la route
  const getScope = () => {
    const path = location.pathname;
    if (path.startsWith('/apogee')) return 'guide-apogee';
    if (path.startsWith('/guide-apporteurs')) return 'apporteurs-nationaux';
    if (path.startsWith('/help-confort')) return 'informations-utiles';
    return null;
  };

  const scope = getScope();
  const isApogee = scope === 'guide-apogee';

  // Charger depuis blocks pour Apogée
  useEffect(() => {
    if (isApogee) {
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
    }
  }, [blocks, isApogee]);

  // Charger depuis Supabase pour les autres pages
  useEffect(() => {
    if (!scope || isApogee) return;

    const loadData = async () => {
      const supabaseAny = supabase as any;
      const { data: cats } = await supabaseAny
        .from('categories')
        .select('*')
        .eq('scope', scope)
        .order('display_order');
      
      if (cats) {
        setCategories(cats);
        
        const categoryIds = cats.map((c: Category) => c.id);
        if (categoryIds.length > 0) {
          const { data: secs } = await supabaseAny
            .from('sections')
            .select('*')
            .in('category_id', categoryIds)
            .order('display_order');
          
          if (secs) setSections(secs);
        }
      }
    };

    loadData();
  }, [scope, isApogee]);

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const handleToggleCategory = (categoryId: string) => {
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

  const handleSectionClick = (sectionId: string, categoryIdentifier: string) => {
    // Pour Apogée: categoryIdentifier est un slug
    // Pour les autres: categoryIdentifier est un ID
    if (isApogee) {
      navigate(`/apogee/category/${categoryIdentifier}#${sectionId}`);
    } else {
      const path = scope === 'apporteurs-nationaux' 
        ? '/guide-apporteurs' 
        : '/help-confort';
      navigate(`${path}/category/${categoryIdentifier}#${sectionId}`);
    }
  };

  if (!scope) return null;

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <Link to="/" className="block" onClick={(e) => e.stopPropagation()}>
          <img 
            src={logoApogee} 
            alt="Helpogee" 
            className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
            draggable={false}
            data-no-modal="true"
          />
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sommaire</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isApogee ? (
                // Affichage pour Apogée (depuis blocks)
                blockCategories.map((category) => {
                  const Icon = IconComponent(category.icon || 'BookOpen');
                  const categorySections = blockSections.filter(s => s.parentId === category.id);
                  const isOpen = openCategories.has(category.id);

                  return (
                    <Collapsible 
                      key={category.id} 
                      open={isOpen}
                      onOpenChange={() => handleToggleCategory(category.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full hover:bg-accent">
                            <Icon 
                              className="h-4 w-4 shrink-0 cursor-pointer hover:opacity-70" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/apogee/category/${category.slug}`);
                              }}
                            />
                            <span className="flex-1 text-left truncate">{category.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" 
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} 
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {categorySections.map((section) => (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton
                                  onClick={() => handleSectionClick(section.id, category.slug)}
                                  className="cursor-pointer hover:bg-accent"
                                >
                                  <span className="text-sm">{section.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })
              ) : (
                // Affichage pour Apporteurs et HelpConfort (depuis Supabase)
                categories.map((category) => {
                  const Icon = IconComponent(category.icon);
                  const categorySections = sections.filter(s => s.category_id === category.id);
                  const isOpen = openCategories.has(category.id);

                  return (
                    <Collapsible 
                      key={category.id} 
                      open={isOpen}
                      onOpenChange={() => handleToggleCategory(category.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full hover:bg-accent">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left truncate">{category.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" 
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} 
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {categorySections.map((section) => (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleSectionClick(section.id, category.id);
                                  }}
                                  className="cursor-pointer hover:bg-accent"
                                >
                                  <span className="text-sm">{section.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lien FAQ pour Apogée uniquement */}
        {isApogee && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link 
                      to="/apogee/category/faq" 
                      className="flex items-center gap-2"
                    >
                      <Icons.HelpCircle className="h-4 w-4" />
                      <span>FAQ</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
