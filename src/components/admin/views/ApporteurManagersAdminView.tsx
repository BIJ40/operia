/**
 * ApporteurManagersAdminView - Vue admin des gestionnaires apporteurs (système OTP)
 * Affiche tous les gestionnaires apporteurs avec leurs infos, statut et apporteur lié.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Users, Mail, Calendar, Building2, Shield, ShieldCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ManagerWithApporteur {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  apporteur_id: string;
  agency_id: string;
  apporteurs: { name: string } | null;
  apogee_agencies: { label: string } | null;
}

function useAllApporteurManagers() {
  return useQuery({
    queryKey: ['admin-apporteur-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apporteur_managers')
        .select(`
          id, email, first_name, last_name, role, is_active,
          last_login_at, created_at, apporteur_id, agency_id,
          apporteurs!apporteur_managers_apporteur_id_fkey ( name ),
          apogee_agencies!apporteur_managers_agency_id_fkey ( label )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ManagerWithApporteur[];
    },
  });
}

export default function ApporteurManagersAdminView() {
  const { data: managers = [], isLoading } = useAllApporteurManagers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = managers;

    if (statusFilter === 'active') result = result.filter(m => m.is_active);
    if (statusFilter === 'inactive') result = result.filter(m => !m.is_active);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.email.toLowerCase().includes(q) ||
        (m.first_name || '').toLowerCase().includes(q) ||
        (m.last_name || '').toLowerCase().includes(q) ||
        (m.apporteurs?.name || '').toLowerCase().includes(q) ||
        (m.apogee_agencies?.label || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [managers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: managers.length,
    active: managers.filter(m => m.is_active).length,
    withLogin: managers.filter(m => m.last_login_at).length,
  }), [managers]);

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
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total gestionnaires</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withLogin}</p>
              <p className="text-xs text-muted-foreground">Se sont connectés</p>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Gestionnaires portail apporteur ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gestionnaire</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Apporteur</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Aucun gestionnaire apporteur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.first_name} {m.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{m.apporteurs?.name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.apogee_agencies?.label || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.role === 'manager' ? (
                          <><ShieldCheck className="h-3 w-3 mr-1" />Gestionnaire</>
                        ) : (
                          <><Shield className="h-3 w-3 mr-1" />Lecteur</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-xs">
                        {m.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.last_login_at
                        ? format(new Date(m.last_login_at), 'dd/MM/yy HH:mm', { locale: fr })
                        : <span className="italic">Jamais</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.created_at), 'dd/MM/yy', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
