import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Loader2, UserPlus, Mail, Phone, Building2, MessageSquare, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function PendingRegistrationsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['pending-registrations', filter],
    queryFn: async () => {
      let query = supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PendingRegistration[];
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      toast({
        title: variables.status === 'approved' ? 'Demande approuvée' : 'Demande rejetée',
        description: variables.status === 'approved'
          ? "N'oubliez pas de créer le compte utilisateur dans la gestion des utilisateurs."
          : 'La demande a été rejetée.',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const handleReject = () => {
    if (!selectedRegistration) return;
    updateStatus.mutate({
      id: selectedRegistration.id,
      status: 'rejected',
      rejection_reason: rejectionReason.trim() || undefined,
    });
    setRejectDialogOpen(false);
    setRejectionReason('');
    setSelectedRegistration(null);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Demandes d'inscription</h2>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white">{pendingCount} en attente</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>En attente</Button>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Toutes</Button>
        </div>
      </div>

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
                      <p className="text-sm text-red-600">Motif : {reg.rejection_reason}</p>
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
                        onClick={() => updateStatus.mutate({ id: reg.id, status: 'approved' })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => { setSelectedRegistration(reg); setRejectDialogOpen(true); }}
                        disabled={updateStatus.isPending}
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
