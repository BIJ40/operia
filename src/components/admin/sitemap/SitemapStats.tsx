import { Card, CardContent } from "@/components/ui/card";
import { 
  Route, 
  Shield, 
  Box, 
  ArrowRight, 
  Variable, 
  Globe,
  Layers,
  Lock,
  Crown
} from "lucide-react";
import { getSitemapStats } from "@/config/sitemapData";

export function SitemapStats() {
  const stats = getSitemapStats();
  
  const statCards = [
    {
      label: "Routes totales",
      value: stats.totalRoutes,
      icon: Route,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Routes actives",
      value: stats.activeRoutes,
      icon: Layers,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "RoleGuard",
      value: stats.routesWithRoleGuard,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "ModuleGuard",
      value: stats.routesWithModuleGuard,
      icon: Box,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
    },
    {
      label: "Plan requis",
      value: stats.routesWithPlanRequired,
      icon: Crown,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Guards spéciaux",
      value: stats.routesWithSpecialGuard,
      icon: Lock,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: "Redirections",
      value: stats.redirectRoutes,
      icon: ArrowRight,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Routes publiques",
      value: stats.publicRoutes,
      icon: Globe,
      color: "text-gray-600",
      bgColor: "bg-gray-100 dark:bg-gray-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {statCards.map((stat) => (
        <Card key={stat.label} className="border-none shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
