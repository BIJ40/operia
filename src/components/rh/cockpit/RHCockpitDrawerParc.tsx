/**
 * Contenu du drawer Parc (véhicule + matériel) pour le Cockpit RH
 */

import React from 'react';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { Car, CreditCard, Smartphone, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RHCockpitDrawerParcProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

export function RHCockpitDrawerParc({ collaborator, onUpdate }: RHCockpitDrawerParcProps) {
  const assets = collaborator.assets;
  
  // Parse véhicule JSON si nécessaire
  let vehicule: { marque?: string; modele?: string; immatriculation?: string } | null = null;
  if (assets?.vehicule_attribue) {
    try {
      vehicule = typeof assets.vehicule_attribue === 'string' 
        ? JSON.parse(assets.vehicule_attribue)
        : assets.vehicule_attribue;
    } catch {
      vehicule = { marque: assets.vehicule_attribue };
    }
  }

  const hasVehicle = !!vehicule;
  const hasCarburant = assets?.carte_carburant;
  const hasBancaire = assets?.carte_bancaire;
  const hasPhone = !!assets?.tablette_telephone;

  // Compter le matériel
  const equipmentCount = [hasVehicle, hasCarburant, hasBancaire, hasPhone].filter(Boolean).length;

  return (
    <>
      {/* Résumé */}
      <DrawerSection>
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          equipmentCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800/50'
        )}>
          <Car className={cn(
            'h-5 w-5',
            equipmentCount > 0 ? 'text-emerald-600' : 'text-slate-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            equipmentCount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
          )}>
            {equipmentCount > 0 
              ? `${equipmentCount} équipement(s) attribué(s)` 
              : 'Aucun équipement attribué'}
          </span>
        </div>
      </DrawerSection>

      {/* Véhicule */}
      <DrawerSection title="Véhicule" className="mt-6">
        {hasVehicle ? (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {vehicule?.marque} {vehicule?.modele}
              </span>
            </div>
            {vehicule?.immatriculation && (
              <Badge variant="secondary" className="font-mono">
                {vehicule.immatriculation}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucun véhicule attribué
          </p>
        )}
      </DrawerSection>

      {/* Cartes */}
      <DrawerSection title="Cartes" className="mt-6">
        <div className="space-y-3">
          {/* Carte carburant */}
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg border',
            hasCarburant ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800' : 'border-border'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-full',
                hasCarburant ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'
              )}>
                <CreditCard className={cn(
                  'h-4 w-4',
                  hasCarburant ? 'text-emerald-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">Carte carburant</p>
                {hasCarburant && assets.numero_carte_carburant && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {assets.numero_carte_carburant}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={hasCarburant ? 'default' : 'secondary'}>
              {hasCarburant ? 'Oui' : 'Non'}
            </Badge>
          </div>

          {/* Carte bancaire */}
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg border',
            hasBancaire ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800' : 'border-border'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-full',
                hasBancaire ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'
              )}>
                <CreditCard className={cn(
                  'h-4 w-4',
                  hasBancaire ? 'text-emerald-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">Carte bancaire</p>
                {hasBancaire && assets.numero_carte_bancaire && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {assets.numero_carte_bancaire}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={hasBancaire ? 'default' : 'secondary'}>
              {hasBancaire ? 'Oui' : 'Non'}
            </Badge>
          </div>
        </div>
      </DrawerSection>

      {/* Téléphone / Tablette */}
      <DrawerSection title="Téléphonie" className="mt-6">
        {hasPhone ? (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {assets.tablette_telephone}
              </span>
            </div>
            {assets.imei && (
              <p className="text-xs text-muted-foreground font-mono">
                IMEI: {assets.imei}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucun appareil attribué
          </p>
        )}
      </DrawerSection>

      {/* Autres équipements */}
      {assets?.autres_equipements && assets.autres_equipements.length > 0 && (
        <DrawerSection title="Autres équipements" className="mt-6">
          <div className="space-y-2">
            {assets.autres_equipements.map((eq, index) => (
              <div 
                key={eq.id || index}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{eq.nom}</p>
                  {eq.numero_serie && (
                    <p className="text-xs text-muted-foreground">
                      S/N: {eq.numero_serie}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}
    </>
  );
}
