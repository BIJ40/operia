import { useParams } from "react-router-dom";

export default function FranchiseurAgencyProfile() {
  const { agencyId } = useParams<{ agencyId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Profil Agence
        </h1>
        <p className="text-muted-foreground mt-2">
          Détails et statistiques de l'agence
        </p>
      </div>

      <div className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
        <p className="text-muted-foreground">
          Profil agence {agencyId} - À implémenter
        </p>
      </div>
    </div>
  );
}
