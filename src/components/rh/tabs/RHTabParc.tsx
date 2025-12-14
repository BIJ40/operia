/**
 * Onglet Parc & Matériel
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Car, CreditCard, Smartphone } from 'lucide-react';
import { useUpdateAssets } from '@/hooks/useRHSuivi';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

export function RHTabParc({ collaborator }: Props) {
  const assets = collaborator.assets;
  const updateAssets = useUpdateAssets();
  
  const [form, setForm] = useState({
    vehicule_attribue: assets?.vehicule_attribue || '',
    carte_carburant: assets?.carte_carburant || false,
    numero_carte_carburant: assets?.numero_carte_carburant || '',
    fournisseur_carte_carburant: assets?.fournisseur_carte_carburant || '',
    carte_bancaire: assets?.carte_bancaire || false,
    numero_carte_bancaire: assets?.numero_carte_bancaire || '',
    fournisseur_carte_bancaire: assets?.fournisseur_carte_bancaire || '',
    carte_autre_nom: assets?.carte_autre_nom || '',
    carte_autre_numero: assets?.carte_autre_numero || '',
    carte_autre_fournisseur: assets?.carte_autre_fournisseur || '',
    tablette_telephone: assets?.tablette_telephone || '',
    imei: assets?.imei || '',
  });

  const handleSave = () => {
    updateAssets.mutate({
      collaboratorId: collaborator.id,
      data: form,
    });
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify({
    vehicule_attribue: assets?.vehicule_attribue || '',
    carte_carburant: assets?.carte_carburant || false,
    numero_carte_carburant: assets?.numero_carte_carburant || '',
    fournisseur_carte_carburant: assets?.fournisseur_carte_carburant || '',
    carte_bancaire: assets?.carte_bancaire || false,
    numero_carte_bancaire: assets?.numero_carte_bancaire || '',
    fournisseur_carte_bancaire: assets?.fournisseur_carte_bancaire || '',
    carte_autre_nom: assets?.carte_autre_nom || '',
    carte_autre_numero: assets?.carte_autre_numero || '',
    carte_autre_fournisseur: assets?.carte_autre_fournisseur || '',
    tablette_telephone: assets?.tablette_telephone || '',
    imei: assets?.imei || '',
  });

  return (
    <div className="space-y-6">
      {/* Véhicule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Véhicule attribué</Label>
            <Input
              value={form.vehicule_attribue}
              onChange={(e) => setForm(f => ({ ...f, vehicule_attribue: e.target.value }))}
              placeholder="Ex: Renault Kangoo - AB-123-CD"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cartes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cartes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Carte carburant</Label>
              <p className="text-xs text-muted-foreground">Le collaborateur dispose d'une carte carburant</p>
            </div>
            <Switch
              checked={form.carte_carburant}
              onCheckedChange={(checked) => setForm(f => ({ ...f, carte_carburant: checked }))}
            />
          </div>
          
          {form.carte_carburant && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>Numéro de carte</Label>
              <Input
                value={form.numero_carte_carburant}
                onChange={(e) => setForm(f => ({ ...f, numero_carte_carburant: e.target.value }))}
                placeholder="Numéro de carte..."
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">Information confidentielle (N2 uniquement)</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Carte bancaire</Label>
              <p className="text-xs text-muted-foreground">Le collaborateur dispose d'une carte bancaire société</p>
            </div>
            <Switch
              checked={form.carte_bancaire}
              onCheckedChange={(checked) => setForm(f => ({ ...f, carte_bancaire: checked }))}
            />
          </div>
          
          {form.carte_bancaire && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>Numéro de carte</Label>
              <Input
                value={form.numero_carte_bancaire}
                onChange={(e) => setForm(f => ({ ...f, numero_carte_bancaire: e.target.value }))}
                placeholder="Numéro de carte..."
                className="max-w-xs"
              />
              <Label>Fournisseur</Label>
              <Input
                value={form.fournisseur_carte_bancaire}
                onChange={(e) => setForm(f => ({ ...f, fournisseur_carte_bancaire: e.target.value }))}
                placeholder="Banque..."
                className="max-w-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Autre carte</Label>
              <p className="text-xs text-muted-foreground">Autre type de carte (personnalisable)</p>
            </div>
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-muted">
            <Label>Nom de la carte</Label>
            <Input
              value={form.carte_autre_nom}
              onChange={(e) => setForm(f => ({ ...f, carte_autre_nom: e.target.value }))}
              placeholder="Ex: Badge, Péage..."
              className="max-w-xs"
            />
            {form.carte_autre_nom && (
              <>
                <Label>Numéro</Label>
                <Input
                  value={form.carte_autre_numero}
                  onChange={(e) => setForm(f => ({ ...f, carte_autre_numero: e.target.value }))}
                  placeholder="Numéro..."
                  className="max-w-xs"
                />
                <Label>Fournisseur</Label>
                <Input
                  value={form.carte_autre_fournisseur}
                  onChange={(e) => setForm(f => ({ ...f, carte_autre_fournisseur: e.target.value }))}
                  placeholder="Fournisseur..."
                  className="max-w-xs"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Matériel IT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Matériel mobile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tablette / Téléphone</Label>
            <Input
              value={form.tablette_telephone}
              onChange={(e) => setForm(f => ({ ...f, tablette_telephone: e.target.value }))}
              placeholder="Ex: Samsung Galaxy Tab A"
            />
          </div>
          <div className="space-y-2">
            <Label>IMEI</Label>
            <Input
              value={form.imei}
              onChange={(e) => setForm(f => ({ ...f, imei: e.target.value }))}
              placeholder="Numéro IMEI..."
            />
            <p className="text-xs text-muted-foreground">Information confidentielle (N2 uniquement)</p>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updateAssets.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
