import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  FileText, 
  Database, 
  Shield,
  ArrowLeft,
  Home,
  MessageSquare,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

const adminMenuItems = [
  {
    title: 'Vue d\'ensemble',
    url: '/admin',
    icon: Home,
  },
  {
    title: 'Utilisateurs',
    icon: Users,
    subItems: [
      {
        title: 'Créer utilisateur',
        url: '/admin/users',
      },
      {
        title: 'Liste utilisateurs',
        url: '/admin/users-list',
      },
      {
        title: 'Permissions',
        url: '/admin/role-permissions',
      },
    ]
  },
  {
    title: 'Agences',
    url: '/admin/agencies',
    icon: Settings,
  },
  {
    title: 'Mme Michu',
    url: '/admin/documents',
    icon: MessageSquare,
  },
  {
    title: 'Support',
    url: '/admin/support',
    icon: MessageSquare,
  },
  {
    title: 'Surveillance Quota',
    url: '/admin/storage-quota',
    icon: HardDrive,
  },
  {
    title: 'Sauvegardes',
    url: '/admin/backup',
    icon: Database,
  },
];

export function AppSidebarAdmin() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on a user-related page to keep the group open by default
  const isUserPage = location.pathname.includes('/admin/users') || 
                     location.pathname.includes('/admin/role-permissions');
  const [usersOpen, setUsersOpen] = useState(isUserPage);

  const getParentPath = () => {
    const path = location.pathname;
    
    // Si on est sur une sous-page admin, retourner à /admin
    if (path !== '/admin' && path.startsWith('/admin')) {
      return '/admin';
    }
    
    // Si on est sur /admin, retourner à la home
    if (path === '/admin') {
      return '/';
    }
    
    return null;
  };

  const parentPath = getParentPath();
  const showReturnButton = parentPath !== null;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {showReturnButton && (
          <div className="p-2">
            <Button
              variant="ghost"
              size={open ? "default" : "icon"}
              onClick={() => navigate(parentPath)}
              className="w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4" />
              {open && <span className="ml-2">Retour</span>}
            </Button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {open && <span>Administration</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                if (item.subItems) {
                  return (
                    <Collapsible 
                      key={item.title} 
                      open={usersOpen} 
                      onOpenChange={setUsersOpen}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="hover:bg-accent">
                            <item.icon className="h-4 w-4" />
                            {open && <span>{item.title}</span>}
                            {open && (
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={subItem.url}
                                    className="hover:bg-accent"
                                    activeClassName="bg-accent text-accent-foreground font-medium"
                                  >
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url!} 
                        end={item.url === '/admin'}
                        className="hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-2 border-t">
        <SidebarTrigger className="w-full" />
      </div>
    </Sidebar>
  );
}
