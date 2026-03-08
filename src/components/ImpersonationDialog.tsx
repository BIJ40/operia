import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useImpersonation, ROLE_AGENCE_OPTIONS, FRANCHISEUR_ROLE_OPTIONS, type ImpersonatedProfile } from '@/contexts/ImpersonationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Info } from 'lucide-react';
import { MfaGuard } from '@/components/auth/MfaGuard';

interface ImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpersonationDialog({ open, onOpenChange }: ImpersonationDialogProps) {
  const { startImpersonation } = useImpersonation();
  
  const [roleAgence, setRoleAgence] = useState<string>('dirigeant');
  const [franchiseurRole, setFranchiseurRole] = useState<string>('animateur');
  const [agence, setAgence] = useState<string>('');
  const [hasIndicateursAccess, setHasIndicateursAccess] = useState(true);
  const [hasSupportRole, setHasSupportRole] = useState(false);

  // Déterminer si c'est un rôle "Tête de réseau" (franchiseur)
  const isTeteDeReseau = roleAgence === 'tete_de_reseau';

  // Appliquer les règles automatiques quand le rôle change
  useEffect(() => {
    if (isTeteDeReseau) {
      // Tête de réseau = franchiseur + support automatiquement, MAIS pas d'indicateurs (pas d'agence)
      setHasSupportRole(true);
      setHasIndicateursAccess(false); // Pas d'agence = pas d'indicateurs
      setAgence(''); // Pas d'agence de rattachement
      if (franchiseurRole === 'none') {
        setFranchiseurRole('animateur'); // Par défaut animateur
      }
    } else {
      // Autres rôles
      setFranchiseurRole('none');
      // Dirigeant a accès indicateurs par défaut, pas les autres
      setHasIndicateursAccess(roleAgence === 'dirigeant');
      setHasSupportRole(false);
    }
  }, [roleAgence, isTeteDeReseau]);

  // Charger les agences
  const { data: agencies } = useQuery({
    queryKey: ['agencies-for-impersonation'],
    queryFn: async () => {
      const { data } = await supabase
        .from('apogee_agencies')
        .select('slug, label')
        .eq('is_active', true)
        .order('label');
      return data || [];
    },
  });

  const handleStart = () => {
    const profile: ImpersonatedProfile = {
      roleAgence: roleAgence || null,
      franchiseurRole: isTeteDeReseau && franchiseurRole !== 'none' 
        ? franchiseurRole as 'animateur' | 'directeur' | 'dg' 
        : null,
      agence: isTeteDeReseau ? null : (agence || null),
      hasIndicateursAccess,
      hasSupportRole: isTeteDeReseau ? true : hasSupportRole,
      hasFranchiseurRole: isTeteDeReseau,
    };
    startImpersonation(profile);
    onOpenChange(false);
  };

  // Filtrer les options franchiseur pour exclure "Aucun" si tête de réseau
  const franchiseurOptions = isTeteDeReseau 
    ? FRANCHISEUR_ROLE_OPTIONS.filter(opt => opt.value !== null)
    : FRANCHISEUR_ROLE_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
        <MfaGuard>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Voir en tant que...
          </DialogTitle>
          <DialogDescription>
            Simulez les permissions d'un autre profil utilisateur. Les données restent celles de votre compte admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rôle agence */}
          <div className="space-y-2">
            <Label>Poste occupé (rôle agence)</Label>
            <Select value={roleAgence} onValueChange={setRoleAgence}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_AGENCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message informatif pour Tête de réseau */}
          {isTeteDeReseau && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <span className="text-amber-800 dark:text-amber-300">
                Le rôle "Tête de réseau" attribue automatiquement les rôles Franchiseur et Support, sans agence de rattachement.
              </span>
            </div>
          )}

          {/* Agence - seulement si pas Tête de réseau */}
          {!isTeteDeReseau && (
            <div className="space-y-2">
              <Label>Agence de rattachement</Label>
              <Select value={agence} onValueChange={setAgence}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une agence" />
                </SelectTrigger>
                <SelectContent>
                  {agencies?.map(a => (
                    <SelectItem key={a.slug} value={a.slug}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rôle franchiseur - seulement si Tête de réseau */}
          {isTeteDeReseau && (
            <div className="space-y-2">
              <Label>Niveau franchiseur</Label>
              <Select value={franchiseurRole} onValueChange={setFranchiseurRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {franchiseurOptions.map(opt => (
                    <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Accès indicateurs */}
          <div className="flex items-center justify-between">
            <Label htmlFor="indicateurs-access" className="cursor-pointer">
              Accès Mes indicateurs
            </Label>
            <Switch
              id="indicateurs-access"
              checked={hasIndicateursAccess}
              onCheckedChange={setHasIndicateursAccess}
            />
          </div>

          {/* Rôle support - seulement si pas Tête de réseau */}
          {!isTeteDeReseau && (
            <div className="flex items-center justify-between">
              <Label htmlFor="support-role" className="cursor-pointer">
                Rôle Support
              </Label>
              <Switch
                id="support-role"
                checked={hasSupportRole}
                onCheckedChange={setHasSupportRole}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleStart} className="gap-2">
            <Eye className="h-4 w-4" />
            Démarrer la simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
