import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";

export default function FranchiseurRoyalties() {
  const navigate = useNavigate();
  const { canViewScope, isAdmin, isFranchiseur } = usePermissions();
  
  // Guard: vérifier l'accès aux redevances
  const canView = canViewScope('franchiseur_royalties');
  
  useEffect(() => {
    if (!canView && !isAdmin && !isFranchiseur) {
      navigate('/');
    }
  }, [canView, isAdmin, isFranchiseur, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Gestion des Redevances
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcul et suivi mensuel des redevances par agence
        </p>
      </div>

      <div className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
        <p className="text-muted-foreground">
          Page de gestion des redevances - À implémenter
        </p>
      </div>
    </div>
  );
}
