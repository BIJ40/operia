/**
 * Contenu de l'onglet Véhicules - Gestion du parc véhicules
 */
import { Car, Plus, Search, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function VehiculesTabContent() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-4">
      {/* Header avec actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un véhicule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un véhicule
          </Button>
        </div>
      </div>

      {/* Placeholder - À remplacer par le vrai contenu */}
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Car className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle>Gestion du parc véhicules</CardTitle>
          <CardDescription>
            Cette section permettra de gérer l'ensemble des véhicules de l'agence : 
            immatriculation, kilométrage, entretiens, contrôles techniques, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Le contenu de l'onglet Parc & Matériel sera intégré ici prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
