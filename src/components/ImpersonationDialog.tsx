import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useImpersonation, ROLE_AGENCE_OPTIONS, FRANCHISEUR_ROLE_OPTIONS, type ImpersonatedProfile } from '@/contexts/ImpersonationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye } from 'lucide-react';

interface ImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpersonationDialog({ open, onOpenChange }: ImpersonationDialogProps) {
  const { startImpersonation } = useImpersonation();
  
  const [roleAgence, setRoleAgence] = useState<string>('dirigeant');
  const [franchiseurRole, setFranchiseurRole] = useState<string>('none');
  const [agence, setAgence] = useState<string>('');
  const [hasIndicateursAccess, setHasIndicateursAccess] = useState(true);
  const [hasSupportRole, setHasSupportRole] = useState(false);
  const [hasFranchiseurRole, setHasFranchiseurRole] = useState(false);

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
      franchiseurRole: franchiseurRole === 'none' ? null : franchiseurRole as 'animateur' | 'directeur' | 'dg',
      agence: agence || null,
      hasIndicateursAccess,
      hasSupportRole,
      hasFranchiseurRole: franchiseurRole !== 'none',
    };
    startImpersonation(profile);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {/* Agence */}
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

          {/* Rôle franchiseur */}
          <div className="space-y-2">
            <Label>Rôle franchiseur</Label>
            <Select value={franchiseurRole} onValueChange={setFranchiseurRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {FRANCHISEUR_ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Rôle support */}
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
