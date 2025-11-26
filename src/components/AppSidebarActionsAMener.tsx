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

export function AppSidebarActionsAMener() {
  const location = useLocation();
  const navigate = useNavigate();
  const { blocks } = useEditor();
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([]);
  const [blockSections, setBlockSections] = useState<BlockSection[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  
  // Déterminer la page parent basée sur la route actuelle
  const getParentPath = () => {
    const path = location.pathname;
    if (path === '/actions-a-mener') return '/';
    if (path.startsWith('/actions-a-mener/category/')) return '/actions-a-mener';
    return '/';
  };

  const parentPath = getParentPath();

  // Charger depuis blocks
  useEffect(() => {
    const cats = blocks
      .filter(b => b.type === 'category' && b.slug.startsWith('actions-a-mener-'))
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

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.ListTodo;
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

  const handleSectionClick = (sectionId: string, categorySlug: string) => {
    navigate(`/actions-a-mener/category/${categorySlug}#${sectionId}`);
  };

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Icons.ListTodo className="w-8 h-8 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Actions à mener</h2>
        </div>
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

          <SidebarGroupContent>
            <SidebarMenu>
              {blockCategories.map((category) => {
                const Icon = IconComponent(category.icon || 'ListTodo');
                const categorySections = blockSections.filter(s => s.parentId === category.id);
                const isOpen = openCategories.has(category.id);
                const isActiveCat = location.pathname.includes(`/actions-a-mener/category/${category.slug}`);

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
                              navigate(`/actions-a-mener/category/${category.slug}`);
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
