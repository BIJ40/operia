import { Link } from "react-router-dom";
import { 
  FileText, 
  Users, 
  CalendarDays,
  CalendarCheck,
  FolderOpen,
  Send,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingDocumentRequestsCount } from "@/hooks/useDocumentRequests";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import { RHDashboard } from "@/components/rh/dashboard";
import type { LucideIcon } from "lucide-react";

interface RHModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  section: 'salarie' | 'dirigeant';
  enabled?: boolean;
}

const RH_MODULES: RHModule[] = [
  // Vue Salarié
  {
    id: 'mon-coffre-rh',
    title: 'Mon Coffre RH',
    description: 'Accédez à vos documents personnels et bulletins de paie',
    icon: FolderOpen,
    href: ROUTES.rh.coffre,
    section: 'salarie',
    enabled: true,
  },
  {
    id: 'faire-demande',
    title: 'Faire une demande',
    description: 'Demandez un document ou un congé',
    icon: Send,
    href: ROUTES.rh.demande,
    section: 'salarie',
    enabled: false,
  },
  // Vue Dirigeant
  {
    id: 'mon-equipe',
    title: 'Mon équipe',
    description: 'Gérez les collaborateurs et leurs dossiers RH',
    icon: Users,
    href: ROUTES.rh.equipe,
    section: 'dirigeant',
    enabled: true,
  },
  {
    id: 'plannings',
    title: 'Plannings',
    description: 'Consultez et signez les plannings hebdomadaires',
    icon: CalendarDays,
    href: ROUTES.rh.plannings,
    section: 'dirigeant',
    enabled: true,
  },
  {
    id: 'demandes-rh',
    title: 'Demandes RH',
    description: 'Traitez les demandes des collaborateurs',
    icon: FileText,
    href: ROUTES.rh.demandes,
    section: 'dirigeant',
    enabled: false,
  },
  {
    id: 'gestion-conges',
    title: 'Gestion des congés',
    description: 'Validez et suivez les congés de l\'équipe',
    icon: CalendarCheck,
    href: ROUTES.rh.conges,
    section: 'dirigeant',
    enabled: true,
  },
];

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
  const { globalRole } = useAuth();
  const { count: pendingCount } = usePendingDocumentRequestsCount();
  
  const isPlatformAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  // N2+ = vue dirigeant UNIQUEMENT
  const isN2Plus = globalRole === 'franchisee_admin' || globalRole === 'franchisor_user' || 
                   globalRole === 'franchisor_admin' || isPlatformAdmin;
  // N1 = vue salarié UNIQUEMENT
  const isN1 = globalRole === 'franchisee_user';
  
  // Chaque rôle voit UNIQUEMENT sa section - pas de mélange
  const visibleModules = RH_MODULES.filter(module => {
    if (module.enabled === false) return false;
    
    // N2+ voit UNIQUEMENT la section dirigeant
    if (isN2Plus) return module.section === 'dirigeant';
    
    // N1 voit UNIQUEMENT la section salarié
    if (isN1) return module.section === 'salarie';
    
    // N0 ou autres : aucun accès RH
    return false;
  });
  
  // Get badge for a module
  const getBadge = (moduleId: string): number | undefined => {
    if (moduleId === 'demandes-rh' && pendingCount) {
      return pendingCount;
    }
    return undefined;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Ressources Humaines"
        subtitle={isN2Plus ? "Gestion RH et documents collaborateurs" : "Mon espace RH personnel"}
        backTo="/"
        backLabel="Accueil"
      />

      {/* N2+: Dashboard intégré + tiles de navigation */}
      {isN2Plus && (
        <>
          <RHDashboard />
          <div className="pt-4">
            <h2 className="text-lg font-semibold mb-3">Accès rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleModules.map(module => (
                <RHTileCard 
                  key={module.id} 
                  module={module} 
                  badge={getBadge(module.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* N1: Tiles seulement */}
      {isN1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleModules.map(module => (
            <RHTileCard 
              key={module.id} 
              module={module} 
              badge={getBadge(module.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
