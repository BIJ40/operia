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

interface AppSidebarProps {
  scope?: string;
}

export function AppSidebar({ scope = 'guide-apogee' }: AppSidebarProps) {
  const { blocks } = useEditor();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [scopedCategories, setScopedCategories] = useState<any[]>([]);
  
  // Charger les catégories selon le scope
  useEffect(() => {
    if (scope === 'guide-apogee') {
      // Utiliser les blocks du contexte pour le guide Apogée
      const cats = blocks
        .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
        .sort((a, b) => a.order - b.order);
      setScopedCategories(cats);
    } else if (scope === 'apporteurs-nationaux') {
      const savedData = localStorage.getItem('apporteursNationauxData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setScopedCategories(data.categories || []);
      }
    } else if (scope === 'informations-utiles') {
      const savedData = localStorage.getItem('informationsUtilesData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setScopedCategories(data.categories || []);
      }
    }
  }, [scope, blocks]);
  
  const categories = scopedCategories;

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  // Déterminer quelle catégorie doit être ouverte selon la route actuelle
  const currentPath = location.pathname;
  const currentCategory = categories.find(cat => currentPath.includes(`/category/${cat.slug}`));

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

  // Déterminer le préfixe de route selon le scope
  const getRoutePrefix = () => {
    if (scope === 'apporteurs-nationaux') return '/apporteurs-nationaux';
    if (scope === 'informations-utiles') return '/informations-utiles';
    return '/guide-apogee';
  };

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <Link to="/" className="block" onClick={(e) => e.stopPropagation()}>
          <img 
            src={logoApogee} 
            alt="Apogée CRM - Retour à l'accueil" 
            className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
            draggable={false}
            data-no-modal="true"
          />
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Sommaire des catégories */}
        <SidebarGroup>
          <SidebarGroupLabel>Sommaire</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => {
                const Icon = IconComponent(category.icon || 'BookOpen');
                
                // Pour guide-apogee, on affiche les sections
                if (scope === 'guide-apogee') {
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
                                  <Link to={`${getRoutePrefix()}/category/${category.slug}#${section.id}`}>
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
                } else {
                  // Pour les autres scopes, lien direct vers la catégorie
                  return (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton asChild>
                        <Link to={`${getRoutePrefix()}/category/${category.slug}`}>
                          <Icon className="w-4 h-4" />
                          <span className="flex-1 text-left">{category.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
