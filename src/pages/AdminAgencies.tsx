import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp, Eye, User, Crown, UserPlus } from 'lucide-react';
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
import { usePlanTiers } from '@/hooks/access-rights/usePlanTiers';
import { useAllAgencySubscriptions, useUpdateAgencySubscription } from '@/hooks/access-rights/useAgencySubscription';

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface AgencyFormData {
  slug: string;
  label: string;
  is_active: boolean;
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

// Route protégée par RoleGuard dans App.tsx
export default function AdminAgencies() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<AgencyFormData>({
    slug: '',
    label: '',
    is_active: true,
  });

  // Plan management hooks
  const { data: planTiers } = usePlanTiers();
  const { data: allSubscriptions } = useAllAgencySubscriptions();
  const updateSubscription = useUpdateAgencySubscription();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agenciesResult, usersResult] = await Promise.all([
        supabase.from('apogee_agencies').select('*').order('label').limit(500),
        supabase.from('profiles').select('id, first_name, last_name, email, agence, agency_id, role_agence').order('first_name').limit(1000),
      ]);

      if (agenciesResult.error) throw agenciesResult.error;
      if (usersResult.error) throw usersResult.error;

      setAgencies(agenciesResult.data || []);
      setUsers(usersResult.data || []);
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

  const getUsersWithoutAgency = () => {
    return users.filter((user) => !user.agency_id && user.role_agence === 'dirigeant');
  };

  // Get current plan for an agency
  const getAgencyPlan = (agencyId: string) => {
    const subscription = allSubscriptions?.find(s => s.agency_id === agencyId);
    return subscription?.tier_key || null;
  };

  const getAgencyPlanLabel = (agencyId: string) => {
    const tierKey = getAgencyPlan(agencyId);
    if (!tierKey) return 'Aucun';
    const tier = planTiers?.find(t => t.key === tierKey);
    return tier?.label || tierKey;
  };

  const handlePlanChange = (agencyId: string, tierKey: string) => {
    updateSubscription.mutate({ agencyId, tierKey });
  };

  const openDialog = (agency?: Agency) => {
    if (agency) {
      setEditingAgency(agency);
      setFormData({
        slug: agency.slug,
        label: agency.label,
        is_active: agency.is_active,
      });
    } else {
      setEditingAgency(null);
      setFormData({
        slug: '',
        label: '',
        is_active: true,
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
      if (editingAgency) {
        const { error } = await supabase
          .from('apogee_agencies')
          .update(formData)
          .eq('id', editingAgency.id);

        if (error) throw error;
        toast({ title: 'Agence modifiée avec succès' });
      } else {
        const { error } = await supabase.from('apogee_agencies').insert([formData]);

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Agences</h1>
          <p className="text-muted-foreground mt-1">
            Configuration des agences et attribution des utilisateurs
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle agence
        </Button>
      </div>

      {/* Utilisateurs sans agence */}
      {getUsersWithoutAgency().length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">
              <Users className="inline h-5 w-5 mr-2" />
              Utilisateurs sans agence ({getUsersWithoutAgency().length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              Ces utilisateurs n'ont pas encore d'agence assignée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getUsersWithoutAgency().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
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
          </CardContent>
        </Card>
      )}

      {/* Liste des agences */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : agencies.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucune agence configurée</p>
          ) : (
            <div className="space-y-4">
              {agencies.map((agency) => {
                const agencyUsers = getUsersForAgency(agency.id);
                const isExpanded = expandedAgencies.has(agency.id);

                return (
                  <Card key={agency.id} className="overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{agency.label}</h3>
                            <Badge
                              variant={agency.is_active ? 'default' : 'secondary'}
                              className={agency.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                            >
                              {agency.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              {agency.slug}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Plan selector */}
                          <Select
                            value={getAgencyPlan(agency.id) || ''}
                            onValueChange={(value) => handlePlanChange(agency.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <Crown className="h-3 w-3 mr-1 text-amber-500" />
                              <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {planTiers?.map((tier) => (
                                <SelectItem key={tier.key} value={tier.key}>
                                  {tier.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {agencyUsers.length}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(ROUTES.admin.agencyProfile(agency.id))}
                            title="Voir le profil complet"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAgencyExpanded(agency.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(agency)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(agency.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Collapsible open={isExpanded}>
                      <CollapsibleContent>
                        {agencyUsers.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            Aucun utilisateur assigné à cette agence
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
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
                            </TableBody>
                          </Table>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
