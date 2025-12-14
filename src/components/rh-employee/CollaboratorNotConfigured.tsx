/**
 * Composant affiché quand l'utilisateur n'a pas de profil collaborateur lié
 */
import { AlertCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function CollaboratorNotConfigured() {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="font-semibold text-lg text-orange-800 mb-2">
          Profil non configuré
        </h3>
        <p className="text-orange-700 text-sm max-w-md">
          Votre compte utilisateur n'est pas encore lié à un profil collaborateur.
          Veuillez contacter votre responsable RH pour configurer votre accès.
        </p>
        <div className="mt-4 flex items-center gap-2 text-orange-600 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>Cette liaison est nécessaire pour accéder à vos documents et demandes.</span>
        </div>
      </CardContent>
    </Card>
  );
}