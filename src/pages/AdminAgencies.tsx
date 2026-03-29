import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logger';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp, Eye, User, Crown, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePlanCatalog } from '@/hooks/access-rights/usePlanCatalog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminViewHeader } from '@/components/admin/shared/AdminViewHeader';
import { AdminPanel } from '@/components/admin/shared/AdminPanel';

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  content_webhook_url: string | null;
}

interface AgencyFormData {
  slug: string;
  label: string;
  is_active: boolean;
  content_webhook_url: string;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  agence: string | null;
  agency_id: string | null;
  role_agence: string | null;
}

interface CollaboratorRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string | null;
  type: string | null;
  agency_id: string;
  leaving_date: string | null;
  is_registered_user: boolean;
}

// Route protégée par RoleGuard dans App.tsx
export default function AdminAgencies() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<AgencyFormData>({
    slug: '',
    label: '',
    is_active: true,
    content_webhook_url: '',
  });

  // Plan management hooks (V2)
  const { plans } = usePlanCatalog();
  const queryClient = useQueryClient();

  const { data: agencyPlans } = useQuery({
    queryKey: ['agency_plans_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_plan')
        .select('agency_id, plan_id, status')
        .eq('status', 'active');
      if (error) throw error;
      return data ?? [];
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ agencyId, planId }: { agencyId: string; planId: string }) => {
      const existing = agencyPlans?.find(p => p.agency_id === agencyId);
      if (existing) {
        const { error } = await supabase
          .from('agency_plan')
          .update({ plan_id: planId, updated_at: new Date().toISOString() })
          .eq('agency_id', agencyId)
          .eq('status', 'active');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agency_plan')
          .insert({
            agency_id: agencyId,
            plan_id: planId,
            status: 'active',
            assigned_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency_plans_all'] });
      toast({ title: 'Plan mis à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agenciesResult, usersResult, collabsResult] = await Promise.all([
        supabase.from('apogee_agencies').select('*').order('label').limit(500),
        supabase.from('profiles').select('id, first_name, last_name, email, agence, agency_id, role_agence').order('first_name').limit(1000),
        supabase.from('collaborators').select('id, user_id, first_name, last_name, email, role, type, agency_id, leaving_date, is_registered_user').order('last_name').limit(2000),
      ]);

      if (agenciesResult.error) throw agenciesResult.error;
      if (usersResult.error) throw usersResult.error;
      if (collabsResult.error) throw collabsResult.error;

      setAgencies(agenciesResult.data || []);
      setUsers(usersResult.data || []);
      setCollaborators(collabsResult.data || []);
    } catch (error) {
      logError('ADMIN_AGENCIES', 'Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors du chargement des données',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgencyExpanded = (agencyId: string) => {
    const newExpanded = new Set(expandedAgencies);
    if (newExpanded.has(agencyId)) {
      newExpanded.delete(agencyId);
    } else {
      newExpanded.add(agencyId);
    }
    setExpandedAgencies(newExpanded);
  };

  const getUsersForAgency = (agencyId: string) => {
    return users.filter((user) => user.agency_id === agencyId);
  };

  /** Get non-registered collaborators for an agency (not linked to any profile) */
  const getUnregisteredCollaborators = (agencyId: string) => {
    const registeredUserIds = new Set(users.filter(u => u.agency_id === agencyId).map(u => u.id));
    return collaborators.filter(c => 
      c.agency_id === agencyId && 
      (!c.user_id || !registeredUserIds.has(c.user_id)) &&
      !c.is_registered_user
    );
  };

  const handleCreateUserFromCollab = (collab: CollaboratorRow, agencySlug: string) => {
    const params = new URLSearchParams({
      action: 'create',
      firstName: collab.first_name,
      lastName: collab.last_name,
      email: collab.email || '',
      agence: agencySlug,
    });
    navigate(`${ROUTES.admin.users}?${params.toString()}`);
  };

  const getUsersWithoutAgency = () => {
    return users.filter((user) => !user.agency_id && user.role_agence === 'dirigeant');
  };

  // Get current plan for an agency (V2)
  const getAgencyPlanId = (agencyId: string) => {
    return agencyPlans?.find(p => p.agency_id === agencyId)?.plan_id ?? null;
  };

  const handlePlanChange = (agencyId: string, planId: string) => {
    updatePlanMutation.mutate({ agencyId, planId });
  };

  const openDialog = (agency?: Agency) => {
    if (agency) {
      setEditingAgency(agency);
      setFormData({
        slug: agency.slug,
        label: agency.label,
        is_active: agency.is_active,
        content_webhook_url: agency.content_webhook_url || '',
      });
    } else {
      setEditingAgency(null);
      setFormData({
        slug: '',
        label: '',
        is_active: true,
        content_webhook_url: '',
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingAgency(null);
  };

  const handleSave = async () => {
    try {
      const saveData = {
        ...formData,
        content_webhook_url: formData.content_webhook_url.trim() || null,
      };
      if (editingAgency) {
        const { error } = await supabase
          .from('apogee_agencies')
          .update(saveData)
          .eq('id', editingAgency.id);

        if (error) throw error;
        toast({ title: 'Agence modifiée avec succès' });
      } else {
        const { error } = await supabase.from('apogee_agencies').insert([saveData]);

        if (error) throw error;
        toast({ title: 'Agence créée avec succès' });
      }

      closeDialog();
      loadData();
    } catch (error) {
      logError('ADMIN_AGENCIES', 'Error saving agency:', error);
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'enregistrement",
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette agence ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('apogee_agencies').delete().eq('id', id);

      if (error) throw error;
      toast({ title: 'Agence supprimée avec succès' });
      loadData();
    } catch (error) {
      logError('ADMIN_AGENCIES', 'Error deleting agency:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleAssignUser = async (userId: string, agencySlug: string | null) => {
    try {
      // Resolve agency_id from slug
      const targetAgency = agencySlug ? agencies.find(a => a.slug === agencySlug) : null;
      const { error } = await supabase
        .from('profiles')
        .update({ 
          agence: agencySlug,
          agency_id: targetAgency?.id ?? null,
        })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: 'Utilisateur assigné avec succès' });
      loadData();
    } catch (error) {
      logError('ADMIN_AGENCIES', 'Error assigning user:', error);
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'assignation",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminViewHeader
        title="Gestion des Agences"
        subtitle="Configuration des agences et attribution des utilisateurs"
      >
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouvelle agence
        </Button>
      </AdminViewHeader>

      {/* Utilisateurs sans agence */}
      {getUsersWithoutAgency().length > 0 && (
        <AdminPanel>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Utilisateurs sans agence</h3>
                <Badge variant="outline" className="text-xs">
                  {getUsersWithoutAgency().length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
              Ces utilisateurs n'ont pas encore d'agence assignée
              </p>
            </div>
            <div className="space-y-2">
              {getUsersWithoutAgency().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.role_agence && (
                      <Badge variant="outline" className="mt-1">
                        {user.role_agence}
                      </Badge>
                    )}
                  </div>
                  <Select
                    onValueChange={(value) => handleAssignUser(user.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assigner à une agence" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies
                        .filter((a) => a.is_active)
                        .map((agency) => (
                          <SelectItem key={agency.id} value={agency.slug}>
                            {agency.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      )}

      {/* Liste des agences */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : agencies.length === 0 ? (
        <AdminPanel className="py-12 text-center text-muted-foreground">
          Aucune agence configurée
        </AdminPanel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {agencies.map((agency) => {
            const agencyUsers = getUsersForAgency(agency.id);
            const unregistered = getUnregisteredCollaborators(agency.id);
            const totalCount = agencyUsers.length + unregistered.length;
            const planId = getAgencyPlanId(agency.id);
            const plan = plans.find(p => p.id === planId);

            return (
              <div key={agency.id} className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Card header */}
                <div className="px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm text-foreground truncate">{agency.label}</span>
                      <Badge
                        variant={agency.is_active ? 'outline' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Users className="h-3 w-3 mr-0.5" />
                      {totalCount}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-mono">{agency.slug}</div>

                  {/* Plan selector */}
                  <Select
                    value={planId || ''}
                    onValueChange={(value) => handlePlanChange(agency.id, value)}
                  >
                    <SelectTrigger className="w-full h-7 text-xs">
                      <Crown className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Plan…" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Card actions */}
                <div className="flex items-center justify-end gap-0.5 px-2 py-1.5 border-t bg-muted/20">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleAgencyExpanded(agency.id)}
                    title="Voir les membres"
                  >
                    {expandedAgencies.has(agency.id) ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigate(ROUTES.admin.agencyProfile(agency.id))}
                    title="Voir le profil complet"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openDialog(agency)}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(agency.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded member panels (full width, below grid) */}
        {agencies.filter(a => expandedAgencies.has(a.id)).map(agency => {
          const agencyUsers = getUsersForAgency(agency.id);
          const unregistered = getUnregisteredCollaborators(agency.id);
          const totalCount = agencyUsers.length + unregistered.length;

          return (
            <div key={`expanded-${agency.id}`} className="mt-3 border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                <span className="font-medium text-sm text-foreground">{agency.label} — Membres</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAgencyExpanded(agency.id)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                    {totalCount === 0 ? (
                      <div className="text-center text-muted-foreground">
                        Aucun membre dans cette agence
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agencyUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.first_name} {user.last_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                {user.role_agence && (
                                  <Badge variant="outline">{user.role_agence}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  Inscrit
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(ROUTES.admin.users)}
                                    title="Voir dans gestion utilisateurs"
                                  >
                                    <User className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAssignUser(user.id, null)}
                                  >
                                    Retirer
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {unregistered.map((collab) => (
                            <TableRow key={`collab-${collab.id}`} className="bg-muted/30">
                              <TableCell className="font-medium">
                                {collab.first_name} {collab.last_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {collab.email || '—'}
                              </TableCell>
                              <TableCell>
                                {(collab.role || collab.type) && (
                                  <Badge variant="outline">{collab.role || collab.type}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  Non inscrit
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-primary"
                                  onClick={() => handleCreateUserFromCollab(collab, agency.slug)}
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Créer le compte
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Modifier l'agence" : 'Nouvelle agence'}
            </DialogTitle>
            <DialogDescription>
              L'URL de l'API sera automatiquement construite comme https://&#123;slug&#125;.hc-apogee.fr/api
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (identifiant unique)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                }
                placeholder="ex: dax, saint-omer"
                disabled={!!editingAgency}
              />
              <p className="text-xs text-muted-foreground">
                URL de l'API : https://{formData.slug || '{slug}'}.hc-apogee.fr/api
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="label">Nom de l'agence</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: DAX, SAINT-OMER"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Agence active</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content_webhook_url">Webhook URL (outil externe)</Label>
              <Input
                id="content_webhook_url"
                type="url"
                value={formData.content_webhook_url}
                onChange={(e) => setFormData({ ...formData, content_webhook_url: e.target.value })}
                placeholder="https://example.com/api/receive-photos"
              />
              <p className="text-xs text-muted-foreground">
                URL vers laquelle les réalisations et posts sociaux seront envoyés. Laisser vide pour utiliser le webhook global.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={handleSave}>{editingAgency ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
