import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save, X } from "lucide-react";
import { logError } from "@/lib/logger";
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
import { usePersistedTab } from "@/hooks/usePersistedState";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAgency } from "../hooks/useAgencies";
import { RoyaltyConfigSection } from "./RoyaltyConfigSection";
import { AgencyStampUpload } from "./AgencyStampUpload";

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
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [dialogTab, setDialogTab] = usePersistedTab(`agency-dialog-${agencyId}-tab`, 'info');

  const [formData, setFormData] = useState({
    label: "",
    slug: "",
    is_active: true,
    date_ouverture: "",
    date_cloture_bilan: "",
    contact_email: "",
    contact_phone: "",
    adresse: "",
    ville: "",
    code_postal: "",
  });

  useEffect(() => {
    if (agency) {
      setFormData({
        label: agency.label || "",
        slug: agency.slug || "",
        is_active: agency.is_active,
        date_ouverture: agency.date_ouverture || "",
        date_cloture_bilan: agency.date_cloture_bilan || "",
        contact_email: agency.contact_email || "",
        contact_phone: agency.contact_phone || "",
        adresse: agency.adresse || "",
        ville: agency.ville || "",
        code_postal: agency.code_postal || "",
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
        date_cloture_bilan: formData.date_cloture_bilan || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        code_postal: formData.code_postal || null,
      };

      if (agencyId) {
        const { error } = await supabase
          .from('apogee_agencies')
          .update(dataToSave)
          .eq('id', agencyId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('apogee_agencies')
          .insert(dataToSave)
          .select('id')
          .single();

        if (error) throw error;
      }

      toast.success(agencyId ? "Agence mise à jour avec succès" : "Agence créée avec succès");

      queryClient.invalidateQueries({ queryKey: ['franchiseur-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-agency', agencyId] });
      onOpenChange(false);
    } catch (error: any) {
      logError('FRANCHISEUR', 'Error saving agency:', error);
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

        <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
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

              <div className="space-y-2">
                <Label htmlFor="date_cloture_bilan">Date de clôture bilan (JJ/MM)</Label>
                <Input
                  id="date_cloture_bilan"
                  type="text"
                  placeholder="31/03"
                  maxLength={5}
                  value={formData.date_cloture_bilan}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9/]/g, '');
                    if (value.length === 2 && !value.includes('/')) {
                      value = value + '/';
                    }
                    setFormData({ ...formData, date_cloture_bilan: value });
                  }}
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

            {agencyId && (
              <>
                <Separator />
                <AgencyStampUpload agencyId={agencyId} disabled={!canManage} />
              </>
            )}
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
