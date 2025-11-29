import { Link } from 'react-router-dom';
import { 
  Users, 
  Headset, 
  Building2, 
  UsersRound,
  FileStack,
  TrendingUp,
  HardDrive,
  Database,
  BarChart3,
  FolderOpen,
  Settings,
  LucideIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';

interface AdminTileProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  variant: 1 | 2 | 4 | 7;
}

function AdminTile({ to, icon: Icon, title, description, variant }: AdminTileProps) {
  if (variant === 1) {
    return (
      <Link to={to}>
        <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
          bg-gradient-to-br from-white to-helpconfort-blue/5
          shadow-sm transition-all duration-300
          hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white/50 transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 2) {
    return (
      <Link to={to}>
        <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
          bg-gradient-to-b from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/25 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 4) {
    return (
      <Link to={to}>
        <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
          border-l-4 border-l-helpconfort-blue/40
          bg-gradient-to-r from-helpconfort-blue/5 to-white
          shadow-sm transition-all duration-300
          hover:from-helpconfort-blue/15 hover:border-l-helpconfort-blue hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // variant === 7
  return (
    <Link to={to}>
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
              group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
              <Icon className="w-5 h-5 text-helpconfort-blue" />
            </div>
          </div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

const VARIANT_CYCLE: (1 | 2 | 4 | 7)[] = [1, 2, 4, 7];

export function NavigationCards() {
  const sections = [
    {
      title: 'Gestion des utilisateurs',
      cards: [
        { to: ROUTES.admin.users, icon: Users, title: 'Utilisateurs', description: 'Créer et gérer les comptes' },
        { to: ROUTES.admin.collaborateurs, icon: UsersRound, title: 'Collaborateurs', description: 'Collaborateurs non inscrits' },
        { to: ROUTES.admin.agencies, icon: Building2, title: 'Agences', description: 'Configurer les agences' },
        { to: ROUTES.admin.userActivity, icon: TrendingUp, title: 'Activité', description: 'Suivi des connexions' },
      ],
    },
    {
      title: 'Support & Communication',
      cards: [
        { to: ROUTES.admin.supportStats, icon: BarChart3, title: 'Statistiques Support', description: 'Métriques et indicateurs' },
        { to: ROUTES.support.console, icon: Headset, title: 'Console Support', description: 'Gérer les tickets' },
        { to: ROUTES.admin.escalationHistory, icon: FileStack, title: 'Historique Escalades', description: 'Voir toutes les escalades' },
        { to: ROUTES.admin.documents, icon: FolderOpen, title: 'Documents RAG', description: 'Base documentaire Mme MICHU' },
      ],
    },
    {
      title: 'Système',
      cards: [
        { to: ROUTES.admin.backup, icon: Database, title: 'Sauvegardes', description: 'Export et import données' },
        { to: ROUTES.admin.cacheBackup, icon: FileStack, title: 'Cache Backup', description: 'Gestion du cache' },
        { to: ROUTES.admin.storageQuota, icon: HardDrive, title: 'Stockage', description: 'Surveiller les quotas' },
        { to: ROUTES.admin.pageMetadata, icon: Settings, title: 'Métadonnées', description: 'Titres et labels des pages' },
      ],
    },
  ];

  let globalIndex = 0;

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.cards.map((card) => {
              const variant = VARIANT_CYCLE[globalIndex % VARIANT_CYCLE.length];
              globalIndex++;
              return (
                <AdminTile
                  key={card.to}
                  to={card.to}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                  variant={variant}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
