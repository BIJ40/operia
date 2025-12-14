/**
 * Page Matériel & EPI
 * Route: /rh/epi
 */

import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HardHat, Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Placeholder pour le futur développement
interface EPIItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  assignedTo?: string;
  expirationDate?: string;
  status: 'ok' | 'expiring' | 'expired';
}

export default function EPIPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Placeholder - données vides pour l'instant
  const epiItems: EPIItem[] = [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Matériel & EPI"
        subtitle="Gestion du matériel et des équipements de protection individuelle"
        backTo={ROUTES.rh.index}
        backLabel="RH & PARC"
      />

      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un équipement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un équipement
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-helpconfort-blue/10">
              <Package className="h-6 w-6 text-helpconfort-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Équipements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-helpconfort-orange/10">
              <HardHat className="h-6 w-6 text-helpconfort-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">EPI attribués</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">À renouveler</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des équipements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Liste des équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {epiItems.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Aucun équipement enregistré
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par ajouter vos équipements et EPI pour les suivre et les attribuer aux techniciens.
              </p>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter le premier équipement
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Future: Table des équipements */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
