/**
 * Panel pour voir et gérer les demandes de création d'utilisateur
 * - N3+ voit ses propres demandes et leur statut
 * - Admin peut approuver/rejeter les demandes
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCreationRequests, type UserCreationRequest } from '@/hooks/use-user-creation-requests';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal, 
  Eye, 
  Check, 
  X, 
  Trash2,
  Loader2,
  UserPlus,
  Building2,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-amber-500', icon: Clock },
  approved: { label: 'Approuvée', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Rejetée', color: 'bg-red-500', icon: XCircle },
};

export function UserCreationRequestsPanel() {
  const { isAdmin, user } = useAuth();
  const { 
    requests, 
    isLoading, 
    pendingRequests,
    approveRequest, 
    isApproving,
    rejectRequest, 
    isRejecting,
    deleteRequest,
    isDeleting,
  } = useUserCreationRequests();

  const [viewDialog, setViewDialog] = useState<{ open: boolean; request: UserCreationRequest | null }>({ 
    open: false, 
    request: null 
  });
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; request: UserCreationRequest | null }>({ 
    open: false, 
    request: null 
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: UserCreationRequest | null }>({ 
    open: false, 
    request: null 
  });
  const [password, setPassword] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = () => {
    if (!approveDialog.request || !password) return;
    
    approveRequest(
      { requestId: approveDialog.request.id, password },
      {
        onSuccess: () => {
          setApproveDialog({ open: false, request: null });
          setPassword('');
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectDialog.request || !rejectionReason) return;
    
    rejectRequest(
      { requestId: rejectDialog.request.id, reason: rejectionReason },
      {
        onSuccess: () => {
          setRejectDialog({ open: false, request: null });
          setRejectionReason('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Demandes de création
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `${pendingRequests.length} demande(s) en attente de validation`
                  : 'Vos demandes de création d\'utilisateur'
                }
              </CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune demande
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Demandé par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const statusConfig = STATUS_CONFIG[req.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.first_name} {req.last_name}</div>
                          <div className="text-sm text-muted-foreground">{req.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {req.agency_label || req.agency_slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {GLOBAL_ROLE_LABELS[req.target_global_role as GlobalRole]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{req.requester_name || req.requester_email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(req.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.color} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDialog({ open: true, request: req })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {isAdmin && req.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => setApproveDialog({ open: true, request: req })}>
                                  <Check className="h-4 w-4 mr-2 text-green-500" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRejectDialog({ open: true, request: req })}>
                                  <X className="h-4 w-4 mr-2 text-red-500" />
                                  Rejeter
                                </DropdownMenuItem>
                              </>
                            )}
                            {isAdmin && req.status !== 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => deleteRequest(req.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, request: open ? viewDialog.request : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
          </DialogHeader>
          {viewDialog.request && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{viewDialog.request.first_name} {viewDialog.request.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewDialog.request.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agence</p>
                  <p className="font-medium">{viewDialog.request.agency_label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Poste</p>
                  <p className="font-medium">{viewDialog.request.role_agence}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau d'accès</p>
                  <p className="font-medium">{GLOBAL_ROLE_LABELS[viewDialog.request.target_global_role as GlobalRole]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Demandé par</p>
                  <p className="font-medium">{viewDialog.request.requester_name || viewDialog.request.requester_email}</p>
                </div>
              </div>
              {viewDialog.request.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{viewDialog.request.notes}</p>
                </div>
              )}
              {viewDialog.request.rejection_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Raison du rejet</p>
                  <p className="text-sm text-destructive">{viewDialog.request.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open, request: open ? approveDialog.request : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Créer l'utilisateur {approveDialog.request?.first_name} {approveDialog.request?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe temporaire *</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 caractères avec majuscule, minuscule, chiffre et symbole"
              />
              <p className="text-xs text-muted-foreground">
                Ce mot de passe sera communiqué à l'utilisateur par email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, request: null })}>
              Annuler
            </Button>
            <Button onClick={handleApprove} disabled={isApproving || !password || password.length < 8}>
              {isApproving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer l'utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, request: open ? rejectDialog.request : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet pour {rejectDialog.request?.first_name} {rejectDialog.request?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Raison du rejet *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez pourquoi cette demande est rejetée..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, request: null })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason}>
              {isRejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
