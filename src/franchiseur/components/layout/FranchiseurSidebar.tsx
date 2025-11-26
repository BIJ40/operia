import { Building2, BarChart3, TrendingUp, Euro, Settings, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
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
} from "@/components/ui/sidebar";

export function FranchiseurSidebar() {
  const { state } = useSidebar();
  const { permissions } = useFranchiseur();
  const collapsed = state === "collapsed";

  const mainItems = [
    { title: "Accueil", url: "/tete-de-reseau", icon: Home },
    { title: "Agences", url: "/tete-de-reseau/agences", icon: Building2 },
    { title: "Statistiques", url: "/tete-de-reseau/stats", icon: BarChart3 },
    { title: "Comparatifs", url: "/tete-de-reseau/comparatifs", icon: TrendingUp },
  ];

  const managementItems = [];
  
  if (permissions.canViewRoyalties) {
    managementItems.push(
      { title: "Redevances", url: "/tete-de-reseau/redevances", icon: Euro },
      { title: "Paramètres", url: "/tete-de-reseau/parametres", icon: Settings }
    );
  }

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tête de Réseau</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/tete-de-reseau"}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-muted/50" 
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
