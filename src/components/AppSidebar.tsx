import { useEditor } from '@/contexts/EditorContext';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const { blocks } = useEditor();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  
  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);
  
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  // Déterminer quelle catégorie doit être ouverte selon la route actuelle
  const currentPath = location.pathname;
  const currentCategory = categories.find(cat => currentPath.includes(`/apogee/category/${cat.slug}`));

  // Ouvrir automatiquement la catégorie correspondant à la page actuelle
  useEffect(() => {
    if (currentCategory) {
      setOpenCategoryId(currentCategory.id);
    }
  }, [currentCategory?.id]);

  // Gérer l'ouverture/fermeture des catégories (une seule à la fois)
  const handleToggleCategory = (categoryId: string) => {
    setOpenCategoryId(prev => prev === categoryId ? null : categoryId);
  };

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <Link to="/apogee" className="block" onClick={(e) => e.stopPropagation()}>
          <img 
            src={logoApogee} 
            alt="Apogée CRM - Guide Apogée" 
            className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
            draggable={false}
            data-no-modal="true"
          />
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {faqCategory && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === `/apogee/category/${faqCategory.slug}`}>
                    <Link to={`/apogee/category/${faqCategory.slug}`}>
                      <Icons.HelpCircle className="w-4 h-4" />
                      <span>FAQ</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sommaire des catégories */}
        <SidebarGroup>
          <SidebarGroupLabel>Sommaire</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => {
                const Icon = IconComponent(category.icon || 'BookOpen');
                const sections = blocks
                  .filter(b => b.type === 'section' && b.parentId === category.id && !b.hideFromSidebar)
                  .sort((a, b) => a.order - b.order);

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
                          {sections.map((section) => (
                            <SidebarMenuSubItem key={section.id}>
                              <SidebarMenuSubButton asChild>
                                <Link to={`/apogee/category/${category.slug}#${section.id}`}>
                                  <span className="text-sm">{section.title}</span>
                                </Link>
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
      </SidebarContent>
    </Sidebar>
  );
}
