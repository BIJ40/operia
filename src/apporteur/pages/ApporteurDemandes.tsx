/**
 * ApporteurDemandes - Historique des demandes de l'apporteur
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, PlusCircle, Clock } from 'lucide-react';

export default function ApporteurDemandes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Mes demandes
          </h1>
          <p className="text-muted-foreground">
            Historique de vos demandes d'intervention
          </p>
        </div>
        <Button onClick={() => navigate('/apporteur/nouvelle-demande')} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une demande..."
          className="pl-10 max-w-md"
        />
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucune demande
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Vous n'avez pas encore créé de demande d'intervention.
            </p>
            <Button onClick={() => navigate('/apporteur/nouvelle-demande')} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Créer ma première demande
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
