/**
 * Page "Mon Matériel" pour les collaborateurs N1
 * Affiche le matériel informatique et outils assignés (lecture seule)
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { useMyEquipment, type MyEquipmentItem } from "@/hooks/rh-employee/useMyEquipment";
import { 
  Laptop, 
  Wrench, 
  Package, 
  AlertCircle,
  Hash
} from "lucide-react";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { PageHeader } from "@/components/layout/PageHeader";

interface EquipmentCardProps {
  equipment: MyEquipmentItem;
}

function EquipmentCard({ equipment }: EquipmentCardProps) {
  const isIT = equipment.categorie === 'informatique';
  const Icon = isIT ? Laptop : Wrench;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isIT ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">{equipment.nom}</CardTitle>
          </div>
          <Badge variant={isIT ? "default" : "secondary"}>
            {isIT ? 'Informatique' : 'Outillage'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {equipment.numero_serie && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{equipment.numero_serie}</span>
          </div>
        )}
        {equipment.imei && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-medium">IMEI:</span>
            <span className="font-mono text-xs">{equipment.imei}</span>
          </div>
        )}
        {equipment.notes && (
          <p className="text-muted-foreground text-xs mt-2 italic">
            {equipment.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MonMaterielContent() {
  const { data: collaborator, isLoading: loadingCollab } = useMyCollaborator();
  const { data: equipment, isLoading: loadingEquipment } = useMyEquipment();

  // Loading state
  if (loadingCollab || loadingEquipment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mon Matériel"
          subtitle="Chargement..."
          backTo="/rh"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // No collaborator linked
  if (!collaborator) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mon Matériel"
          subtitle="Configuration requise"
          backTo="/rh"
        />
        <CollaboratorNotConfigured />
      </div>
    );
  }

  const itEquipment = equipment?.filter(e => e.categorie === 'informatique') || [];
  const toolEquipment = equipment?.filter(e => e.categorie === 'outils') || [];
  const hasEquipment = (equipment?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Mon Matériel"
        subtitle="Équipements informatiques et outillage qui vous sont assignés"
        backTo="/rh"
      />

      {!hasEquipment ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucun matériel assigné</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Aucun équipement informatique ou outillage ne vous est actuellement assigné.
              Contactez votre responsable RH si vous pensez qu'il manque du matériel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* IT Equipment Section */}
          {itEquipment.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Matériel Informatique</h2>
                <Badge variant="outline" className="ml-2">{itEquipment.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {itEquipment.map((item) => (
                  <EquipmentCard key={item.id} equipment={item} />
                ))}
              </div>
            </div>
          )}

          {/* Tools Section */}
          {toolEquipment.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Outillage</h2>
                <Badge variant="outline" className="ml-2">{toolEquipment.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {toolEquipment.map((item) => (
                  <EquipmentCard key={item.id} equipment={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info notice */}
      <Card className="bg-muted/50 border-none">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Information</p>
            <p>
              Cette liste reflète le matériel qui vous est officiellement assigné.
              Pour toute modification ou demande, contactez votre responsable RH.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MonMaterielPage() {
  return <MonMaterielContent />;
}
