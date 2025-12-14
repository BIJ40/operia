/**
 * AgenciesTab - Onglet Agences pour la page Gestion Globale
 * Extrait de AdminAgencies.tsx
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp, Eye, User } from 'lucide-react';
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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

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
  role_agence: string | null;
}

export default function AgenciesTab() {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agenciesResult, usersResult] = await Promise.all([
        supabase.from('apogee_agencies').select('*').order('label'),
        supabase.from('profiles').select('id, first_name, last_name, email, agence, role_agence').order('first_name'),
      ]);

      if (agenciesResult.error) throw agenciesResult.error;
      if (usersResult.error) throw usersResult.error;

      setAgencies(agenciesResult.data || []);
      setUsers(usersResult.data || []);
    } catch (error) {
      logError('AGENCIES_TAB', 'Error loading data:', error);
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

  const getUsersForAgency = (slug: string) => {
    return users.filter((user) => user.agence === slug);
  };

  const getUsersWithoutAgency = () => {
    return users.filter((user) => !user.agence && user.role_agence === 'dirigeant');
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
      logError('AGENCIES_TAB', 'Error saving agency:', error);
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
      logError('AGENCIES_TAB', 'Error deleting agency:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleAssignUser = async (userId: string, agencySlug: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ agence: agencySlug })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: 'Utilisateur assigné avec succès' });
      loadData();
    } catch (error) {
      logError('AGENCIES_TAB', 'Error assigning user:', error);
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'assignation",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agences configurées</h2>
          <p className="text-sm text-muted-foreground">
            Configuration des agences et attribution des utilisateurs
          </p>
        </div>
        <Button onClick={() => openDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle agence
        </Button>
      </div>

      {/* Utilisateurs sans agence */}
      {getUsersWithoutAgency().length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="py-3">
            <CardTitle className="text-orange-900 text-base">
              <Users className="inline h-4 w-4 mr-2" />
              Utilisateurs sans agence ({getUsersWithoutAgency().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getUsersWithoutAgency().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Select onValueChange={(value) => handleAssignUser(user.id, value)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
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
      {isLoading ? (
        <p className="text-center text-muted-foreground py-4">Chargement...</p>
      ) : agencies.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">Aucune agence configurée</p>
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => {
            const agencyUsers = getUsersForAgency(agency.slug);
            const isExpanded = expandedAgencies.has(agency.id);

            return (
              <Card key={agency.id} className="overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agency.label}</h3>
                          <Badge
                            variant={agency.is_active ? 'default' : 'secondary'}
                            className={agency.is_active ? 'bg-green-100 text-green-800' : ''}
                          >
                            {agency.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{agency.slug}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {agencyUsers.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(ROUTES.admin.agencyProfile(agency.id))}
                        title="Voir le profil complet"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleAgencyExpanded(agency.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openDialog(agency)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
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
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        Aucun utilisateur assigné
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Nom</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Rôle</TableHead>
                            <TableHead className="text-right text-xs">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agencyUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium text-sm py-2">
                                {user.first_name} {user.last_name}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2">
                                {user.email}
                              </TableCell>
                              <TableCell className="py-2">
                                {user.role_agence && (
                                  <Badge variant="outline" className="text-xs">{user.role_agence}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAssignUser(user.id, null)}
                                >
                                  Retirer
                                </Button>
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

      {/* Dialog création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Modifier l'agence" : 'Nouvelle agence'}
            </DialogTitle>
            <DialogDescription>
              L'URL de l'API sera automatiquement construite
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (identifiant unique)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                placeholder="ex: dax, saint-omer"
                disabled={!!editingAgency}
              />
              <p className="text-xs text-muted-foreground">
                URL: https://{formData.slug || '{slug}'}.hc-apogee.fr/api
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
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Agence active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingAgency ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
