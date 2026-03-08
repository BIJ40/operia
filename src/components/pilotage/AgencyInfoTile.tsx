import { useState, useEffect } from "react";
import { Building2, MapPin, Calendar, Users, Save, Loader2, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from "@/franchiseur/hooks/useAgencies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { AgencyStampUpload } from "@/franchiseur/components/AgencyStampUpload";
import { cn } from "@/lib/utils";
interface AgencyInfoTileProps {
  hideHeader?: boolean;
}

export function AgencyInfoTile({ hideHeader = false }: AgencyInfoTileProps) {
  const { agencyId } = useAuth();
  const { data: agency, isLoading } = useAgency(agencyId);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

      // Invalider les caches pour synchroniser partout
      await queryClient.invalidateQueries({ queryKey: ['franchiseur-agency', agencyId] });
      await queryClient.invalidateQueries({ queryKey: ['franchiseur-agencies'] });

      toast.success("Informations mises à jour avec succès");
      setIsEditing(false);
    } catch (error: any) {
      logError('AGENCY_INFO', 'Error updating agency info:', error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue shadow-md">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!agency) {
    return (
      <Card className="rounded-2xl border-l-4 border-l-destructive shadow-md">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Agence non trouvée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue shadow-md hover:shadow-lg transition-shadow">
      {!hideHeader && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-helpconfort-blue" />
              Informations de l'agence
            </CardTitle>
            <CardDescription>
              Gérez les informations de votre agence
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              size="sm"
              className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
            >
              Modifier
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditing(false)}
                size="sm"
                variant="outline"
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={cn("space-y-6", hideHeader && "pt-4")}>
        {/* Actions en mode hideHeader */}
        {hideHeader && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Gérez les informations de votre agence
            </p>
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)}
                size="sm"
                className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
              >
                Modifier
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsEditing(false)}
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={isSaving}
                  className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Informations fixes */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nom de l'agence</Label>
            <p className="font-medium text-lg">{agency.label}</p>
          </div>

          {agency.animateurs && agency.animateurs.length > 0 && (
            <div className="flex items-start gap-3 pt-2">
              <Users className="h-5 w-5 text-helpconfort-blue mt-0.5" />
              <div>
                <Label className="text-xs text-muted-foreground">Mon animateur référent</Label>
                <p className="font-medium">
                  {agency.animateurs.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          {/* Dates modifiables */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_ouverture" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-helpconfort-blue" />
                Date d'ouverture
              </Label>
              {isEditing ? (
                <Input
                  id="date_ouverture"
                  type="date"
                  value={formData.date_ouverture}
                  onChange={(e) => setFormData({ ...formData, date_ouverture: e.target.value })}
                />
              ) : (
                <p className="text-sm font-medium">
                  {agency.date_ouverture 
                    ? new Date(agency.date_ouverture).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : "Non renseignée"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_cloture_bilan" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-helpconfort-blue" />
                Date de clôture bilan (JJ/MM)
              </Label>
              {isEditing ? (
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
              ) : (
                <p className="text-sm font-medium">
                  {agency.date_cloture_bilan || "Non renseignée"}
                </p>
              )}
            </div>
          </div>

          {/* Adresse complète modifiable */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-helpconfort-blue" />
              Adresse complète
            </Label>
            
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adresse" className="text-xs text-muted-foreground">
                    Adresse
                  </Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="123 rue Example"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code_postal" className="text-xs text-muted-foreground">
                      Code postal
                    </Label>
                    <Input
                      id="code_postal"
                      value={formData.code_postal}
                      onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                      placeholder="75001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ville" className="text-xs text-muted-foreground">
                      Ville
                    </Label>
                    <Input
                      id="ville"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      placeholder="Paris"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {agency.adresse ? (
                  <>
                    <p className="font-medium">{agency.adresse}</p>
                    {(agency.code_postal || agency.ville) && (
                      <p className="text-muted-foreground">
                        {agency.code_postal} {agency.ville}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Non renseignée</p>
                )}
              </div>
            )}
          </div>

          {/* Contact modifiable */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-helpconfort-blue" />
              Contact de l'agence
            </Label>
            
            {isEditing ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="text-xs text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@agence.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone" className="text-xs text-muted-foreground">
                    Téléphone
                  </Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {agency.contact_email ? (
                    <a href={`mailto:${agency.contact_email}`} className="hover:underline">
                      {agency.contact_email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Non renseigné</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {agency.contact_phone ? (
                    <a href={`tel:${agency.contact_phone}`} className="hover:underline">
                      {agency.contact_phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Non renseigné</span>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
