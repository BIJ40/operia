/**
 * SupportConsoleGuard - Protection spécifique pour la console de support
 * 
 * P1.2 - Option B, P2.1 - Sémantique clarifiée
 * Accessible aux utilisateurs avec support.agent=true + N5+
 * Logique: canAccessSupportConsoleUI = hasSupportAgentRole || isPlatformAdmin
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';

interface SupportConsoleGuardProps {
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé (défaut: /) */
  redirectTo?: string;
  /** Afficher une page d'erreur au lieu de rediriger */
  showError?: boolean;
  /** Message d'erreur personnalisé */
  errorMessage?: string;
}

/**
 * Guard de route pour la console de support
 * 
 * P1.2 - Vérifie canAccessSupportConsole (support.agent=true OU N5+)
 * 
 * @example
 * <SupportConsoleGuard>
 *   <AdminSupportTickets />
 * </SupportConsoleGuard>
 */
export function SupportConsoleGuard({ 
  children, 
  redirectTo = '/',
  showError = false,
  errorMessage = "L'accès à la console de support est réservé aux agents support et administrateurs plateforme."
}: SupportConsoleGuardProps) {
  const { user, isAuthLoading, canAccessSupportConsoleUI } = useAuth();

  // Afficher un loader pendant le chargement
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Vérification des permissions...</span>
      </div>
    );
  }

  // Rediriger vers home si non authentifié
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Vérifier l'accès à la console de support
  if (!canAccessSupportConsoleUI) {
    if (showError) {
      return <AccessDeniedPage message={errorMessage} />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Page d'accès refusé
 */
function AccessDeniedPage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
        <ShieldX className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Accès refusé à la console de support
      </h1>
      <p className="text-muted-foreground text-center max-w-md">
        {message}
      </p>
    </div>
  );
}

export default SupportConsoleGuard;
