import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { logError } from "@/lib/logger";
import { FileQuestion, Home } from "lucide-react";
import { WarmPageContainer } from "@/components/ui/warm-page-container";
import { WarmEmptyState } from "@/components/ui/warm-empty-state";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logError("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <WarmPageContainer maxWidth="lg" className="min-h-screen flex items-center justify-center">
      <WarmEmptyState
        icon={FileQuestion}
        title="Page introuvable"
        description="Oups ! La page que vous cherchez n'existe pas ou a été déplacée."
        accentColor="orange"
        action={{
          label: "Retour à l'accueil",
          onClick: () => window.location.href = '/',
        }}
        footer="Erreur 404"
      />
    </WarmPageContainer>
  );
};

export default NotFound;
