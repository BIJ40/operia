import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
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

interface Agency {
  id: string;
  slug: string;
  label: string;
  api_base_url: string;
  is_active: boolean;
}

interface AgencyFormData {
  slug: string;
  label: string;
  api_base_url: string;
  is_active: boolean;
}

export default function AdminAgencies() {
  const { isAdmin } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState<AgencyFormData>({
    slug: '',
    label: '',
    api_base_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin) {
      loadAgencies();
    }
  }, [isAdmin]);

  const loadAgencies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .order('label');

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error loading agencies:', error);
      toast.error('Erreur lors du chargement des agences');
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (agency?: Agency) => {
    if (agency) {
      setEditingAgency(agency);
      setFormData({
        slug: agency.slug,
        label: agency.label,
        api_base_url: agency.api_base_url,
        is_active: agency.is_active,
      });
    } else {
      setEditingAgency(null);
      setFormData({
        slug: '',
        label: '',
        api_base_url: '',
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
        toast.success('Agence modifiée avec succès');
      } else {
        const { error } = await supabase
          .from('apogee_agencies')
          .insert([formData]);

        if (error) throw error;
        toast.success('Agence créée avec succès');
      }

      closeDialog();
      loadAgencies();
    } catch (error) {
      console.error('Error saving agency:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette agence ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('apogee_agencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agence supprimée avec succès');
      loadAgencies();
    } catch (error) {
      console.error('Error deleting agency:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Agences</h1>
          <p className="text-muted-foreground mt-1">
            Configuration des agences et de leurs connexions à l'API Apogée
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle agence
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agences configurées</CardTitle>
          <CardDescription>
            Liste des agences avec leurs paramètres de connexion API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : agencies.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune agence configurée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>URL API</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-mono text-sm">{agency.slug}</TableCell>
                    <TableCell className="font-medium">{agency.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agency.api_base_url}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          agency.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? 'Modifier l\'agence' : 'Nouvelle agence'}
            </DialogTitle>
            <DialogDescription>
              Configurez les paramètres de connexion à l'API Apogée pour cette agence
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
            <div className="grid gap-2">
              <Label htmlFor="api_base_url">URL de base de l'API</Label>
              <Input
                id="api_base_url"
                value={formData.api_base_url}
                onChange={(e) =>
                  setFormData({ ...formData, api_base_url: e.target.value })
                }
                placeholder="ex: https://dax.hc-apogee.fr/api"
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
            <Button onClick={handleSave}>
              {editingAgency ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
