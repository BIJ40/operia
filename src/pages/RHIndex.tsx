/**
 * RHIndex - Page index RH pour N2+ uniquement
 * Le portail salarié N1 a été supprimé.
 */
import { 
  Users, 
  CalendarDays,
  Car,
  ClipboardList,
  Presentation
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import { IndexTile } from "@/components/ui/index-tile";
import type { LucideIcon } from "lucide-react";

interface RHModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const RH_MODULES: RHModule[] = [
  {
    id: 'suivi-rh',
    title: 'Suivi RH',
    description: 'Gestion des collaborateurs',
    icon: ClipboardList,
    href: ROUTES.rh.suivi,
  },
  {
    id: 'plannings',
    title: 'Plannings',
    description: 'Plannings hebdomadaires',
    icon: CalendarDays,
    href: ROUTES.rh.plannings,
  },
  // DocGen masqué pour le moment - accessible via /admin/hidden-features
  // {
  //   id: 'docgen',
  //   title: 'DocGen',
  //   description: 'Génération de documents',
  //   icon: FileEdit,
  //   href: ROUTES.rh.docgen,
  // },
  {
    id: 'reunions',
    title: 'Réunions',
    description: 'Historique des réunions',
    icon: Presentation,
    href: ROUTES.rh.reunions,
  },
];

const MAINTENANCE_MODULES: RHModule[] = [
  {
    id: 'parc-vehicules',
    title: 'Parc & Matériel',
    description: 'Véhicules, EPI et équipements',
    icon: Car,
    href: ROUTES.rh.parc,
  },
];

export default function RHIndex() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="RH & Maintenance"
        subtitle="Gestion des ressources humaines et maintenance"
        backTo="/"
        backLabel="Accueil"
      />

      {/* Section Gestion RH */}
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

      {/* Section Maintenance */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Car className="h-5 w-5 text-helpconfort-blue" />
          Maintenance
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
    </div>
  );
}
