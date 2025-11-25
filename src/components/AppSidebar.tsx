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
import logoApogee from '@/assets/logo-apogee.png';
import { supabase } from '@/integrations/supabase/client';
import { useEditor } from '@/contexts/EditorContext';
import { useFilteredBlocks } from '@/hooks/use-permissions';

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
    if (path.startsWith('/favorites')) return 'guide-apogee'; // Traiter favoris comme partie d'Apogée
    if (path.startsWith('/apogee')) return 'guide-apogee';
    if (path.startsWith('/guide-apporteurs')) return 'apporteurs-nationaux';
    if (path.startsWith('/help-confort')) return 'informations-utiles';
    return null;
  };

  const scope = getScope();
  const isApogee = scope === 'guide-apogee';
  const isFavoritesPage = location.pathname === '/favorites';

  // Déterminer la page parent basée sur la route actuelle
  const getParentPath = () => {
    const path = location.pathname;
    if (path === '/apogee' || path === '/') return null; // Déjà sur la page d'accueil
    if (path.startsWith('/apogee/category/')) return '/apogee';
    if (path === '/favorites') return '/apogee';
    if (path.startsWith('/guide-apporteurs/category/')) return '/guide-apporteurs';
    if (path === '/guide-apporteurs') return '/';
    if (path.startsWith('/help-confort/category/')) return '/help-confort';
    if (path === '/help-confort') return '/';
    return '/';
  };

  const parentPath = getParentPath();

  // Charger depuis blocks pour Apogée
  useEffect(() => {
    if (isApogee) {
      // Trouver la catégorie FAQ principale
      const faqCategory = blocks.find(b => b.type === 'category' && b.slug === 'faq');
      
      const allCats = blocks
        .filter(b => 
          b.type === 'category' && 
          b.slug !== 'faq' && // Exclure la catégorie FAQ principale
          !b.slug.startsWith('helpconfort-') && // Exclure les catégories HelpConfort
          b.parentId !== faqCategory?.id // Exclure les sous-catégories FAQ
        )
        .sort((a, b) => a.order - b.order);
      
      // FILTRAGE PAR PERMISSIONS - Deny par défaut
      const filteredCats = useFilteredBlocks(allCats);
      
      setBlockCategories(filteredCats.map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        icon: b.icon
      })));
      
      const allSecs = blocks
        .filter(b => b.type === 'section' && !b.hideFromSidebar)
        .sort((a, b) => a.order - b.order);
      
      // FILTRAGE PAR PERMISSIONS - Deny par défaut
      const filteredSecs = useFilteredBlocks(allSecs);
      
      setBlockSections(filteredSecs.map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        parentId: b.parentId || '',
        hideFromSidebar: b.hideFromSidebar
      })));
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
      <SidebarHeader className="p-2 border-b">
        <Link to="/apogee" className="block h-32" onClick={(e) => e.stopPropagation()}>
          <img 
            src={logoApogee} 
            alt="Helpogee" 
            className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
            draggable={false}
            data-no-modal="true"
          />
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="pt-1">
        <SidebarGroup>
          {parentPath && (
            <Link 
              to={parentPath}
              className="mx-2 mb-3 px-4 py-2 text-sm font-semibold bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
            >
              <Icons.ArrowLeft className="w-4 h-4 text-primary" />
              <span>Retour</span>
            </Link>
          )}
          
          {/* Favoris comme catégorie spéciale */}
          {isApogee && (
            <Link
              to="/favorites"
              className={`mx-2 mb-4 px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                isFavoritesPage
                  ? 'bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white shadow-md'
                  : 'bg-white border-2 border-transparent hover:border-helpconfort-orange hover:shadow-sm'
              }`}
            >
              <Icons.Heart className={`w-5 h-5 ${isFavoritesPage ? 'fill-white' : 'text-red-500 fill-red-500'}`} />
              <span className={`font-semibold ${isFavoritesPage ? 'text-white' : 'text-foreground'}`}>
                Mes Favoris
              </span>
            </Link>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {isApogee ? (
                // Affichage pour Apogée (depuis blocks)
                blockCategories.map((category) => {
                  const Icon = IconComponent(category.icon || 'BookOpen');
                  const categorySections = blockSections.filter(s => s.parentId === category.id);
                  const isOpen = openCategories.has(category.id);
                  const isActiveCat = location.pathname.includes(`/apogee/category/${category.slug}`);

                  return (
                    <Collapsible 
                      key={category.id} 
                      open={isOpen}
                      onOpenChange={() => handleToggleCategory(category.id)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className={`w-full bg-white text-foreground hover:border-2 hover:border-helpconfort-orange hover:rounded-lg hover:scale-105 transition-all duration-200 group ${isActiveCat ? 'border-2 border-helpconfort-orange rounded-lg shadow-[0_0_15px_hsl(var(--orange-accent)/0.5)]' : ''}`}>
                            <Icon 
                              className="h-4 w-4 shrink-0 cursor-pointer group-hover:rotate-12 group-hover:scale-110 transition-all duration-200" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/apogee/category/${category.slug}`);
                              }}
                            />
                            <span className="flex-1 text-left truncate group-hover:translate-x-1 transition-transform duration-200">{category.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 transition-all duration-500 ease-in-out group-hover:scale-125" 
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} 
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[state=closed]:opacity-0 data-[state=open]:animate-fade-in">
                          <SidebarMenuSub className="bg-white">
                            {categorySections.map((section) => {
                              const isSectionActive = location.hash === `#${section.id}`;
                              return (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton
                                  onClick={() => handleSectionClick(section.id, category.slug)}
                                  className={`cursor-pointer hover:border-2 hover:border-[#0096D6] hover:rounded-lg hover:scale-105 transition-all duration-200 group ${isSectionActive ? 'border-2 border-[#0096D6] rounded-lg shadow-[0_0_15px_rgba(0,150,214,0.5)]' : ''}`}
                                >
                                  <span className="text-sm group-hover:translate-x-1 transition-transform duration-200">{section.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )})}
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
                          <SidebarMenuButton className="w-full bg-white text-foreground hover:border-2 hover:border-helpconfort-orange hover:rounded-lg hover:scale-105 transition-all duration-200 group">
                            <Icon className="h-4 w-4 shrink-0 group-hover:rotate-12 group-hover:scale-110 transition-all duration-200" />
                            <span className="flex-1 text-left truncate group-hover:translate-x-1 transition-transform duration-200">{category.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 transition-all duration-500 ease-in-out group-hover:scale-125" 
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} 
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[state=closed]:opacity-0 data-[state=open]:animate-fade-in">
                          <SidebarMenuSub className="bg-white">
                            {categorySections.map((section) => (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleSectionClick(section.id, category.id);
                                  }}
                                  className="cursor-pointer hover:border-2 hover:border-[#0096D6] hover:rounded-lg hover:scale-105 transition-all duration-200 group"
                                >
                                  <span className="text-sm group-hover:translate-x-1 transition-transform duration-200">{section.title}</span>
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
      </SidebarContent>
    </Sidebar>
  );
}
