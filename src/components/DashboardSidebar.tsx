import { useAuth } from '@/contexts/AuthContext';
import { useEditor } from '@/contexts/EditorContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Lock } from 'lucide-react';
import logoHelpogee from '@/assets/logo_helpogee.png';

const supabaseAny = supabase as any;

interface Category {
  id: string;
  title: string;
  icon: string;
  slug: string;
  scope: string;
}

export function DashboardSidebar() {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();
  const { blocks } = useEditor();
  const [categories, setCategories] = useState<Category[]>([]);
  const [apporteurCategories, setApporteurCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, [blocks]);

  const loadCategories = async () => {
    // Charger les catégories Apogée
    const apogeeCategories = blocks
      .filter(b => b.type === 'category' && !b.slug.startsWith('helpconfort-'))
      .map(b => ({
        id: b.id,
        title: b.title,
        icon: b.icon || 'BookOpen',
        slug: b.slug,
        scope: 'apogee'
      }));

    // Charger les catégories HelpConfort
    const helpconfortCategories = blocks
      .filter(b => b.type === 'category' && b.slug.startsWith('helpconfort-'))
      .map(b => ({
        id: b.id,
        title: b.title,
        icon: b.icon || 'BookOpen',
        slug: b.slug,
        scope: 'helpconfort'
      }));

    // Charger les catégories Apporteurs
    try {
      const { data } = await supabaseAny
        .from('apporteur_blocks')
        .select('id, title, icon, slug')
        .eq('type', 'category')
        .order('order');

      if (data) {
        setApporteurCategories(data.map((cat: any) => ({
          ...cat,
          scope: 'apporteur'
        })));
      }
    } catch (error) {
      console.error('Error loading apporteur categories:', error);
    }

    setCategories([...apogeeCategories, ...helpconfortCategories]);
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return Icons.BookOpen;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.BookOpen;
  };

  const isLocked = (categoryId: string): boolean => {
    if (isAdmin) return false;
    if (!roleAgence) return false;
    return !hasAccessToBlock(categoryId);
  };

  const getCategoryUrl = (category: Category) => {
    if (category.scope === 'apporteur') {
      return `/apporteurs/category/${category.slug}`;
    } else if (category.scope === 'helpconfort') {
      return `/helpconfort/category/${category.slug}`;
    }
    return `/apogee/category/${category.slug}`;
  };

  // Filtrer selon les permissions
  const accessibleApogeeCategories = categories.filter(
    cat => cat.scope === 'apogee' && !isLocked(cat.id)
  );
  const accessibleHelpconfortCategories = categories.filter(
    cat => cat.scope === 'helpconfort' && !isLocked(cat.id)
  );
  const accessibleApporteurCategories = apporteurCategories.filter(
    cat => !isLocked(cat.id)
  );

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoHelpogee} alt="Helpogée" className="h-8" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {accessibleApogeeCategories.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Guide Apogée</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleApogeeCategories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const locked = isLocked(category.id);

                  return (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton asChild disabled={locked}>
                        {locked ? (
                          <div className="flex items-center gap-2 opacity-50">
                            <Lock className="h-4 w-4" />
                            <span>{category.title}</span>
                          </div>
                        ) : (
                          <Link to={getCategoryUrl(category)} className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{category.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {accessibleApporteurCategories.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Guide Apporteurs</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleApporteurCategories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const locked = isLocked(category.id);

                  return (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton asChild disabled={locked}>
                        {locked ? (
                          <div className="flex items-center gap-2 opacity-50">
                            <Lock className="h-4 w-4" />
                            <span>{category.title}</span>
                          </div>
                        ) : (
                          <Link to={getCategoryUrl(category)} className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{category.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {accessibleHelpconfortCategories.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Base Documentaire</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleHelpconfortCategories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const locked = isLocked(category.id);

                  return (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton asChild disabled={locked}>
                        {locked ? (
                          <div className="flex items-center gap-2 opacity-50">
                            <Lock className="h-4 w-4" />
                            <span>{category.title}</span>
                          </div>
                        ) : (
                          <Link to={getCategoryUrl(category)} className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{category.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
