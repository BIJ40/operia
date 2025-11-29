import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  MessageSquare, 
  Headset, 
  Building2, 
  UserCog,
  FileStack,
  TrendingUp,
  HardDrive
} from 'lucide-react';

export function NavigationCards() {
  const sections = [
    {
      title: 'Gestion des utilisateurs',
      cards: [
        {
          to: '/admin/users',
          icon: Users,
          title: 'Utilisateurs',
          description: 'Créer et gérer les comptes',
        },
        {
          to: '/admin/users-list',
          icon: UserCog,
          title: 'Liste des utilisateurs',
          description: 'Voir tous les utilisateurs',
        },
        {
          to: '/admin/role-permissions',
          icon: Shield,
          title: 'Permissions',
          description: 'Gérer les accès par rôle',
        },
        {
          to: '/admin/agencies',
          icon: Building2,
          title: 'Agences',
          description: 'Configurer les agences',
        },
      ],
    },
    {
      title: 'Support & Communication',
      cards: [
        {
          to: '/admin/support',
          icon: Headset,
          title: 'Support',
          description: 'Gérer les tickets',
        },
        {
          to: '/admin/escalation-history',
          icon: FileStack,
          title: 'Historique des escalades',
          description: 'Voir toutes les escalades',
        },
        {
          to: '/admin/documents',
          icon: MessageSquare,
          title: 'Documents & Questions',
          description: 'Enrichir Mme MICHU',
        },
      ],
    },
    {
      title: 'Système',
      cards: [
        {
          to: '/admin/storage-quota',
          icon: HardDrive,
          title: 'Stockage',
          description: 'Surveiller les quotas',
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
