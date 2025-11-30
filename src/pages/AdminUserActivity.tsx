import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp } from 'lucide-react';
import { OnlineUsers } from '@/components/admin/OnlineUsers';
import { ConnectionStats } from '@/components/admin/ConnectionStats';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logError } from '@/lib/logger';

interface ConnectionEvolution {
  date: string;
  connections: number;
  users: number;
  avgDuration: number;
}

interface AgencyActivity {
  agency: string;
  totalConnections: number;
  totalHours: number;
  activeUsers: number;
  [key: string]: string | number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

// Note: Cette page est protégée par RoleGuard minRole="platform_admin" dans App.tsx
// Plus besoin de check isAdmin ici

export default function AdminUserActivity() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [evolutionData, setEvolutionData] = useState<ConnectionEvolution[]>([]);
  const [agencyData, setAgencyData] = useState<AgencyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityData();
  }, [period]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = endOfDay(new Date());

      // Charger les logs de connexion pour la période
      const { data: logs, error: logsError } = await supabase
        .from('user_connection_logs')
        .select('user_id, connected_at, duration_seconds')
        .gte('connected_at', startDate.toISOString())
        .lte('connected_at', endDate.toISOString());

      if (logsError) throw logsError;

      // Charger les profils pour les agences
      const userIds = [...new Set(logs?.map(log => log.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, agence')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculer l'évolution des connexions par jour
      const evolutionMap = new Map<string, { connections: number; users: Set<string>; totalDuration: number }>();
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        evolutionMap.set(date, { connections: 0, users: new Set(), totalDuration: 0 });
      }

      logs?.forEach(log => {
        const date = format(new Date(log.connected_at), 'yyyy-MM-dd');
        const dayData = evolutionMap.get(date);
        if (dayData) {
          dayData.connections += 1;
          dayData.users.add(log.user_id);
          dayData.totalDuration += log.duration_seconds || 0;
        }
      });

      const evolution: ConnectionEvolution[] = Array.from(evolutionMap.entries()).map(([date, data]) => ({
        date: format(new Date(date), 'dd MMM', { locale: fr }),
        connections: data.connections,
        users: data.users.size,
        avgDuration: data.connections > 0 ? Math.round((data.totalDuration / data.connections) / 60) : 0
      }));

      setEvolutionData(evolution);

      // Calculer l'activité par agence
      const agencyMap = new Map<string, { connections: number; totalSeconds: number; users: Set<string> }>();

      logs?.forEach(log => {
        const profile = profilesMap.get(log.user_id);
        const agency = profile?.agence || 'Non spécifiée';
        
        const existing = agencyMap.get(agency) || { connections: 0, totalSeconds: 0, users: new Set() };
        existing.connections += 1;
        existing.totalSeconds += log.duration_seconds || 0;
        existing.users.add(log.user_id);
        agencyMap.set(agency, existing);
      });

      const agencies: AgencyActivity[] = Array.from(agencyMap.entries()).map(([agency, data]) => ({
        agency,
        totalConnections: data.connections,
        totalHours: parseFloat((data.totalSeconds / 3600).toFixed(1)),
        activeUsers: data.users.size
      }));

      agencies.sort((a, b) => b.totalHours - a.totalHours);

      setAgencyData(agencies);
    } catch (error) {
      logError('ADMIN_ACTIVITY', 'Erreur chargement activité utilisateurs', { error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Activité utilisateurs
        </h1>
      </div>

      {/* Utilisateurs connectés */}
      <OnlineUsers />

      {/* Sélecteur de période */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Évolution de l'activité
          </CardTitle>
          <CardDescription>
            Statistiques et graphiques sur {period} jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7' | '30')} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="7">7 derniers jours</TabsTrigger>
              <TabsTrigger value="30">30 derniers jours</TabsTrigger>
            </TabsList>

            <TabsContent value={period} className="space-y-6">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Chargement des données...</p>
              ) : (
                <>
                  {/* Graphique évolution des connexions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Connexions quotidiennes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="connections" 
                          stroke="#0088FE" 
                          strokeWidth={2}
                          name="Connexions" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#00C49F" 
                          strokeWidth={2}
                          name="Utilisateurs uniques" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Graphique durée moyenne */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Durée moyenne des sessions (minutes)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgDuration" fill="#FFBB28" name="Durée moyenne (min)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Activité par agence - Camembert */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Répartition du temps par agence</h3>
                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={agencyData}
                            dataKey="totalHours"
                            nameKey="agency"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label
                          >
                            {agencyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => `${value}h`}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Tableau récapitulatif agences */}
                      <div className="w-full lg:w-1/2 space-y-3">
                        {agencyData.map((agency, index) => (
                          <div 
                            key={agency.agency}
                            className="p-4 rounded-lg border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <div className="flex-1">
                                <p className="font-semibold">{agency.agency}</p>
                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                  <span>{agency.totalHours}h totales</span>
                                  <span>·</span>
                                  <span>{agency.totalConnections} connexions</span>
                                  <span>·</span>
                                  <span>{agency.activeUsers} utilisateurs</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Statistiques de connexion par utilisateur */}
      <ConnectionStats />
    </div>
  );
}
