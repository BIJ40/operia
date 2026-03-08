import { Outlet, Navigate } from "react-router-dom";
import { FranchiseurProvider, useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { NetworkFiltersProvider } from "@/franchiseur/contexts/NetworkFiltersContext";
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { logDebug } from "@/lib/logger";

function FranchiseurLayoutContent() {
  const { franchiseurRole, isLoading } = useFranchiseur();
  const { hasGlobalRole, isAuthLoading } = useAuth();
  
  const isPlatformAdmin = hasGlobalRole('platform_admin');

  // Wait for both AuthContext AND FranchiseurContext to finish loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Only redirect after both contexts have finished loading
  if (!franchiseurRole && !isPlatformAdmin) {
    logDebug('FRANCHISEUR_LAYOUT', 'Redirecting - no franchiseur role and not admin', {
      franchiseurRole,
      isPlatformAdmin,
      isAuthLoading,
      isLoading
    });
    return <Navigate to="/" replace />;
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
    logDebug('FRANCHISEUR_LAYOUT', 'Main layout redirect - user not authorized', {
      hasUser: !!user,
      isFranchiseur,
      isPlatformAdmin
    });
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
