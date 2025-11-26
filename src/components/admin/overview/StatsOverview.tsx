import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare, Headset, AlertCircle, Building2 } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsOverview() {
  const stats = useAdminStats();

  const statCards = [
    {
      title: 'Utilisateurs',
      value: stats.totalUsers,
      icon: Users,
      description: 'Comptes actifs',
      color: 'text-blue-500',
    },
    {
      title: 'Contenus',
      value: stats.totalBlocks,
      icon: FileText,
      description: 'Blocs de contenu',
      color: 'text-green-500',
    },
    {
      title: 'Documents',
      value: stats.totalDocuments,
      icon: MessageSquare,
      description: 'Documents indexés',
      color: 'text-purple-500',
    },
    {
      title: 'Tickets',
      value: stats.totalTickets,
      icon: Headset,
      description: 'Total des demandes',
      color: 'text-orange-500',
    },
    {
      title: 'En attente',
      value: stats.waitingTickets,
      icon: AlertCircle,
      description: 'Tickets non traités',
      color: 'text-red-500',
    },
    {
      title: 'Agences',
      value: stats.agencies,
      icon: Building2,
      description: 'Agences configurées',
      color: 'text-cyan-500',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
        Vue d'ensemble
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-accent rounded-2xl bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  {stat.value}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
