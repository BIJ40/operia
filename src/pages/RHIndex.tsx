import { Link } from "react-router-dom";
import { 
  Users, 
  CalendarDays,
  FileText,
  Car,
  HardHat,
  ChevronRight,
  FolderOpen,
  Calendar
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import type { LucideIcon } from "lucide-react";

interface RHModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

const MON_ESPACE_MODULES: RHModule[] = [
  {
    id: 'mon-coffre-rh',
    title: 'Mon Coffre RH',
    description: 'Mes documents personnels',
    icon: FolderOpen,
    href: ROUTES.rh.coffre,
  },
  {
    id: 'demande-conge',
    title: 'Demande de congé',
    description: 'Poser une demande',
    icon: Calendar,
    href: ROUTES.rh.demande,
  },
];

const RH_MODULES: RHModule[] = [
  {
    id: 'mon-equipe',
    title: 'Mon équipe',
    description: 'Collaborateurs et RH',
    icon: Users,
    href: ROUTES.rh.equipe,
  },
  {
    id: 'plannings',
    title: 'Plannings',
    description: 'Plannings hebdomadaires',
    icon: CalendarDays,
    href: ROUTES.rh.plannings,
  },
  {
    id: 'demandes-rh',
    title: 'Demandes RH',
    description: 'Traiter les demandes',
    icon: FileText,
    href: ROUTES.rh.demandes,
  },
];

const MAINTENANCE_MODULES: RHModule[] = [
  {
    id: 'parc-vehicules',
    title: 'Parc Véhicules',
    description: 'Gérez les véhicules, CT, entretiens et assurances',
    icon: Car,
    href: ROUTES.rh.parc,
  },
  {
    id: 'materiel-epi',
    title: 'Matériel & EPI',
    description: 'Gérez le matériel et les équipements de protection',
    icon: HardHat,
    href: ROUTES.rh.epi,
  },
];

function BlueTileCard({ module }: { module: RHModule }) {
  const Icon = module.icon;
  
  return (
    <Link to={module.href} className="block group">
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardContent className="p-4">
          <div className="p-2 rounded-lg bg-helpconfort-blue/10 w-fit">
            <Icon className="h-5 w-5 text-helpconfort-blue" />
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
  
  const isPlatformAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  const isN2Plus = globalRole === 'franchisee_admin' || globalRole === 'franchisor_user' || 
                   globalRole === 'franchisor_admin' || isPlatformAdmin;

  if (!isN2Plus) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="RH & PARC"
          subtitle="Accès restreint"
          backTo="/"
          backLabel="Accueil"
        />
        <p className="text-muted-foreground">Vous n'avez pas accès à cette section.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="RH & PARC"
        subtitle="Gestion des ressources humaines et du matériel"
        backTo="/"
        backLabel="Accueil"
      />

      {/* Section Mon Espace */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
          Mon Espace
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MON_ESPACE_MODULES.map(module => (
            <BlueTileCard key={module.id} module={module} />
          ))}
        </div>
      </section>

      {/* Section Gestion RH */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-helpconfort-blue" />
          Gestion RH
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RH_MODULES.map(module => (
            <BlueTileCard key={module.id} module={module} />
          ))}
        </div>
      </section>

      {/* Section Maintenance Matériel */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HardHat className="h-5 w-5 text-helpconfort-blue" />
          Maintenance Matériel
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MAINTENANCE_MODULES.map(module => (
            <BlueTileCard 
              key={module.id} 
              module={module}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
