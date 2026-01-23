/**
 * Page Admin - Statistiques Support
 * Statistiques et métriques du support (V2 sans SLA)
 */

import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, MessageSquare, Star, TrendingUp, Users, CheckCircle, AlertCircle, Sparkles, Brain, FileQuestion, Edit } from 'lucide-react';
import { useSupportStats } from '@/hooks/use-support-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';

// Labels locaux (ex-supportService)
const TICKET_STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  waiting_user: 'Attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const TICKET_PRIORITY_LABELS: Record<string, string> = {
  mineur: 'Mineur',
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
  bloquant: 'Bloquant',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(var(--chart-1))',
  in_progress: 'hsl(var(--chart-2))',
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

const TILE_BASE = "group relative rounded-xl border border-helpconfort-blue/15 p-4 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5";

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
        <div className={TILE_BASE}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Tickets ce mois</span>
            <MessageSquare className="h-4 w-4 text-helpconfort-blue" />
          </div>
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
        </div>

        <div className={TILE_BASE.replace('top_left', 'top_right')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Temps moyen résolution</span>
            <Clock className="h-4 w-4 text-helpconfort-blue" />
          </div>
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
        </div>

        <div className={TILE_BASE.replace('top_left', 'bottom_left')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Taux résolution</span>
            <TrendingUp className="h-4 w-4 text-helpconfort-blue" />
          </div>
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
        </div>

        <div className={TILE_BASE.replace('top_left', 'bottom_right')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Agents actifs</span>
            <Users className="h-4 w-4 text-helpconfort-blue" />
          </div>
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
        </div>
      </div>

      {/* Second Row - Satisfaction & Evolution */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={TILE_BASE}>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Satisfaction client</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Note moyenne des utilisateurs</p>
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
        </div>

        <div className={TILE_BASE.replace('top_left', 'top_right')}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-semibold">Évolution mensuelle</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Nombre de tickets créés par mois</p>
          <div className="h-[200px]">
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
          </div>
        </div>
      </div>

      {/* Third Row - Status & Priority Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={TILE_BASE.replace('top_left', 'bottom_left')}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-semibold">Répartition par statut</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Distribution des tickets par statut</p>
          {stats.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-[160px] w-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate max-w-[80px]">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucun ticket</p>
          )}
        </div>

        <div className={TILE_BASE.replace('top_left', 'bottom_right')}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-semibold">Répartition par priorité</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Distribution des tickets par priorité</p>
          {stats.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : priorityData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-[160px] w-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5">
                {priorityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate max-w-[80px]">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucun ticket</p>
          )}
        </div>
      </div>

      {/* Fourth Row - AI Classification Stats (P3#2) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className={TILE_BASE}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Auto-classifiés IA</span>
            <Sparkles className="h-4 w-4 text-helpconfort-blue" />
          </div>
          {stats.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats.autoClassifiedRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.autoClassifiedCount} tickets classifiés
              </p>
            </>
          )}
        </div>

        <div className={TILE_BASE.replace('top_left', 'top_right')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Confiance IA moyenne</span>
            <Brain className="h-4 w-4 text-helpconfort-blue" />
          </div>
          {stats.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${
                stats.avgAIConfidence >= 70 ? 'text-green-600' :
                stats.avgAIConfidence >= 40 ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {stats.avgAIConfidence}%
              </div>
              <p className="text-xs text-muted-foreground">
                Score de confiance moyen
              </p>
            </>
          )}
        </div>

        <div className={TILE_BASE.replace('top_left', 'bottom_left')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Tickets incomplets</span>
            <FileQuestion className="h-4 w-4 text-helpconfort-blue" />
          </div>
          {stats.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${
                stats.incompleteRate > 20 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {stats.incompleteCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.incompleteRate}% des tickets
              </p>
            </>
          )}
        </div>

        <div className={TILE_BASE.replace('top_left', 'bottom_right')}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">Corrections IA</span>
            <Edit className="h-4 w-4 text-helpconfort-blue" />
          </div>
          {stats.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${
                stats.aiCorrectionRate > 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {stats.aiCorrectionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Taux de correction manuelle
              </p>
            </>
          )}
        </div>
      </div>

      {/* AI Category Distribution */}
      {Object.keys(stats.ticketsByAICategory).length > 0 && (
        <div className={TILE_BASE}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-helpconfort-blue" />
            <span className="font-semibold">Catégories IA détectées</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Distribution des catégories auto-classifiées</p>
          {stats.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.ticketsByAICategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 bg-helpconfort-blue/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
