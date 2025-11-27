import { useImpersonation, ROLE_AGENCE_OPTIONS, FRANCHISEUR_ROLE_OPTIONS } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedProfile, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedProfile) return null;

  const roleAgenceLabel = ROLE_AGENCE_OPTIONS.find(r => r.value === impersonatedProfile.roleAgence)?.label || impersonatedProfile.roleAgence;
  const franchiseurRoleLabel = FRANCHISEUR_ROLE_OPTIONS.find(r => r.value === impersonatedProfile.franchiseurRole)?.label;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <span className="font-medium">Mode simulation actif</span>
          <span className="text-sm">
            — Rôle: <strong>{roleAgenceLabel}</strong>
            {impersonatedProfile.agence && (
              <>, Agence: <strong>{impersonatedProfile.agence}</strong></>
            )}
            {franchiseurRoleLabel && franchiseurRoleLabel !== 'Aucun' && (
              <>, Franchiseur: <strong>{franchiseurRoleLabel}</strong></>
            )}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={stopImpersonation}
          className="gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900"
        >
          <X className="h-4 w-4" />
          Arrêter la simulation
        </Button>
      </div>
    </div>
  );
}
