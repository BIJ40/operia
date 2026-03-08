import { useState, useEffect } from "react";
import { Building2, MapPin, Calendar, Users, Save, Loader2, Mail, Phone, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from "@/franchiseur/hooks/useAgencies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AgencyInfoCompact() {
  const { agencyId } = useProfile();
  const { data: agency, isLoading } = useAgency(agencyId);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    date_ouverture: "",
    date_cloture_bilan: "",
    adresse: "",
    ville: "",
    code_postal: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    if (agency) {
      setFormData({
        date_ouverture: agency.date_ouverture || "",
        date_cloture_bilan: agency.date_cloture_bilan || "",
        adresse: agency.adresse || "",
        ville: agency.ville || "",
        code_postal: agency.code_postal || "",
        contact_email: agency.contact_email || "",
        contact_phone: agency.contact_phone || "",
      });
    }
  }, [agency]);

  const handleSave = async () => {
    if (!agencyId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('apogee_agencies')
        .update({
          date_ouverture: formData.date_ouverture || null,
          date_cloture_bilan: formData.date_cloture_bilan || null,
          adresse: formData.adresse || null,
          ville: formData.ville || null,
          code_postal: formData.code_postal || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
        })
        .eq('id', agencyId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['franchiseur-agency', agencyId] });
      await queryClient.invalidateQueries({ queryKey: ['franchiseur-agencies'] });

      toast.success("Informations mises à jour");
      setIsEditDialogOpen(false);
    } catch (error: any) {
      logError('AGENCY_INFO', 'Error updating agency info:', error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <p className="text-sm text-muted-foreground">Agence non trouvée</p>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-gradient-to-r from-muted/40 to-muted/20 shadow-sm">
      {/* Info compacte */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">{agency.label}</h2>
          {agency.animateurs && agency.animateurs.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3 inline mr-1" />
              {agency.animateurs.map(a => a.first_name).join(', ')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
          {(agency.ville || agency.code_postal) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {agency.code_postal} {agency.ville}
            </span>
          )}
          {agency.date_ouverture && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Depuis {formatDate(agency.date_ouverture)}
            </span>
          )}
          {agency.contact_email && (
            <a href={`mailto:${agency.contact_email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Mail className="w-3.5 h-3.5" />
              {agency.contact_email}
            </a>
          )}
          {agency.contact_phone && (
            <a href={`tel:${agency.contact_phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Phone className="w-3.5 h-3.5" />
              {agency.contact_phone}
            </a>
          )}
        </div>
      </div>

      {/* Bouton modifier */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <Pencil className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-helpconfort-blue" />
              Modifier les informations
            </DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de votre agence
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date_ouverture" className="text-sm">
                  Date d'ouverture
                </Label>
                <Input
                  id="date_ouverture"
                  type="date"
                  value={formData.date_ouverture}
                  onChange={(e) => setFormData({ ...formData, date_ouverture: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_cloture_bilan" className="text-sm">
                  Clôture bilan (JJ/MM)
                </Label>
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
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <Label className="text-sm">Adresse</Label>
              <Input
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                placeholder="123 rue Example"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  placeholder="Code postal"
                />
                <Input
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  placeholder="Ville"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@agence.fr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Téléphone</Label>
                <Input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
