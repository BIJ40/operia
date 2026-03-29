import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Loader2, UserPlus, Mail, Phone, Building2, MessageSquare, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { AdminViewHeader } from '@/components/admin/shared/AdminViewHeader';

interface PendingRegistration {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  company_name: string | null;
  agency_name: string | null;
  message: string | null;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

const ASSIGNABLE_ROLES: GlobalRole[] = [
  'base_user',
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
];

export default function PendingRegistrationsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<GlobalRole>('franchisee_admin');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['pending-registrations', filter],
    queryFn: async () => {
      let query = supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (filter === 'pending') query = query.eq('status', 'pending');
      const { data, error } = await query;
      if (error) throw error;
      return data as PendingRegistration[];
    },
  });

  const { data: agencies } = useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label, is_active')
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return data as Agency[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { error } = await supabase
        .from('pending_registrations')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: rejection_reason || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const createAccount = useMutation({
    mutationFn: async (reg: PendingRegistration) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: reg.email,
          firstName: reg.first_name,
          lastName: reg.last_name,
          globalRole: selectedRole,
          agence: selectedAgency || undefined,
          role_agence: selectedRole === 'franchisee_admin' ? 'dirigeant' : undefined,
          sendEmail: true,
        },
      });

      if (error) throw new Error(error.message || 'Erreur lors de la création du compte');
      if (data?.error) throw new Error(data.error);

      // Mark as approved
      await updateStatus.mutateAsync({ id: reg.id, status: 'approved' });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      toast({
        title: 'Compte créé',
        description: 'Le compte a été créé et un email a été envoyé à l\'utilisateur.',
      });
      setApproveDialogOpen(false);
      setSelectedRegistration(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Erreur de création', description: err.message, variant: 'destructive' });
    },
  });

  const handleOpenApprove = (reg: PendingRegistration) => {
    setSelectedRegistration(reg);
    setSelectedRole('franchisee_admin');
    // Pre-select agency if the registration mentions one
    if (reg.agency_name && agencies) {
      const match = agencies.find(a =>
        a.label.toLowerCase().includes(reg.agency_name!.toLowerCase()) ||
        a.slug.toLowerCase().includes(reg.agency_name!.toLowerCase())
      );
      setSelectedAgency(match?.slug || '');
    } else {
      setSelectedAgency('');
    }
    setApproveDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRegistration) return;
    createAccount.mutate(selectedRegistration);
  };

  const handleReject = () => {
    if (!selectedRegistration) return;
    updateStatus.mutate(
      { id: selectedRegistration.id, status: 'rejected', rejection_reason: rejectionReason.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Demande rejetée' });
          setRejectDialogOpen(false);
          setRejectionReason('');
          setSelectedRegistration(null);
        },
      }
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300"><Clock className="w-3 h-3" />En attente</Badge>;
      case 'approved': return <Badge variant="outline" className="gap-1 text-green-600 border-green-300"><CheckCircle2 className="w-3 h-3" />Approuvée</Badge>;
      case 'rejected': return <Badge variant="outline" className="gap-1 text-red-600 border-red-300"><XCircle className="w-3 h-3" />Rejetée</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = registrations?.filter(r => r.status === 'pending').length ?? 0;
  const needsAgency = ['franchisee_admin', 'franchisee_user'].includes(selectedRole);

  return (
    <div className="space-y-6">
      <AdminViewHeader
        title="Demandes d'inscription"
        subtitle="Validation des nouvelles demandes d'accès au réseau."
        badge={pendingCount > 0 ? `${pendingCount} en attente` : undefined}
      >
        <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>En attente</Button>
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Toutes</Button>
      </AdminViewHeader>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !registrations?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{filter === 'pending' ? 'Aucune demande en attente.' : 'Aucune demande d\'inscription.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {registrations.map(reg => (
            <Card key={reg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-base">
                        {reg.first_name} {reg.last_name}
                      </span>
                      {statusBadge(reg.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{reg.email}</span>
                      {reg.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{reg.phone}</span>}
                      {reg.company_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{reg.company_name}</span>}
                      {reg.agency_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Agence : {reg.agency_name}</span>}
                    </div>
                    {reg.message && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {reg.message}
                      </p>
                    )}
                    {reg.rejection_reason && (
                      <p className="text-sm text-destructive">Motif : {reg.rejection_reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Demandé le {format(new Date(reg.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {reg.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleOpenApprove(reg)}
                        disabled={createAccount.isPending || updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => { setSelectedRegistration(reg); setRejectDialogOpen(true); }}
                        disabled={createAccount.isPending || updateStatus.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer le compte</DialogTitle>
            <DialogDescription>
              Création du compte pour <strong>{selectedRegistration?.first_name} {selectedRegistration?.last_name}</strong> ({selectedRegistration?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rôle système</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as GlobalRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {VISIBLE_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsAgency && (
              <div className="space-y-2">
                <Label>Agence</Label>
                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une agence" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies?.map(a => (
                      <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRegistration?.agency_name && (
                  <p className="text-xs text-muted-foreground">
                    L'utilisateur a indiqué : « {selectedRegistration.agency_name} »
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleApprove}
              disabled={createAccount.isPending || (needsAgency && !selectedAgency)}
              className="gap-2"
            >
              {createAccount.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Création…</>
              ) : (
                <><UserPlus className="w-4 h-4" />Créer le compte</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Rejet de la demande de {selectedRegistration?.first_name} {selectedRegistration?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Motif du rejet (optionnel)..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
