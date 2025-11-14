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
import logoApogee from '@/assets/logo_helpogee.png';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';

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

export function AppSidebar() {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  
  // Déterminer le scope selon la route
  const getScope = () => {
    const path = location.pathname;
    if (path.startsWith('/apogee')) return 'guide-apogee';
    if (path.startsWith('/guide-apporteurs')) return 'apporteurs-nationaux';
    if (path.startsWith('/help-confort')) return 'informations-utiles';
    return null;
  };

  const scope = getScope();

  useEffect(() => {
    if (!scope) return;

    // Charger les catégories et sections pour ce scope
    const loadData = async () => {
      const supabaseAny = supabase as any;
      const { data: cats } = await supabaseAny
        .from('categories')
        .select('*')
        .eq('scope', scope)
        .order('display_order');
      
      if (cats) {
        setCategories(cats);
        
        // Charger toutes les sections pour ces catégories
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
  }, [scope]);

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const handleToggleCategory = (categoryId: string) => {
    setOpenCategoryId(prev => prev === categoryId ? null : categoryId);
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
              {categories.map((category) => {
                const Icon = IconComponent(category.icon);
                const categorySections = sections.filter(s => s.category_id === category.id);
                const isOpen = openCategoryId === category.id;

                return (
                  <Collapsible 
                    key={category.id} 
                    className="group/collapsible"
                    open={isOpen}
                    onOpenChange={() => handleToggleCategory(category.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <Icon className="w-4 h-4" />
                          <span className="flex-1 text-left">{category.title}</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {categorySections.map((section) => (
                            <SidebarMenuSubItem key={section.id}>
                              <SidebarMenuSubButton asChild>
                                <NavLink 
                                  to={`#${section.id}`}
                                  className="hover:bg-muted/50"
                                  activeClassName="bg-muted text-primary font-medium"
                                >
                                  {section.title}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* FAQ en bas (uniquement pour Apogée) */}
        {scope === 'guide-apogee' && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="#faq"
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Icons.HelpCircle className="w-4 h-4" />
                      <span>FAQ</span>
                    </NavLink>
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
