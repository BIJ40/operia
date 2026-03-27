/**
 * SuiviClientsAdminView - Écran de contrôle admin pour le module Suivi Client (origin-box)
 * 3 sections : Agences, Paiements, Journal d'envois
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, MessageSquare, Loader2, Pencil, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// ==================== SECTION AGENCES ====================

function AgencesSection() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  const { data: agencies, isLoading } = useQuery({
    queryKey: ['admin-suivi-agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_suivi_settings')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, any> }) => {
      const { error } = await supabase
        .from('agency_suivi_settings')
        .update(values)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suivi-agencies'] });
      setEditingId(null);
      toast.success('Agence mise à jour');
    },
    onError: (err: any) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const startEdit = (agency: any) => {
    setEditingId(agency.id);
    setEditValues({
      name: agency.name,
      slug: agency.slug,
      contact_email: agency.contact_email,
      api_subdomain: agency.api_subdomain,
      stripe_enabled: agency.stripe_enabled,
      google_reviews_url: agency.google_reviews_url || '',
      is_active: agency.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, values: editValues });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Paramétrage des agences ayant le module Suivi Client activé.</p>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Email contact</TableHead>
              <TableHead>API subdomain</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead>Google Reviews</TableHead>
              <TableHead>SMS</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies?.map((a) => (
              <TableRow key={a.id}>
                {editingId === a.id ? (
                  <>
                    <TableCell><Input value={editValues.name} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className="h-8 text-sm" /></TableCell>
                    <TableCell><Input value={editValues.slug} onChange={e => setEditValues(v => ({ ...v, slug: e.target.value }))} className="h-8 text-sm" /></TableCell>
                    <TableCell><Input value={editValues.contact_email} onChange={e => setEditValues(v => ({ ...v, contact_email: e.target.value }))} className="h-8 text-sm" /></TableCell>
                    <TableCell><Input value={editValues.api_subdomain} onChange={e => setEditValues(v => ({ ...v, api_subdomain: e.target.value }))} className="h-8 text-sm" /></TableCell>
                    <TableCell>
                      <Select value={editValues.stripe_enabled ? 'true' : 'false'} onValueChange={v => setEditValues(prev => ({ ...prev, stripe_enabled: v === 'true' }))}>
                        <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="true">Oui</SelectItem><SelectItem value="false">Non</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={editValues.google_reviews_url} onChange={e => setEditValues(v => ({ ...v, google_reviews_url: e.target.value }))} className="h-8 text-sm" /></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                    <TableCell>
                      <Select value={editValues.is_active ? 'true' : 'false'} onValueChange={v => setEditValues(prev => ({ ...prev, is_active: v === 'true' }))}>
                        <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="true">Actif</SelectItem><SelectItem value="false">Inactif</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.slug}</code></TableCell>
                    <TableCell className="text-sm">{a.contact_email}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.api_subdomain}</code></TableCell>
                    <TableCell><Badge variant={a.stripe_enabled ? 'default' : 'secondary'} className="text-xs">{a.stripe_enabled ? 'Oui' : 'Non'}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{a.google_reviews_url || '—'}</TableCell>
                    <TableCell>{a.allmysms_login ? <Badge variant="outline" className="text-xs">Configuré</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant={a.is_active ? 'default' : 'destructive'} className="text-xs">{a.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ==================== SECTION PAIEMENTS ====================

function PaiementsSection() {
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-suivi-payments', filterAgency, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from('payments_clients_suivi_with_client')
        .select('*', { count: 'exact' })
        .order('paid_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAgency !== 'all') {
        query = query.eq('agency_slug', filterAgency);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });

  const { data: agencySlugs } = useQuery({
    queryKey: ['admin-suivi-payment-slugs'],
    queryFn: async () => {
      const { data } = await supabase.from('agency_suivi_settings').select('slug').order('slug');
      return data?.map(a => a.slug) ?? [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterAgency} onValueChange={v => { setFilterAgency(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par agence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencySlugs?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} paiement(s)</span>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf. dossier</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date paiement</TableHead>
              <TableHead>Agence</TableHead>
              <TableHead>Session Stripe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows?.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.ref_dossier}</TableCell>
                <TableCell className="text-sm font-medium">{p.client_name || '—'}</TableCell>
                <TableCell>{p.amount_cents != null ? `${(p.amount_cents / 100).toFixed(2)} €` : '—'}</TableCell>
                <TableCell className="text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.agency_slug}</code></TableCell>
                <TableCell className="text-xs max-w-[150px] truncate font-mono">{p.stripe_session_id || '—'}</TableCell>
              </TableRow>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun paiement trouvé</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}

// ==================== SECTION JOURNAL D'ENVOIS ====================

function JournalSection() {
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-suivi-sms-log', filterAgency, filterStatus, page],
    queryFn: async () => {
      let query = supabase
        .from('sms_sent_log')
        .select('*', { count: 'exact' })
        .order('sent_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAgency !== 'all') query = query.eq('agency_slug', filterAgency);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });

  const { data: agencySlugs } = useQuery({
    queryKey: ['admin-suivi-sms-slugs'],
    queryFn: async () => {
      const { data } = await supabase.from('agency_suivi_settings').select('slug').order('slug');
      return data?.map(a => a.slug) ?? [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const statusColor = (s: string) => {
    if (s === 'sent') return 'default';
    if (s === 'error') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterAgency} onValueChange={v => { setFilterAgency(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Agence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencySlugs?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
            <SelectItem value="no_phone">Pas de tél.</SelectItem>
            <SelectItem value="no_email">Pas d'email</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} entrée(s)</span>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
             <TableRow>
              <TableHead>Réf. dossier</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Destinataire</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date envoi</TableHead>
              <TableHead>Erreur</TableHead>
              <TableHead>Agence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows?.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.ref_dossier}</TableCell>
                <TableCell className="text-sm font-medium">{r.client_name || '—'}</TableCell>
                <TableCell className="text-sm">{r.phone_number}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.trigger_type}</Badge></TableCell>
                <TableCell><Badge variant={statusColor(r.status)} className="text-xs">{r.status}</Badge></TableCell>
                <TableCell className="text-sm">{r.sent_at ? new Date(r.sent_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate text-destructive">{r.error_message || ''}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.agency_slug}</code></TableCell>
              </TableRow>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune entrée trouvée</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}

// ==================== COMPOSANT PRINCIPAL ====================

export default function SuiviClientsAdminView() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Suivi Clients — Module Origin-Box</h3>
        <p className="text-sm text-muted-foreground">Paramétrage, paiements et journal d'envois du portail client externe.</p>
      </div>

      <Tabs defaultValue="agences" className="w-full">
        <TabsList>
          <TabsTrigger value="agences" className="gap-1.5"><Building2 className="h-4 w-4" />Agences</TabsTrigger>
          <TabsTrigger value="paiements" className="gap-1.5"><CreditCard className="h-4 w-4" />Paiements</TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5"><MessageSquare className="h-4 w-4" />Journal d'envois</TabsTrigger>
        </TabsList>

        <TabsContent value="agences" className="mt-4"><AgencesSection /></TabsContent>
        <TabsContent value="paiements" className="mt-4"><PaiementsSection /></TabsContent>
        <TabsContent value="journal" className="mt-4"><JournalSection /></TabsContent>
      </Tabs>
    </div>
  );
}
