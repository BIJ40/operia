/**
 * Page Admin - Statistiques Support
 * Statistiques et métriques du support
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, MessageSquare, Star, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useSupportStats } from '@/hooks/use-support-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/services/supportService';

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(var(--chart-1))',
  in_progress: 'hsl(var(--chart-2))',
  waiting: 'hsl(var(--chart-3))',
  waiting_user: 'hsl(var(--chart-4))',
  resolved: 'hsl(var(--chart-5))',
  closed: 'hsl(var(--muted-foreground))',
};

const PRIORITY_COLORS: Record<string, string> = {
  mineur: 'hsl(var(--muted-foreground))',
  normal: 'hsl(var(--chart-2))',
  important: 'hsl(var(--chart-3))',
  urgent: 'hsl(var(--chart-4))',
  bloquant: 'hsl(var(--destructive))',
};

export default function AdminSupportStats() {
  const stats = useSupportStats();

  const statusData = Object.entries(stats.ticketsByStatus).map(([status, count]) => ({
    name: TICKET_STATUS_LABELS[status] || status,
    value: count,
    fill: STATUS_COLORS[status] || 'hsl(var(--muted-foreground))',
  }));

  const priorityData = Object.entries(stats.ticketsByPriority).map(([priority, count]) => ({
    name: TICKET_PRIORITY_LABELS[priority] || priority,
    value: count,
    fill: PRIORITY_COLORS[priority] || 'hsl(var(--muted-foreground))',
  }));

  const monthTrend = stats.ticketsLastMonth > 0
    ? Math.round(((stats.ticketsThisMonth - stats.ticketsLastMonth) / stats.ticketsLastMonth) * 100)
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Statistiques Support</h1>
        <p className="text-muted-foreground">
          Métriques et indicateurs de performance du support
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets ce mois</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.ticketsThisMonth}</div>
                <p className={`text-xs ${monthTrend >= 0 ? 'text-muted-foreground' : 'text-green-600'}`}>
                  {monthTrend >= 0 ? '+' : ''}{monthTrend}% vs mois dernier
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen résolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.avgResolutionTimeHours}h</div>
                <p className="text-xs text-muted-foreground">
                  Basé sur les tickets résolus
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux résolution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.resolutionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Tickets résolus ou fermés
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.activeAgents}</div>
                <p className="text-xs text-muted-foreground">
                  Agents avec tickets assignés
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Satisfaction & Evolution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Satisfaction client
            </CardTitle>
            <CardDescription>
              Note moyenne des utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                </div>
                <div className="flex flex-col">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(stats.avgRating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalRatings} évaluations
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Évolution mensuelle
            </CardTitle>
            <CardDescription>
              Nombre de tickets créés par mois
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {stats.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyEvolution}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Status & Priority Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Répartition par statut
            </CardTitle>
            <CardDescription>
              Distribution des tickets par statut
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : statusData.length > 0 ? (
              <div className="flex items-center gap-8">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Aucun ticket</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Répartition par priorité
            </CardTitle>
            <CardDescription>
              Distribution des tickets par priorité
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : priorityData.length > 0 ? (
              <div className="flex items-center gap-8">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {priorityData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Aucun ticket</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
