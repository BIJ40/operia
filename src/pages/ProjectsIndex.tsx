import { Kanban, Settings, Star, AlertTriangle, ListTodo } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { IndexTile, type IndexTileProps } from '@/components/ui/index-tile';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ExcelImportTile } from '@/apogee-tickets/components/ExcelImportTile';
import { PageHeader } from '@/components/layout/PageHeader';

interface ProjectModule {
  title: string;
  description: string;
  icon: typeof Kanban;
  href: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const PROJECT_MODULES: ProjectModule[] = [
  {
    title: 'Kanban',
    description: 'Vue Kanban des tickets projet',
    icon: Kanban,
    href: ROUTES.projects.kanban,
  },
  {
    title: 'Liste',
    description: 'Liste complète des tickets',
    icon: ListTodo,
    href: ROUTES.projects.list,
  },
  {
    title: 'Tickets incomplets',
    description: 'Tickets nécessitant des informations',
    icon: AlertTriangle,
    href: ROUTES.projects.incomplete,
  },
  {
    title: 'Review',
    description: 'Revue des tickets qualifiés',
    icon: Star,
    href: ROUTES.projects.review,
  },
];

const ADMIN_MODULES: ProjectModule[] = [
  {
    title: 'Permissions',
    description: 'Gérer les rôles et permissions',
    icon: Settings,
    href: ROUTES.projects.permissions,
  },
];

export default function ProjectsIndex() {
  const { isAdmin } = usePermissions();

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <PageHeader 
        title="Ticketing"
        subtitle="Gérez le backlog, les tickets et le suivi de développement"
        backTo="/"
        backLabel="Accueil"
      />

      {/* Main modules */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Tableau de bord</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROJECT_MODULES.map((module) => {
            const tileProps: IndexTileProps = {
              icon: module.icon,
              title: module.title,
              description: module.description,
              href: module.href,
              badge: module.badge,
            };
            return <IndexTile key={module.href} {...tileProps} />;
          })}
        </div>
      </section>

      {/* Admin section */}
      {isAdmin && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Administration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADMIN_MODULES.map((module) => {
              const tileProps: IndexTileProps = {
                icon: module.icon,
                title: module.title,
                description: module.description,
                href: module.href,
              };
              return <IndexTile key={module.href} {...tileProps} />;
            })}
            <ExcelImportTile />
          </div>
        </section>
      )}
    </div>
  );
}
