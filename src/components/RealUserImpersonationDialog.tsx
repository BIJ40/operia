/**
 * RealUserImpersonationDialog - Dialog pour sélectionner un utilisateur réel
 * 
 * Permet aux admins (N5+) de voir l'application comme un utilisateur spécifique
 * en chargeant ses vraies données (rôle, modules, agence).
 * 
 * Protégé par MfaGuard — nécessite AAL2 si MFA enforced.
 */

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, Eye, Building2, Shield, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { cn } from '@/lib/utils';
import { MfaGuard } from '@/components/auth/MfaGuard';

interface UserResult {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  global_role: GlobalRole | null;
  agency_id: string | null;
  role_agence: string | null;
}

interface RealUserImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<GlobalRole, string> = {
  base_user: 'Partenaire externe (N0)',
  franchisee_user: 'Utilisateur agence (N1)',
  franchisee_admin: 'Dirigeant agence (N2)',
  franchisor_user: 'Animateur réseau (N3)',
  franchisor_admin: 'Directeur réseau (N4)',
  platform_admin: 'Admin plateforme (N5)',
  superadmin: 'Super Admin (N6)',
};

// Modules are now loaded via RPC in startRealUserImpersonation, not from search results

export function RealUserImpersonationDialog({ open, onOpenChange }: RealUserImpersonationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const { startRealUserImpersonation, isLoadingRealUser } = useImpersonation();

  // Rechercher les utilisateurs
  const { data: users = [], isLoading: isSearching } = useQuery({
    queryKey: ['impersonation-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, global_role, agency_id, role_agence')
        .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(20);
      
      if (error) {
        console.error('[IMPERSONATION] Search error:', error);
        return [];
      }
      
      return (data || []) as UserResult[];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSelectUser = useCallback((user: UserResult) => {
    setSelectedUser(user);
  }, []);

  const handleStartImpersonation = useCallback(async () => {
    if (!selectedUser) return;
    
    const success = await startRealUserImpersonation(selectedUser.id);
    if (success) {
      onOpenChange(false);
      setSelectedUser(null);
      setSearchQuery('');
    }
  }, [selectedUser, startRealUserImpersonation, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSelectedUser(null);
    setSearchQuery('');
  }, [onOpenChange]);

  // Modules are resolved server-side during impersonation start

  const selectedRoleLabel = useMemo(() => {
    if (!selectedUser?.global_role) return 'Non défini';
    return ROLE_LABELS[selectedUser.global_role] || selectedUser.global_role;
  }, [selectedUser]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <MfaGuard>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Voir en tant qu'utilisateur
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un utilisateur pour voir l'application comme lui. Cette fonctionnalité est en lecture seule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="space-y-2">
            <Label htmlFor="user-search">Rechercher un utilisateur</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Email ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Résultats de recherche */}
          {searchQuery.length >= 2 && (
            <ScrollArea className="h-[200px] border rounded-md">
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {users.map((user) => {
                    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
                    const isSelected = selectedUser?.id === user.id;
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={cn(
                          "w-full p-2 rounded-md text-left transition-colors flex items-center gap-3",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          isSelected ? "bg-primary-foreground/20" : "bg-muted"
                        )}>
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {fullName || user.email?.split('@')[0] || 'Utilisateur'}
                          </p>
                          <p className={cn(
                            "text-xs truncate",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            {user.email}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}

          {/* Prévisualisation utilisateur sélectionné */}
          {selectedUser && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Utilisateur'}
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedRoleLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedUser.agence || 'Aucune agence'}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Les modules seront chargés lors de l'impersonation
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleStartImpersonation}
            disabled={!selectedUser || isLoadingRealUser}
          >
            {isLoadingRealUser ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Voir en tant que {selectedUser?.first_name || 'cet utilisateur'}
              </>
            )}
          </Button>
        </DialogFooter>
        </MfaGuard>
      </DialogContent>
    </Dialog>
  );
}