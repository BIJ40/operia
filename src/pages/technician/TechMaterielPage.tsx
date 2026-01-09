/**
 * Page Mon Matériel - Équipements & outils du technicien
 */
import { Link } from 'react-router-dom';
import { Wrench, ChevronLeft, Loader2, Package, Laptop, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyEquipment } from '@/hooks/rh-employee/useMyEquipment';

export default function TechMaterielPage() {
  const { data: equipment = [], isLoading } = useMyEquipment();

  return (
    <div className="p-4 space-y-4">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Mon matériel</h1>
          <p className="text-xs text-muted-foreground">Équipements & outils</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : equipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Aucun matériel assigné</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map((item) => {
            const isIT = item.categorie === 'informatique';
            return (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isIT ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {isIT ? <Laptop className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.nom}</div>
                      {item.numero_serie && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{item.numero_serie}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={isIT ? 'default' : 'secondary'} className="text-[10px]">
                      {isIT ? 'IT' : 'Outil'}
                    </Badge>
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
