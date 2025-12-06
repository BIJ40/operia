import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";
import { useCommercialProfile, useUpsertCommercialProfile, CommercialProfile } from "../hooks/useCommercialProfile";
import { CommercialImageUpload } from "./CommercialImageUpload";

interface CommercialProfileFormProps {
  agencyId: string | null;
}

type FormData = Omit<CommercialProfile, 'id' | 'created_at' | 'updated_at'>;

export function CommercialProfileForm({ agencyId }: CommercialProfileFormProps) {
  const { data: profile, isLoading } = useCommercialProfile(agencyId);
  const upsertMutation = useUpsertCommercialProfile();

  const form = useForm<FormData>({
    defaultValues: {
      agency_id: agencyId || '',
      agence_nom_long: '',
      baseline: '',
      date_creation: '',
      rang_agence: '',
      nb_techniciens: null,
      nb_assistantes: null,
      description_equipe: '',
      zones_intervention: '',
      email_contact: '',
      phone_contact: '',
      texte_qui_sommes_nous: '',
      texte_nos_valeurs: '',
      texte_nos_engagements: '',
      texte_nos_competences: '',
      texte_comment_ca_se_passe: '',
      logo_agence_url: null,
      photo_equipe_url: null,
      photo_lien_suivi_url: null,
      photo_realisation1_avant_url: null,
      photo_realisation1_apres_url: null,
      photo_realisation2_avant_url: null,
      photo_realisation2_apres_url: null,
      photo_realisation3_avant_url: null,
      photo_realisation3_apres_url: null,
      photo_temoignage1_url: null,
      photo_temoignage2_url: null,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset(profile);
    } else if (agencyId) {
      form.reset({
        agency_id: agencyId,
        agence_nom_long: '',
        baseline: '',
        date_creation: '',
        rang_agence: '',
        nb_techniciens: null,
        nb_assistantes: null,
        description_equipe: '',
        zones_intervention: '',
        email_contact: '',
        phone_contact: '',
        texte_qui_sommes_nous: '',
        texte_nos_valeurs: '',
        texte_nos_engagements: '',
        texte_nos_competences: '',
        texte_comment_ca_se_passe: '',
        logo_agence_url: null,
        photo_equipe_url: null,
        photo_lien_suivi_url: null,
        photo_realisation1_avant_url: null,
        photo_realisation1_apres_url: null,
        photo_realisation2_avant_url: null,
        photo_realisation2_apres_url: null,
        photo_realisation3_avant_url: null,
        photo_realisation3_apres_url: null,
        photo_temoignage1_url: null,
        photo_temoignage2_url: null,
      });
    }
  }, [profile, agencyId, form]);

  const onSubmit = (data: FormData) => {
    if (!agencyId) return;
    upsertMutation.mutate({ ...data, agency_id: agencyId });
  };

  const handleImageChange = (field: keyof FormData, url: string | null) => {
    form.setValue(field, url);
  };

  if (!agencyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Veuillez sélectionner une agence
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Identité */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Identité de l'agence</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agence_nom_long">Nom complet de l'agence</Label>
            <Input
              id="agence_nom_long"
              placeholder="HELP Confort Landes & Pays Basques"
              {...form.register('agence_nom_long')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date_creation">Date de création</Label>
            <Input
              id="date_creation"
              placeholder="avril 2021"
              {...form.register('date_creation')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseline">Baseline / Slogan</Label>
          <Input
            id="baseline"
            placeholder="La confiance commence par l'écoute..."
            {...form.register('baseline')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rang_agence">Rang dans le réseau</Label>
          <Input
            id="rang_agence"
            placeholder="2ᵉ agence la plus performante du réseau national"
            {...form.register('rang_agence')}
          />
        </div>
      </div>

      <Separator />

      {/* Équipe */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">L'équipe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nb_techniciens">Nombre de techniciens</Label>
            <Input
              id="nb_techniciens"
              type="number"
              {...form.register('nb_techniciens', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nb_assistantes">Nombre d'assistantes</Label>
            <Input
              id="nb_assistantes"
              type="number"
              {...form.register('nb_assistantes', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_equipe">Description de l'équipe</Label>
          <Textarea
            id="description_equipe"
            placeholder="Une équipe jeune et dynamique..."
            rows={3}
            {...form.register('description_equipe')}
          />
        </div>
      </div>

      <Separator />

      {/* Zones & Contacts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Zones & Contacts</h3>
        
        <div className="space-y-2">
          <Label htmlFor="zones_intervention">Zones d'intervention</Label>
          <Input
            id="zones_intervention"
            placeholder="Toutes les Landes, Le Pays Basque"
            {...form.register('zones_intervention')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email_contact">Email de contact</Label>
            <Input
              id="email_contact"
              type="email"
              {...form.register('email_contact')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone_contact">Téléphone</Label>
            <Input
              id="phone_contact"
              type="tel"
              {...form.register('phone_contact')}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Textes de sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Textes des sections</h3>
        
        <div className="space-y-2">
          <Label htmlFor="texte_qui_sommes_nous">Qui sommes-nous ?</Label>
          <Textarea
            id="texte_qui_sommes_nous"
            rows={4}
            {...form.register('texte_qui_sommes_nous')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="texte_nos_valeurs">Nos valeurs</Label>
          <Textarea
            id="texte_nos_valeurs"
            rows={4}
            {...form.register('texte_nos_valeurs')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="texte_nos_engagements">Nos engagements</Label>
          <Textarea
            id="texte_nos_engagements"
            rows={4}
            {...form.register('texte_nos_engagements')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="texte_nos_competences">Nos compétences</Label>
          <Textarea
            id="texte_nos_competences"
            rows={4}
            {...form.register('texte_nos_competences')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="texte_comment_ca_se_passe">Comment ça se passe ?</Label>
          <Textarea
            id="texte_comment_ca_se_passe"
            rows={4}
            {...form.register('texte_comment_ca_se_passe')}
          />
        </div>
      </div>

      <Separator />

      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Images & Photos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CommercialImageUpload
            label="Logo agence"
            fieldName="logo_agence_url"
            currentUrl={form.watch('logo_agence_url')}
            agencyId={agencyId}
            onUrlChange={(url) => handleImageChange('logo_agence_url', url)}
          />
          
          <CommercialImageUpload
            label="Photo équipe"
            fieldName="photo_equipe_url"
            currentUrl={form.watch('photo_equipe_url')}
            agencyId={agencyId}
            onUrlChange={(url) => handleImageChange('photo_equipe_url', url)}
          />
          
          <CommercialImageUpload
            label="Aperçu lien suivi client"
            fieldName="photo_lien_suivi_url"
            currentUrl={form.watch('photo_lien_suivi_url')}
            agencyId={agencyId}
            onUrlChange={(url) => handleImageChange('photo_lien_suivi_url', url)}
          />
        </div>

        <h4 className="text-md font-medium mt-6">Réalisations Avant/Après</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CommercialImageUpload
              label="Réalisation 1 - Avant"
              fieldName="photo_realisation1_avant_url"
              currentUrl={form.watch('photo_realisation1_avant_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation1_avant_url', url)}
            />
            <CommercialImageUpload
              label="Réalisation 1 - Après"
              fieldName="photo_realisation1_apres_url"
              currentUrl={form.watch('photo_realisation1_apres_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation1_apres_url', url)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <CommercialImageUpload
              label="Réalisation 2 - Avant"
              fieldName="photo_realisation2_avant_url"
              currentUrl={form.watch('photo_realisation2_avant_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation2_avant_url', url)}
            />
            <CommercialImageUpload
              label="Réalisation 2 - Après"
              fieldName="photo_realisation2_apres_url"
              currentUrl={form.watch('photo_realisation2_apres_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation2_apres_url', url)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <CommercialImageUpload
              label="Réalisation 3 - Avant"
              fieldName="photo_realisation3_avant_url"
              currentUrl={form.watch('photo_realisation3_avant_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation3_avant_url', url)}
            />
            <CommercialImageUpload
              label="Réalisation 3 - Après"
              fieldName="photo_realisation3_apres_url"
              currentUrl={form.watch('photo_realisation3_apres_url')}
              agencyId={agencyId}
              onUrlChange={(url) => handleImageChange('photo_realisation3_apres_url', url)}
            />
          </div>
        </div>

        <h4 className="text-md font-medium mt-6">Témoignages clients</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommercialImageUpload
            label="Témoignage 1"
            fieldName="photo_temoignage1_url"
            currentUrl={form.watch('photo_temoignage1_url')}
            agencyId={agencyId}
            onUrlChange={(url) => handleImageChange('photo_temoignage1_url', url)}
          />
          <CommercialImageUpload
            label="Témoignage 2"
            fieldName="photo_temoignage2_url"
            currentUrl={form.watch('photo_temoignage2_url')}
            agencyId={agencyId}
            onUrlChange={(url) => handleImageChange('photo_temoignage2_url', url)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={upsertMutation.isPending}>
          {upsertMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
