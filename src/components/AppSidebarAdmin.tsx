import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  FileText, 
  Database, 
  Shield,
  ArrowLeft,
  Home,
  MessageSquare
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const adminMenuItems = [
  {
    title: 'Vue d\'ensemble',
    url: '/admin',
    icon: Home,
  },
  {
    title: 'Créer utilisateur',
    url: '/admin/users',
    icon: Users,
  },
  {
    title: 'Liste utilisateurs',
    url: '/admin/users-list',
    icon: Users,
  },
  {
    title: 'Permissions',
    url: '/admin/role-permissions',
    icon: Shield,
  },
  {
    title: 'Mme Michu',
    url: '/admin/documents',
    icon: MessageSquare,
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
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
