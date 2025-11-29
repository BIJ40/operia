import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Headset, 
  Building2, 
  UsersRound,
  FileStack,
  TrendingUp,
  HardDrive,
  Database,
  BarChart3,
  FolderOpen,
  Settings
} from 'lucide-react';
import { ROUTES } from '@/config/routes';

export function NavigationCards() {
  const sections = [
    {
      title: 'Gestion des utilisateurs',
      cards: [
        {
          to: ROUTES.admin.users,
          icon: Users,
          title: 'Utilisateurs',
          description: 'Créer et gérer les comptes',
        },
        {
          to: ROUTES.admin.collaborateurs,
          icon: UsersRound,
          title: 'Collaborateurs',
          description: 'Collaborateurs non inscrits',
        },
        {
          to: ROUTES.admin.agencies,
          icon: Building2,
          title: 'Agences',
          description: 'Configurer les agences',
        },
        {
          to: ROUTES.admin.userActivity,
          icon: TrendingUp,
          title: 'Activité',
          description: 'Suivi des connexions',
        },
      ],
    },
    {
      title: 'Support & Communication',
      cards: [
        {
          to: ROUTES.admin.supportStats,
          icon: BarChart3,
          title: 'Statistiques Support',
          description: 'Métriques et indicateurs',
        },
        {
          to: ROUTES.support.console,
          icon: Headset,
          title: 'Console Support',
          description: 'Gérer les tickets',
        },
        {
          to: ROUTES.admin.escalationHistory,
          icon: FileStack,
          title: 'Historique Escalades',
          description: 'Voir toutes les escalades',
        },
        {
          to: ROUTES.admin.documents,
          icon: FolderOpen,
          title: 'Documents RAG',
          description: 'Base documentaire Mme MICHU',
        },
      ],
    },
    {
      title: 'Système',
      cards: [
        {
          to: ROUTES.admin.backup,
          icon: Database,
          title: 'Sauvegardes',
          description: 'Export et import données',
        },
        {
          to: ROUTES.admin.cacheBackup,
          icon: FileStack,
          title: 'Cache Backup',
          description: 'Gestion du cache',
        },
        {
          to: ROUTES.admin.storageQuota,
          icon: HardDrive,
          title: 'Stockage',
          description: 'Surveiller les quotas',
        },
        {
          to: ROUTES.admin.pageMetadata,
          icon: Settings,
          title: 'Métadonnées',
          description: 'Titres et labels des pages',
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {section.cards.map((card) => (
              <Link key={card.to} to={card.to}>
                <Card className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-l-4 border-l-accent rounded-2xl h-full bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <card.icon className="w-5 h-5 text-primary" />
                      <span className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                        {card.title}
                      </span>
                    </CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
