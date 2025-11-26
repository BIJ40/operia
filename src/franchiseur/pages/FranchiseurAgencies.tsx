import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgencyList } from "../hooks/useAgencyList";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FranchiseurAgencies() {
  const { data: agencies, isLoading } = useAgencyList();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredAgencies = agencies?.filter(agency =>
    agency.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement des agences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Gestion des Agences
        </h1>
        <p className="text-muted-foreground mt-2">
          Liste et détails de toutes les agences du réseau
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une agence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-l-4 border-l-accent"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies?.map((agency) => (
          <Card
            key={agency.id}
            className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate(`/tete-de-reseau/agences/${agency.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {agency.label}
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Slug: {agency.slug}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgencies?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Aucune agence trouvée
          </p>
        </div>
      )}
    </div>
  );
}
