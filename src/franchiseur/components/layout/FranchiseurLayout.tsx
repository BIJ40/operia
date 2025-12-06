import { Outlet, Navigate } from "react-router-dom";
import { FranchiseurProvider, useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { NetworkFiltersProvider } from "@/franchiseur/contexts/NetworkFiltersContext";
import { useAuth } from "@/contexts/AuthContext";

function FranchiseurLayoutContent() {
  const { franchiseurRole, isLoading } = useFranchiseur();
  const { hasGlobalRole } = useAuth();
  
  const isPlatformAdmin = hasGlobalRole('platform_admin');

  // Redirect if no franchiseur role and not admin
  if (!isLoading && !franchiseurRole && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default function FranchiseurLayout() {
  const { user, isFranchiseur, hasGlobalRole, isAuthLoading } = useAuth();
  
  const isPlatformAdmin = hasGlobalRole('platform_admin');

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Chargement de votre session...</p>
      </div>
    );
  }

  if (!user || (!isFranchiseur && !isPlatformAdmin)) {
    return <Navigate to="/" replace />;
  }

  return (
    <FranchiseurProvider>
      <NetworkFiltersProvider>
        <FranchiseurLayoutContent />
      </NetworkFiltersProvider>
    </FranchiseurProvider>
  );
}
