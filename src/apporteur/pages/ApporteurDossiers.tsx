/**
 * ApporteurDossiers - Liste des dossiers de l'apporteur
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, Filter, RefreshCw } from 'lucide-react';

export default function ApporteurDossiers() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Mes dossiers
          </h1>
          <p className="text-muted-foreground">
            Suivez l'avancement de vos dossiers en cours
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtres
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucun dossier trouvé
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Les dossiers liés à votre organisation apporteur apparaîtront ici.
              Créez une demande d'intervention pour commencer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
