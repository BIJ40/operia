/**
 * Onglet Essentiel - Infos de base
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}

export function RHTabEssentiel({ collaborator }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Nom" value={collaborator.last_name} />
          <InfoRow label="Prénom" value={collaborator.first_name} />
          <InfoRow label="Email professionnel" value={collaborator.email} />
          <InfoRow label="Téléphone professionnel" value={collaborator.phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emploi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Métier / Fonction" value={collaborator.type} />
          <InfoRow label="Rôle" value={collaborator.role} />
          <InfoRow 
            label="Date d'entrée" 
            value={collaborator.hiring_date 
              ? format(new Date(collaborator.hiring_date), 'dd MMMM yyyy', { locale: fr })
              : null
            } 
          />
          <InfoRow 
            label="Date de sortie" 
            value={collaborator.leaving_date 
              ? format(new Date(collaborator.leaving_date), 'dd MMMM yyyy', { locale: fr })
              : null
            } 
          />
        </CardContent>
      </Card>

      {collaborator.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {collaborator.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
