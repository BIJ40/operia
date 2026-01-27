/**
 * Contenu du drawer Compétences pour le Cockpit RH
 */

import React from 'react';
import { DrawerSection, DrawerField } from './RHCockpitDrawer';
import { RHCollaborator } from '@/types/rh-suivi';
import { Award, Zap, Truck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RHCockpitDrawerCompetencesProps {
  collaborator: RHCollaborator;
  onUpdate?: () => void;
}

export function RHCockpitDrawerCompetences({ collaborator, onUpdate }: RHCockpitDrawerCompetencesProps) {
  const competencies = collaborator.competencies;
  
  // Compter les compétences
  const habElec = competencies?.habilitation_electrique_statut;
  const cacesCount = competencies?.caces?.length || 0;
  const techCount = competencies?.competences_techniques?.length || 0;
  const totalCount = (habElec ? 1 : 0) + cacesCount + techCount;

  return (
    <>
      {/* Résumé */}
      <DrawerSection>
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          totalCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800/50'
        )}>
          <Award className={cn(
            'h-5 w-5',
            totalCount > 0 ? 'text-emerald-600' : 'text-slate-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            totalCount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
          )}>
            {totalCount > 0 
              ? `${totalCount} compétence(s) enregistrée(s)` 
              : 'Aucune compétence renseignée'}
          </span>
        </div>
      </DrawerSection>

      {/* Habilitation électrique */}
      <DrawerSection title="Habilitation électrique" className="mt-6">
        {habElec ? (
          <div className={cn(
            'p-4 rounded-lg border',
            'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">{habElec}</p>
                {competencies?.habilitation_electrique_date && (
                  <p className="text-xs text-muted-foreground">
                    Obtenue le {formatDate(competencies.habilitation_electrique_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucune habilitation électrique
          </p>
        )}
      </DrawerSection>

      {/* CACES */}
      <DrawerSection title="CACES" className="mt-6">
        {cacesCount > 0 ? (
          <div className="space-y-2">
            {competencies?.caces?.map((caces, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{caces.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(caces.date)}
                  </p>
                  {caces.expiration && (
                    <p className="text-xs text-amber-600">
                      Expire: {formatDate(caces.expiration)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucun CACES
          </p>
        )}
      </DrawerSection>

      {/* Compétences techniques */}
      <DrawerSection title="Compétences techniques" className="mt-6">
        {techCount > 0 ? (
          <div className="flex flex-wrap gap-2">
            {competencies?.competences_techniques?.map((comp, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                <Wrench className="h-3 w-3 mr-1" />
                {comp}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucune compétence technique renseignée
          </p>
        )}
      </DrawerSection>

      {/* Autres habilitations */}
      {competencies?.autres_habilitations && competencies.autres_habilitations.length > 0 && (
        <DrawerSection title="Autres habilitations" className="mt-6">
          <div className="space-y-2">
            {competencies.autres_habilitations.map((hab, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <span className="text-sm font-medium">{hab.nom}</span>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(hab.date)}
                  </p>
                  {hab.expiration && (
                    <p className="text-xs text-amber-600">
                      Expire: {formatDate(hab.expiration)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}

      {/* Dernière mise à jour */}
      {competencies?.derniere_maj && (
        <p className="mt-6 text-xs text-muted-foreground text-center">
          Dernière mise à jour : {formatDate(competencies.derniere_maj)}
        </p>
      )}
    </>
  );
}

// Helper pour formater les dates
function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}
