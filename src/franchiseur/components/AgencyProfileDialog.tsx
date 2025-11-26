import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAgency } from "../hooks/useAgencies";
import { useAnimators } from "../hooks/useAnimators";
import { RoyaltyConfigSection } from "./RoyaltyConfigSection";

interface AgencyProfileDialogProps {
  agencyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

export function AgencyProfileDialog({
  agencyId,
  open,
  onOpenChange,
  canManage,
}: AgencyProfileDialogProps) {
  const { data: agency, isLoading } = useAgency(agencyId);
  const { data: animators } = useAnimators();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    label: "",
    slug: "",
    is_active: true,
    date_ouverture: "",
    contact_email: "",
    contact_phone: "",
    adresse: "",
    ville: "",
    code_postal: "",
    animateur_id: "",
  });

  useEffect(() => {
    if (agency) {
      setFormData({
        label: agency.label || "",
        slug: agency.slug || "",
        is_active: agency.is_active,
        date_ouverture: agency.date_ouverture || "",
        contact_email: agency.contact_email || "",
        contact_phone: agency.contact_phone || "",
        adresse: agency.adresse || "",
        ville: agency.ville || "",
        code_postal: agency.code_postal || "",
        animateur_id: agency.animateur_id || "",
      });
    }
  }, [agency]);

  const handleSave = async () => {
    if (!canManage) {
      toast.error("Vous n'avez pas les droits pour modifier les agences");
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        date_ouverture: formData.date_ouverture || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        code_postal: formData.code_postal || null,
        animateur_id: formData.animateur_id === "none" ? null : (formData.animateur_id || null),
      };

      if (agencyId) {
        // Update existing agency
        const { error } = await supabase
          .from('apogee_agencies')
          .update(dataToSave)
          .eq('id', agencyId);

        if (error) throw error;
        toast.success("Agence mise à jour avec succès");
      } else {
        // Create new agency
        const { error } = await supabase
          .from('apogee_agencies')
          .insert(dataToSave);

        if (error) throw error;
        toast.success("Agence créée avec succès");
      }

      queryClient.invalidateQueries({ queryKey: ['franchiseur-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-agency', agencyId] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving agency:', error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && agencyId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {agencyId ? "Profil de l'agence" : "Nouvelle agence"}
          </DialogTitle>
          <DialogDescription>
            {agencyId 
              ? "Consultez et modifiez les informations de l'agence"
              : "Créez une nouvelle agence dans le réseau"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="royalties" disabled={!agencyId || !canManage}>
              Redevances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="label">Nom de l'agence *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  disabled={!canManage}
                  placeholder="Agence Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  disabled={!canManage}
                  placeholder="paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_ouverture">Date d'ouverture</Label>
                <Input
                  id="date_ouverture"
                  type="date"
                  value={formData.date_ouverture}
                  onChange={(e) => setFormData({ ...formData, date_ouverture: e.target.value })}
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={!canManage}
                />
                <Label htmlFor="is_active">Agence active</Label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Coordonnées</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    disabled={!canManage}
                    placeholder="contact@agence.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    disabled={!canManage}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  disabled={!canManage}
                  placeholder="123 rue Example"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    disabled={!canManage}
                    placeholder="Paris"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    disabled={!canManage}
                    placeholder="75001"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Animateur réseau</h3>
              
              <div className="space-y-2">
                <Label htmlFor="animateur_id">Animateur rattaché</Label>
                <Select
                  value={formData.animateur_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, animateur_id: value })}
                  disabled={!canManage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un animateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun animateur</SelectItem>
                    {animators?.map((animator) => (
                      <SelectItem key={animator.id} value={animator.id}>
                        {animator.first_name} {animator.last_name} ({animator.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {animators?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun animateur disponible. Créez d'abord des utilisateurs avec le rôle "Animateur".
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="royalties" className="mt-4">
            {agencyId && <RoyaltyConfigSection agencyId={agencyId} />}
          </TabsContent>
        </Tabs>

        {canManage && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
