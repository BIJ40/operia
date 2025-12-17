import { useState } from "react";
import { 
  Users, 
  CalendarDays,
  FileText,
  Car,
  HardHat,
  FolderOpen,
  Calendar,
  ClipboardList,
  Wrench,
  FileEdit,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import { IndexTile } from "@/components/ui/index-tile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    id: 'mon-planning',
    title: 'Mon Planning',
    description: 'Mon planning hebdomadaire',
    icon: CalendarDays,
    href: ROUTES.rh.monPlanning,
  },
  {
    id: 'mon-vehicule',
    title: 'Mon Véhicule',
    description: 'Mon véhicule de service',
    icon: Car,
    href: ROUTES.rh.monVehicule,
  },
  {
    id: 'mon-materiel',
    title: 'Mon Matériel',
    description: 'Mon matériel et équipements',
    icon: Wrench,
    href: ROUTES.rh.monMateriel,
  },
  {
    id: 'demande-rh',
    title: 'Demande RH',
    description: 'Poser une demande',
    icon: Calendar,
    href: ROUTES.rh.demande,
  },
];

const RH_MODULES: RHModule[] = [
  {
    id: 'suivi-rh',
    title: 'Suivi RH',
    description: 'Vue complète des collaborateurs',
    icon: ClipboardList,
    href: ROUTES.rh.suivi,
  },
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
    id: 'heures',
    title: 'Heures',
    description: 'Feuilles de temps',
    icon: Clock,
    href: ROUTES.rh.heures,
  },
  {
    id: 'demandes-rh',
    title: 'Demandes RH',
    description: 'Traiter les demandes',
    icon: FileText,
    href: ROUTES.rh.demandes,
  },
  {
    id: 'docgen',
    title: 'DocGen',
    description: 'Génération de documents',
    icon: FileEdit,
    href: ROUTES.rh.docgen,
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


export default function RHIndex() {
  const { globalRole } = useAuth();
  const [adminViewMode, setAdminViewMode] = useState<'n1' | 'n2'>('n2');
  
  const isPlatformAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  const isN5N6 = isPlatformAdmin;
  const isN2Plus = globalRole === 'franchisee_admin' || globalRole === 'franchisor_user' || 
                   globalRole === 'franchisor_admin' || isPlatformAdmin;

  // Determine which view to show
  const showN1View = isN5N6 ? adminViewMode === 'n1' : !isN2Plus;
  const showN2View = isN5N6 ? adminViewMode === 'n2' : isN2Plus;

  // N1 View (Mon Espace Salarié)
  if (showN1View && !isN5N6) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <PageHeader
          title="Mon Espace Salarié"
          subtitle="Mon espace personnel"
          backTo="/"
          backLabel="Accueil"
        />

        {/* Section Mon Espace pour N1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
            Mon Espace
          </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MON_ESPACE_MODULES.map(module => (
              <IndexTile
                key={module.id}
                title={module.title}
                description={module.description}
                icon={module.icon}
                href={module.href}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title={showN1View ? "Mon Espace Salarié" : "RH & PARC"}
        subtitle={showN1View ? "Mon espace personnel" : "Gestion des ressources humaines et du matériel"}
        backTo="/"
        backLabel="Accueil"
      />

      {/* Admin View Tabs - N5/N6 only */}
      {isN5N6 && (
        <div className="flex justify-center">
          <Tabs value={adminViewMode} onValueChange={(v) => setAdminViewMode(v as 'n1' | 'n2')}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="n1" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Vue N1 (Salarié)
              </TabsTrigger>
              <TabsTrigger value="n2" className="data-[state=active]:bg-helpconfort-blue data-[state=active]:text-white">
                Vue N2 (Dirigeant)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Section Mon Espace - N2 doesn't see "Demande RH" */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
          Mon Espace {showN1View ? "Salarié" : ""}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MON_ESPACE_MODULES
            .filter(module => showN1View || module.id !== 'demande-rh')
            .map(module => (
              <IndexTile
                key={module.id}
                title={module.title}
                description={module.description}
                icon={module.icon}
                href={module.href}
              />
          ))}
        </div>
      </section>

      {/* Section Gestion RH - N2 view only */}
      {showN2View && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-helpconfort-blue" />
            Gestion RH
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RH_MODULES.map(module => (
              <IndexTile
                key={module.id}
                title={module.title}
                description={module.description}
                icon={module.icon}
                href={module.href}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section Maintenance Matériel - N2 view only */}
      {showN2View && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <HardHat className="h-5 w-5 text-helpconfort-blue" />
            Maintenance Matériel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MAINTENANCE_MODULES.map(module => (
              <IndexTile
                key={module.id}
                title={module.title}
                description={module.description}
                icon={module.icon}
                href={module.href}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
