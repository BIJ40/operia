import { Home, Users, Layers, Wrench } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Accueil", url: "/mes-indicateurs", icon: Home, end: true },
  { title: "Les apporteurs", url: "/mes-indicateurs/apporteurs", icon: Users },
  { title: "Les univers", url: "/mes-indicateurs/univers", icon: Layers },
  { title: "Les techniciens", url: "/mes-indicateurs/techniciens", icon: Wrench },
];

export function IndicateursSidebar() {
  return (
    <Sidebar className="border-r border-border bg-background">
      <SidebarContent className="pt-24">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.end}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-primary/10 hover:to-helpconfort-blue-dark/10 transition-all"
                      activeClassName="bg-gradient-to-r from-primary/20 to-helpconfort-blue-dark/20 border-l-4 border-l-accent font-semibold"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
