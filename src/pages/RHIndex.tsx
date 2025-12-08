import { Link } from "react-router-dom";
import { 
  Briefcase, 
  FileText, 
  Users, 
  CalendarDays, 
  LayoutDashboard,
  FolderOpen,
  Send,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingDocumentRequestsCount } from "@/hooks/useDocumentRequests";
import { Badge } from "@/components/ui/badge";
import { isModuleOptionEnabled } from "@/types/modules";
import { ROUTES } from "@/config/routes";
import type { LucideIcon } from "lucide-react";

interface RHModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  section: 'salarie' | 'dirigeant';
  requiresOption?: string[];
  enabled?: boolean; // Set to false to temporarily hide a module
}

// Set enabled: false to temporarily hide a module
const RH_MODULES: RHModule[] = [
  // Vue Salarié
  {
    id: 'mon-coffre-rh',
    title: 'Mon Coffre RH',
    description: 'Accédez à vos documents personnels et bulletins de paie',
    icon: FolderOpen,
    href: ROUTES.pilotage.monCoffreRh,
    section: 'salarie',
    requiresOption: ['coffre'],
    enabled: true,
  },
  {
    id: 'faire-demande',
    title: 'Faire une demande',
    description: 'Demandez un document ou un congé',
    icon: Send,
    href: ROUTES.pilotage.faireUneDemande,
    section: 'salarie',
    requiresOption: ['coffre'],
    enabled: false, // Temporairement désactivé
  },
  // Vue Dirigeant
  {
    id: 'mon-equipe',
    title: 'Mon équipe',
    description: 'Gérez les collaborateurs et leurs dossiers RH',
    icon: Users,
    href: ROUTES.pilotage.equipe,
    section: 'dirigeant',
    requiresOption: ['rh_viewer', 'rh_admin'],
    enabled: true,
  },
  {
    id: 'demandes-rh',
    title: 'Demandes RH',
    description: 'Traitez les demandes des collaborateurs',
    icon: FileText,
    href: ROUTES.pilotage.demandesRh,
    section: 'dirigeant',
    requiresOption: ['rh_viewer', 'rh_admin'],
    enabled: false, // Temporairement désactivé
  },
  {
    id: 'dashboard-rh',
    title: 'Dashboard RH',
    description: 'Statistiques et indicateurs RH',
    icon: LayoutDashboard,
    href: ROUTES.pilotage.dashboardRh,
    section: 'dirigeant',
    requiresOption: ['rh_admin'],
    enabled: true,
  },
  {
    id: 'gestion-conges',
    title: 'Gestion des congés',
    description: 'Validez et suivez les congés de l\'équipe',
    icon: CalendarDays,
    href: ROUTES.pilotage.gestionConges,
    section: 'dirigeant',
    requiresOption: ['rh_viewer', 'rh_admin'],
    enabled: true,
  },
];

const RH_GROUPS = {
  salarie: {
    title: 'Vue Salarié',
    icon: Briefcase,
    colorClass: 'text-helpconfort-blue',
  },
  dirigeant: {
    title: 'Vue Dirigeant',
    icon: Users,
    colorClass: 'text-helpconfort-orange',
  },
};

function RHTileCard({ module, badge }: { module: RHModule; badge?: number }) {
  const Icon = module.icon;
  const isOrange = module.section === 'dirigeant';
  
  return (
    <Link to={module.href} className="block group">
      <Card className={`h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4 ${
        isOrange ? 'border-l-helpconfort-orange' : 'border-l-helpconfort-blue'
      } bg-gradient-to-br ${
        isOrange ? 'from-helpconfort-orange/5' : 'from-helpconfort-blue/5'
      } via-background to-background`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${
              isOrange ? 'bg-helpconfort-orange/10' : 'bg-helpconfort-blue/10'
            }`}>
              <Icon className={`h-5 w-5 ${
                isOrange ? 'text-helpconfort-orange' : 'text-helpconfort-blue'
              }`} />
            </div>
            {badge !== undefined && badge > 0 && (
              <Badge variant="destructive" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors">
            {module.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {module.description}
          </p>
          <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
            <span>Accéder</span>
            <ChevronRight className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function RHIndex() {
  const { enabledModules, globalRole } = useAuth();
  const { count: pendingCount } = usePendingDocumentRequestsCount();
  
  const isPlatformAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  
  // Check if user has a specific RH option
  const hasRHOption = (options: string[] | undefined) => {
    if (!options) return true;
    if (isPlatformAdmin) return true;
    
    return options.some(opt => isModuleOptionEnabled(enabledModules, 'rh', opt));
  };
  
  // Filter modules based on user permissions and enabled status
  const visibleModules = RH_MODULES.filter(module => 
    module.enabled !== false && hasRHOption(module.requiresOption)
  );
  
  // Group by section
  const modulesBySection = {
    salarie: visibleModules.filter(m => m.section === 'salarie'),
    dirigeant: visibleModules.filter(m => m.section === 'dirigeant'),
  };
  
  // Get badge for a module
  const getBadge = (moduleId: string): number | undefined => {
    if (moduleId === 'demandes-rh' && pendingCount) {
      return pendingCount;
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-helpconfort-orange/10">
          <Users className="h-6 w-6 text-helpconfort-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ressources Humaines</h1>
          <p className="text-sm text-muted-foreground">Gestion RH et documents collaborateurs</p>
        </div>
      </div>

      {/* Sections */}
      {(['salarie', 'dirigeant'] as const).map(sectionKey => {
        const sectionModules = modulesBySection[sectionKey];
        if (sectionModules.length === 0) return null;
        
        const group = RH_GROUPS[sectionKey];
        const GroupIcon = group.icon;
        
        // Only show section titles if user can see both sections (admin view)
        const showSectionTitle = modulesBySection.salarie.length > 0 && modulesBySection.dirigeant.length > 0;
        
        return (
          <div key={sectionKey} className="space-y-4">
            {showSectionTitle && (
              <div className="flex items-center gap-2">
                <GroupIcon className={`h-5 w-5 ${group.colorClass}`} />
                <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
                {sectionKey === 'dirigeant' && pendingCount !== undefined && pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingCount}</Badge>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionModules.map(module => (
                <RHTileCard 
                  key={module.id} 
                  module={module} 
                  badge={getBadge(module.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
