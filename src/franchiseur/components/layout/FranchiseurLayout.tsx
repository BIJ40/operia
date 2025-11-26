import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FranchiseurSidebar } from "./FranchiseurSidebar";
import { FranchiseurProvider, useFranchiseur } from "@/franchiseur/contexts/FranchiseurContext";
import { NetworkFiltersProvider } from "@/franchiseur/contexts/NetworkFiltersContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

function FranchiseurLayoutContent() {
  const { franchiseurRole, isLoading } = useFranchiseur();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !franchiseurRole && !isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous devez avoir un rôle franchiseur pour accéder à cette section",
        variant: "destructive",
      });
    }
  }, [franchiseurRole, isLoading, isAdmin, toast]);

  // Redirect if no franchiseur role and not admin
  if (!isLoading && !franchiseurRole && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <FranchiseurSidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function FranchiseurLayout() {
  const { user, isFranchiseur, isAdmin, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement de votre session...</p>
      </div>
    );
  }

  if (!user || (!isFranchiseur && !isAdmin)) {
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
