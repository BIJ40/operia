import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
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
import { useEditor } from '@/contexts/EditorContext';

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

export function AppSidebarHelpConfort() {
  const location = useLocation();
  const navigate = useNavigate();
  const { blocks } = useEditor();
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([]);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Charger depuis blocks pour HelpConfort
  useEffect(() => {
    const cats = blocks
      .filter(b => b.type === 'category' && b.slug.startsWith('helpconfort-') && !b.hideFromSidebar)
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        icon: b.icon
      }));
    
    setBlockCategories(cats);
    
    const secs = blocks
      .filter(b => b.type === 'section' && b.parentId && cats.some(c => c.id === b.parentId))
      .filter(b => !b.hideFromSidebar)
      .sort((a, b) => a.order - b.order)
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        parentId: b.parentId!,
        hideFromSidebar: b.hideFromSidebar
      }));
    
    setBlockSections(secs);
    
    // Ouvrir la catégorie active
    const currentCategorySlug = location.pathname.split('/')[3];
    const activeCategory = cats.find(c => c.slug === currentCategorySlug);
    if (activeCategory) {
      setOpenCategories(new Set([activeCategory.id]));
    }
  }, [blocks, location.pathname]);

  const IconComponent = (iconName?: string) => {
    if (!iconName) return Icons.BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
      return () => <img src={iconName} alt="" className="w-4 h-4 object-contain" />;
    }
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
    navigate(`/helpconfort/category/${categoryIdentifier}#${sectionId}`);
  };

  // Déterminer la page parent basée sur la route actuelle
  const getParentPath = () => {
    const path = location.pathname;
    if (path === '/helpconfort' || path === '/') return null; // Déjà sur la page d'accueil
    if (path.startsWith('/helpconfort/category/')) return '/helpconfort';
    return '/';
  };

  const parentPath = getParentPath();

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-2 border-b">
        <Link to="/helpconfort" className="block h-32" onClick={(e) => e.stopPropagation()}>
          <img 
            src={logoApogee} 
            alt="HelpConfort" 
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
          <Link
            to="/favorites"
            className={`mx-2 mb-4 px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
              location.pathname === '/favorites'
                ? 'bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white shadow-md'
                : 'bg-white border-2 border-transparent hover:border-helpconfort-orange hover:shadow-sm'
            }`}
          >
            <Icons.Heart className={`w-5 h-5 ${location.pathname === '/favorites' ? 'fill-white' : 'text-red-500 fill-red-500'}`} />
            <span className={`font-semibold ${location.pathname === '/favorites' ? 'text-white' : 'text-foreground'}`}>
              Mes Favoris
            </span>
          </Link>

          <SidebarGroupContent>
            <SidebarMenu>
              {blockCategories.map((category) => {
                const Icon = IconComponent(category.icon || 'BookOpen');
                const categorySections = blockSections.filter(s => s.parentId === category.id);
                const isOpen = openCategories.has(category.id);
                const isActiveCat = location.pathname.includes(`/helpconfort/category/${category.slug}`);

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
                              navigate(`/helpconfort/category/${category.slug}`);
                            }}
                          />
                          <span className="flex-1 text-left truncate group-hover:translate-x-1 transition-transform duration-200">{category.title}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 transition-all duration-500 ease-in-out group-hover:scale-125" 
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} 
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {categorySections.length > 0 && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {categorySections.map((section) => (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton
                                  onClick={() => handleSectionClick(section.id, category.slug)}
                                  className="cursor-pointer hover:bg-helpconfort-blue-light/20 hover:translate-x-1 transition-all duration-200"
                                >
                                  <span className="truncate">{section.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
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
