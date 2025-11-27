import { useImpersonation, ROLE_AGENCE_OPTIONS, FRANCHISEUR_ROLE_OPTIONS } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { X, Eye, BarChart3, Headset, Network } from 'lucide-react';

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
          <span className="text-sm flex items-center gap-2 flex-wrap">
            — Rôle: <strong>{roleAgenceLabel}</strong>
            {impersonatedProfile.agence && (
              <>, Agence: <strong>{impersonatedProfile.agence}</strong></>
            )}
            {franchiseurRoleLabel && franchiseurRoleLabel !== 'Aucun' && (
              <span className="inline-flex items-center gap-1 bg-amber-600/30 px-2 py-0.5 rounded">
                <Network className="h-3 w-3" />
                <strong>{franchiseurRoleLabel}</strong>
              </span>
            )}
            {impersonatedProfile.hasSupportRole && (
              <span className="inline-flex items-center gap-1 bg-amber-600/30 px-2 py-0.5 rounded">
                <Headset className="h-3 w-3" />
                Support
              </span>
            )}
            {impersonatedProfile.hasIndicateursAccess && (
              <span className="inline-flex items-center gap-1 bg-amber-600/30 px-2 py-0.5 rounded">
                <BarChart3 className="h-3 w-3" />
                Indicateurs
              </span>
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
          Arrêter
        </Button>
      </div>
    </div>
  );
}
