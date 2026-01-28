/**
 * Contenu de l'onglet Divers - Réunions et autres fonctionnalités
 */
import { Presentation, FileEdit, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { Link } from "react-router-dom";

export default function DiversTabContent() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Réunions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-2">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-lg">Réunions</CardTitle>
            <CardDescription>
              Historique et gestion des réunions d'équipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link to={ROUTES.rh.reunions}>
                Accéder aux réunions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* DocGen - masqué pour le moment */}
        <Card className="hover:shadow-md transition-shadow opacity-60">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-2">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-lg">DocGen</CardTitle>
            <CardDescription>
              Génération automatique de documents RH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>

        {/* Paramètres RH */}
        <Card className="hover:shadow-md transition-shadow opacity-60">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center mb-2">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-lg">Paramètres</CardTitle>
            <CardDescription>
              Configuration du module RH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Bientôt disponible
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
