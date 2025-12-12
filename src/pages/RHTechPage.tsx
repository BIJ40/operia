import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";

export default function RHTechPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="RH Techniciens"
        subtitle="Gestion des plannings et ressources humaines des techniciens"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Planning Hebdomadaire */}
        <Link to={ROUTES.pilotage.planningHebdo}>
          <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Planning Hebdomadaire</CardTitle>
                  <CardDescription>Visualiser et valider les plannings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consultez les plannings de la semaine et validez les heures des techniciens.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder pour futures fonctionnalités */}
        <Card className="h-full opacity-50 cursor-not-allowed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg text-muted-foreground">Équipe Technique</CardTitle>
                <CardDescription>Bientôt disponible</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gérez votre équipe de techniciens.
            </p>
          </CardContent>
        </Card>

        <Card className="h-full opacity-50 cursor-not-allowed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg text-muted-foreground">Heures & Absences</CardTitle>
                <CardDescription>Bientôt disponible</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Suivi des heures et gestion des absences.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
