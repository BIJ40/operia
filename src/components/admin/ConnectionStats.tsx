import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/logger';
import { Clock, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStats {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  total_connections: number;
  total_hours: number;
  avg_duration_minutes: number;
  last_connection: string | null;
}

interface ConnectionStatsProps {
  userId?: string;
}

export function ConnectionStats({ userId }: ConnectionStatsProps) {
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Récupérer tous les logs de connexion
      let query = supabase
        .from('user_connection_logs')
        .select('user_id, duration_seconds, connected_at');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: logs, error: logsError } = await query;
      if (logsError) throw logsError;

      if (!logs || logs.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Grouper les stats par utilisateur
      const userStatsMap = new Map<string, {
        total_connections: number;
        total_seconds: number;
        last_connection: string | null;
      }>();

      logs.forEach(log => {
        const existing = userStatsMap.get(log.user_id) || {
          total_connections: 0,
          total_seconds: 0,
          last_connection: null
        };

        existing.total_connections += 1;
        existing.total_seconds += log.duration_seconds || 0;
        
        if (!existing.last_connection || log.connected_at > existing.last_connection) {
          existing.last_connection = log.connected_at;
        }

        userStatsMap.set(log.user_id, existing);
      });

      // Récupérer les profils utilisateurs
      const userIds = Array.from(userStatsMap.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combiner les stats avec les profils
      const enrichedStats: UserStats[] = (profiles || [])
        .filter(profile => {
          // Exclure les utilisateurs sans nom ni email
          const hasName = profile.first_name || profile.last_name;
          const hasEmail = profile.email;
          return hasName || hasEmail;
        })
        .map(profile => {
          const userStats = userStatsMap.get(profile.id)!;
          return {
            user_id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            total_connections: userStats.total_connections,
            total_hours: userStats.total_seconds / 3600,
            avg_duration_minutes: userStats.total_connections > 0 
              ? (userStats.total_seconds / userStats.total_connections) / 60 
              : 0,
            last_connection: userStats.last_connection
          };
        });

      // Trier par nombre total d'heures décroissant
      enrichedStats.sort((a, b) => b.total_hours - a.total_hours);

      setStats(enrichedStats);
    } catch (error) {
      logError('CONNECTION_STATS', 'Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (stat: UserStats) => {
    const name = [stat.first_name, stat.last_name]
      .filter(Boolean)
      .join(' ');
    return name || stat.email || 'Utilisateur inconnu';
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    return `${hours.toFixed(1)} h`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Chargement des statistiques...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Statistiques de connexion
        </CardTitle>
        <CardDescription>
          Temps de connexion et activité des utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.length > 0 ? (
          <div className="space-y-4">
            {stats.map((stat) => (
              <div 
                key={stat.user_id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{getDisplayName(stat)}</p>
                    {stat.last_connection && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernière connexion: {format(new Date(stat.last_connection), 'PPP à HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Temps total</p>
                      <p className="text-sm font-bold">{formatHours(stat.total_hours)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Durée moyenne</p>
                      <p className="text-sm font-bold">{Math.round(stat.avg_duration_minutes)} min</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Connexions</p>
                      <p className="text-sm font-bold">{stat.total_connections}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Aucune statistique disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
