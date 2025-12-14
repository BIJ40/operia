import { Users, FileText, MessageSquare, Headset, AlertCircle, Building2, LucideIcon } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  isLoading: boolean;
}

function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-helpconfort-blue/20 bg-gradient-to-r from-background to-helpconfort-blue/5">
      <Icon className="w-4 h-4 text-helpconfort-blue shrink-0" />
      <span className="text-xs text-muted-foreground">{title}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span className="text-sm font-bold text-helpconfort-blue">{value}</span>
      )}
    </div>
  );
}

const STAT_CARDS = [
  { title: 'Utilisateurs', key: 'totalUsers' as const, icon: Users },
  { title: 'Contenus', key: 'totalBlocks' as const, icon: FileText },
  { title: 'Documents', key: 'totalDocuments' as const, icon: MessageSquare },
  { title: 'Tickets', key: 'totalTickets' as const, icon: Headset },
  { title: 'En attente', key: 'waitingTickets' as const, icon: AlertCircle },
  { title: 'Agences', key: 'agencies' as const, icon: Building2 },
];

export function StatsOverview() {
  const stats = useAdminStats();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 text-foreground">Vue d'ensemble</h2>
      <div className="flex flex-wrap gap-2">
        {STAT_CARDS.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stats[stat.key]}
            icon={stat.icon}
            isLoading={stats.isLoading}
          />
        ))}
      </div>
    </div>
  );
}
