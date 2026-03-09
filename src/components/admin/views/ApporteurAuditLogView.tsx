/**
 * ApporteurAuditLogView — Historique des connexions et actions des apporteurs
 * Affiche les sessions (connexions OTP) et les logs d'accès, filtrable par agence.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, LogIn, Activity, Building2, Globe, Monitor, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  manager_id: string;
  apporteur_managers: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    agency_id: string;
    apporteurs: { name: string } | null;
    apogee_agencies: { label: string } | null;
  } | null;
}

interface AccessLogRow {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  agency_id: string;
  apporteur_user_id: string;
  apogee_agencies: { label: string } | null;
  apporteur_users: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    apporteurs: { name: string } | null;
  } | null;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useApporteurSessions() {
  return useQuery({
    queryKey: ['admin-apporteur-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apporteur_sessions')
        .select(`
          id, created_at, expires_at, revoked_at, user_agent, manager_id,
          apporteur_managers!apporteur_sessions_manager_id_fkey (
            email, first_name, last_name, agency_id,
            apporteurs!apporteur_managers_apporteur_id_fkey ( name ),
            apogee_agencies!apporteur_managers_agency_id_fkey ( label )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as unknown as SessionRow[];
    },
  });
}

function useApporteurAccessLogs() {
  return useQuery({
    queryKey: ['admin-apporteur-access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apporteur_access_logs')
        .select(`
          id, action, resource_type, resource_id, metadata, created_at, agency_id, apporteur_user_id,
          apogee_agencies!apporteur_access_logs_agency_id_fkey ( label ),
          apporteur_users!apporteur_access_logs_apporteur_user_id_fkey (
            email, first_name, last_name,
            apporteurs!apporteur_users_apporteur_id_fkey ( name )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as unknown as AccessLogRow[];
    },
  });
}

function useAgenciesList() {
  return useQuery({
    queryKey: ['admin-agencies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, label')
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── Action labels ───────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  view_dossier: 'Consultation dossier',
  view_devis: 'Consultation devis',
  view_facture: 'Consultation facture',
  download_document: 'Téléchargement document',
  create_request: 'Création demande',
  validate_devis: 'Validation devis',
  refuse_devis: 'Refus devis',
  login: 'Connexion',
  logout: 'Déconnexion',
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseUserAgent(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'Mobile';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Navigateur';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApporteurAuditLogView() {
  const [subTab, setSubTab] = useState<'sessions' | 'actions'>('sessions');
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');

  const { data: sessions = [], isLoading: loadingSessions } = useApporteurSessions();
  const { data: accessLogs = [], isLoading: loadingLogs } = useApporteurAccessLogs();
  const { data: agencies = [] } = useAgenciesList();

  // ─── Filtered sessions ────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (agencyFilter !== 'all') {
      result = result.filter(s => s.apporteur_managers?.agency_id === agencyFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => {
        const mgr = s.apporteur_managers;
        return (
          (mgr?.email || '').toLowerCase().includes(q) ||
          (mgr?.first_name || '').toLowerCase().includes(q) ||
          (mgr?.last_name || '').toLowerCase().includes(q) ||
          (mgr?.apporteurs?.name || '').toLowerCase().includes(q) ||
          (mgr?.apogee_agencies?.label || '').toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [sessions, agencyFilter, search]);

  // ─── Filtered access logs ─────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = accessLogs;

    if (agencyFilter !== 'all') {
      result = result.filter(l => l.agency_id === agencyFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const usr = l.apporteur_users;
        return (
          l.action.toLowerCase().includes(q) ||
          l.resource_type.toLowerCase().includes(q) ||
          (usr?.email || '').toLowerCase().includes(q) ||
          (usr?.first_name || '').toLowerCase().includes(q) ||
          (usr?.last_name || '').toLowerCase().includes(q) ||
          (usr?.apporteurs?.name || '').toLowerCase().includes(q) ||
          (l.apogee_agencies?.label || '').toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [accessLogs, agencyFilter, search]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => !s.revoked_at && new Date(s.expires_at) > new Date()).length,
    totalActions: accessLogs.length,
  }), [sessions, accessLogs]);

  const isLoading = loadingSessions || loadingLogs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LogIn className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
              <p className="text-xs text-muted-foreground">Connexions totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--ap-success))]/10">
              <Globe className="h-5 w-5 text-[hsl(var(--ap-success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeSessions}</p>
              <p className="text-xs text-muted-foreground">Sessions actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalActions}</p>
              <p className="text-xs text-muted-foreground">Actions enregistrées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, apporteur, agence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger className="w-48">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Toutes les agences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencies.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'sessions' | 'actions')}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <LogIn className="w-4 h-4" />
            Connexions ({filteredSessions.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5">
            <Activity className="w-4 h-4" />
            Actions ({filteredLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Sessions Table */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historique des connexions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Gestionnaire</TableHead>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>Agence</TableHead>
                    <TableHead>Navigateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        Aucune session trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((s) => {
                      const mgr = s.apporteur_managers;
                      const isActive = !s.revoked_at && new Date(s.expires_at) > new Date();
                      const isRevoked = !!s.revoked_at;

                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">
                                {mgr?.first_name} {mgr?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{mgr?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {mgr?.apporteurs?.name || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {mgr?.apogee_agencies?.label || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Monitor className="w-3.5 h-3.5" />
                              {parseUserAgent(s.user_agent)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isRevoked ? (
                              <Badge variant="destructive" className="text-xs">Révoquée</Badge>
                            ) : isActive ? (
                              <Badge className="text-xs bg-[hsl(var(--ap-success))] text-white">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Expirée</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(s.expires_at), 'dd/MM/yy HH:mm', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Logs Table */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions effectuées</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>Agence</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Ressource</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        Aucune action enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((l) => {
                      const usr = l.apporteur_users;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {format(new Date(l.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">
                                {usr?.first_name} {usr?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{usr?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {usr?.apporteurs?.name || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {l.apogee_agencies?.label || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getActionLabel(l.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {l.resource_type}
                            {l.resource_id ? ` #${l.resource_id.slice(0, 8)}` : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
