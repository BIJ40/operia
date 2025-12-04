import { Users, FileText, MessageSquare, Headset, AlertCircle, Building2, LucideIcon } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  description: string;
  isLoading: boolean;
  variant: 1 | 2 | 4 | 7;
}

function StatCard({ title, value, icon: Icon, description, isLoading, variant }: StatCardProps) {
  if (variant === 1) {
    return (
      <div className="group h-full rounded-xl border border-helpconfort-blue/20 p-5
        bg-gradient-to-br from-background to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-background/50 transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-helpconfort-blue">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 2) {
    return (
      <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
        bg-gradient-to-b from-helpconfort-blue/5 to-background
        shadow-sm transition-all duration-300
        hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg border-2 border-helpconfort-blue/25 flex items-center justify-center
            group-hover:border-helpconfort-blue group-hover:bg-background transition-all">
            <Icon className="w-5 h-5 text-helpconfort-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-helpconfort-blue">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 4) {
    return (
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
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-helpconfort-blue">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  // variant === 7
  return (
    <div className="group h-full rounded-xl border border-helpconfort-blue/15 p-5
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
      shadow-sm transition-all duration-300
      hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
          group-hover:border-helpconfort-blue group-hover:bg-white transition-all">
          <Icon className="w-5 h-5 text-helpconfort-blue" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-helpconfort-blue">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

const VARIANT_CYCLE: (1 | 2 | 4 | 7)[] = [1, 2, 4, 7];

export function StatsOverview() {
  const stats = useAdminStats();

  const statCards = [
    { title: 'Utilisateurs', value: stats.totalUsers, icon: Users, description: 'Comptes actifs' },
    { title: 'Contenus', value: stats.totalBlocks, icon: FileText, description: 'Blocs de contenu' },
    { title: 'Documents', value: stats.totalDocuments, icon: MessageSquare, description: 'Documents indexés' },
    { title: 'Tickets', value: stats.totalTickets, icon: Headset, description: 'Total des demandes' },
    { title: 'En attente', value: stats.waitingTickets, icon: AlertCircle, description: 'Tickets non traités' },
    { title: 'Agences', value: stats.agencies, icon: Building2, description: 'Agences configurées' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-foreground">Vue d'ensemble</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            isLoading={stats.isLoading}
            variant={VARIANT_CYCLE[index % VARIANT_CYCLE.length]}
          />
        ))}
      </div>
    </div>
  );
}
