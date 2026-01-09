/**
 * Page Matériel Technicien Mobile
 */
import { Package, ArrowLeft, Laptop, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { useMyEquipment } from "@/hooks/rh-employee/useMyEquipment";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";

export default function TechMaterielPage() {
  const { data: collaborator, isLoading: loadingCollab } = useMyCollaborator();
  const { data: equipment, isLoading: loadingEquipment } = useMyEquipment();

  if (loadingCollab || loadingEquipment) {
    return <div className="p-4 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  }

  if (!collaborator) {
    return <div className="p-4 space-y-4"><Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><CollaboratorNotConfigured /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold flex-1">Mon matériel</h1>
        {equipment?.length ? <Badge variant="secondary">{equipment.length}</Badge> : null}
      </div>
      {!equipment?.length ? (
        <Card><CardContent className="py-12 text-center"><Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Aucun matériel assigné</p></CardContent></Card>
      ) : (
        <div className="space-y-2">{equipment.map((item) => (
          <Card key={item.id}><CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded ${item.categorie === 'informatique' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
              {item.categorie === 'informatique' ? <Laptop className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            </div>
            <div className="flex-1"><p className="font-medium text-sm">{item.nom}</p>{item.numero_serie && <p className="text-xs text-muted-foreground font-mono">{item.numero_serie}</p>}</div>
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}
