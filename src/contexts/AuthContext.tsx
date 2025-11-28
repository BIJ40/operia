import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { 
  Role, 
  Scope, 
  RolePermission, 
  UserPermission,
  UserCapability,
  EffectivePermission,
  PERMISSION_LEVELS,
  ScopeSlug
} from '@/types/permissions';

interface AuthContextType {
  // État utilisateur
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: User | null;
  
  // Rôles système (anciens - pour compatibilité)
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;
  
  // Nouveau système
  role: Role | null;
  capabilities: UserCapability[];
  scopes: Scope[];
  
  // Anciennes propriétés (compatibilité)
  mustChangePassword: boolean;
  roleAgence: string | null;
  agence: string | null;
  userPermissions: string[];
  isLoggingOut: boolean;
  
  // Helpers de permissions - NOUVEAU SYSTÈME (5 niveaux)
  canViewScope: (scopeSlug: ScopeSlug | string) => boolean;
  canEditScope: (scopeSlug: ScopeSlug | string) => boolean;
  canCreateScope: (scopeSlug: ScopeSlug | string) => boolean;
  canDeleteScope: (scopeSlug: ScopeSlug | string) => boolean;
  canAdminScope: (scopeSlug: ScopeSlug | string) => boolean;
  getEffectivePermission: (scopeSlug: ScopeSlug | string) => EffectivePermission;
  hasCapability: (capability: string) => boolean;
  
  // Anciennes méthodes (compatibilité)
  hasAccessToBlock: (blockId: string) => boolean;
  hasAccessToScope: (scope: string) => boolean;
  canManageTickets: () => boolean;
  
  // Auth
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Rôles système (anciens)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isFranchiseur, setIsFranchiseur] = useState(false);
  
  // Nouveau système
  const [role, setRole] = useState<Role | null>(null);
  const [capabilities, setCapabilities] = useState<UserCapability[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<{ scope_id: string; level: number }[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserPermission[]>([]);
  const [systemRole, setSystemRole] = useState<string | null>(null);
  
  // Anciennes propriétés (compatibilité)
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [agence, setAgence] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Charger les données de permissions
  const loadPermissionsData = useCallback(async (
    userId: string, 
    profileRoleAgence: string | null, 
    profileRoleId: string | null,
    profileGroupId: string | null,
    profileSystemRole: string | null
  ) => {
    try {
      // Sauvegarder le system_role pour le calcul des plafonds
      setSystemRole(profileSystemRole);

      // Charger tous les scopes
      const { data: scopesData, error: scopesError } = await (supabase as any)
        .from('scopes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (!scopesError && scopesData) {
        setScopes(scopesData as Scope[]);
      }

      // Charger les capabilities de l'utilisateur
      const { data: capabilitiesData, error: capError } = await (supabase as any)
        .from('user_capabilities')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (!capError && capabilitiesData) {
        setCapabilities(capabilitiesData as UserCapability[]);
      }

      // Charger le rôle métier si role_id existe
      if (profileRoleId) {
        const { data: roleData, error: roleError } = await (supabase as any)
          .from('roles')
          .select('*')
          .eq('id', profileRoleId)
          .single();
        
        if (!roleError && roleData) {
          setRole(roleData as Role);
        }
      }

      // Charger les permissions du groupe (NOUVEAU SYSTÈME PRIORITAIRE)
      if (profileGroupId) {
        const { data: groupPermsData } = await (supabase as any)
          .from('group_permissions')
          .select('scope_id, level')
          .eq('group_id', profileGroupId);
        
        setGroupPermissions(groupPermsData || []);
      }

      // Charger les permissions du rôle (ancien système pour compatibilité)
      if (profileRoleAgence) {
        const { data: rolePermsData } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role_agence', profileRoleAgence);
        
        setRolePermissions((rolePermsData as unknown as RolePermission[]) || []);
        
        // Pour compatibilité, construire la liste des permissions
        const permsList = rolePermsData
          ?.filter((p: any) => p.can_access || p.can_view)
          .map((p: any) => p.block_id)
          .filter(Boolean) as string[] || [];
        setUserPermissions(permsList);
      }

      // Charger les overrides utilisateur
      const { data: userPermsData } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);
      
      setUserOverrides((userPermsData as unknown as UserPermission[]) || []);

    } catch (error) {
      console.error('Erreur chargement permissions:', error);
    }
  }, []);

  /**
   * Calcule la permission effective pour un scope (5 niveaux)
   * 
   * HIÉRARCHIE (par ordre de priorité) :
   * 1. Override utilisateur : Si existe, appliqué TEL QUEL (sans plafond system_role)
   *    - deny = true → niveau 0
   *    - sinon → override.level (0-4) directement
   * 2. Permission du groupe (NOUVEAU système)
   * 3. Permission du rôle agence (ancien système pour compatibilité)
   * 4. Défaut du scope
   */
  const getEffectivePermission = useCallback((scopeSlug: string): EffectivePermission => {
    const scope = scopes.find(s => s.slug === scopeSlug);
    const defaultLevel = scope?.default_level || PERMISSION_LEVELS.NONE;
    
    // Calculer le plafond du system_role
    const getSystemRoleCeiling = (): number => {
      switch (systemRole) {
        case 'admin': return 4;
        case 'support': return 3;
        case 'utilisateur': return 2;
        case 'visiteur': return 1;
        default: return 2; // Par défaut utilisateur
      }
    };
    const systemRoleCeiling = getSystemRoleCeiling();
    
    // Permission par défaut basée sur le niveau
    const buildPermission = (level: number, source: EffectivePermission['source']): EffectivePermission => ({
      level,
      canView: level >= PERMISSION_LEVELS.VIEW,
      canEdit: level >= PERMISSION_LEVELS.EDIT,
      canCreate: level >= PERMISSION_LEVELS.EDIT,
      canDelete: level >= PERMISSION_LEVELS.MANAGE,
      canAdmin: level >= PERMISSION_LEVELS.ADMIN,
      source
    });

    // Admin système a tous les droits (niveau 4 sur tout)
    if (isAdmin) {
      return buildPermission(PERMISSION_LEVELS.ADMIN, 'default');
    }

    // 1. Chercher l'override utilisateur - PRIORITÉ ABSOLUE (sans plafond)
    const userOverride = userOverrides.find(p => {
      if (p.scope_id && scope) {
        return p.scope_id === scope.id;
      }
      return p.block_id === scopeSlug;
    });

    if (userOverride) {
      // Si deny = true, bloquer totalement
      if (userOverride.deny) {
        return buildPermission(PERMISSION_LEVELS.NONE, 'denied');
      }

      // Appliquer l'override SANS plafond - l'admin peut donner le niveau qu'il veut
      const overrideLevel = Math.max(0, Math.min(4, userOverride.level ?? defaultLevel));
      return buildPermission(overrideLevel, 'user_override');
    }

    // 2. Chercher la permission du groupe (NOUVEAU SYSTÈME PRIORITAIRE)
    if (scope && groupPermissions.length > 0) {
      const groupPerm = groupPermissions.find(p => p.scope_id === scope.id);
      if (groupPerm) {
        // Appliquer le plafond du system_role
        const effectiveLevel = Math.min(groupPerm.level, systemRoleCeiling);
        return buildPermission(effectiveLevel, 'role');
      }
    }

    // 3. Chercher la permission du rôle agence (ancien système)
    const rolePerm = rolePermissions.find(p => {
      if (p.scope_id && scope) {
        return p.scope_id === scope.id;
      }
      return p.block_id === scopeSlug;
    });

    if (rolePerm) {
      // Ancien système: si can_access est true, donner niveau 1 (lecture)
      // Sinon utiliser le niveau défini
      const roleLevel = rolePerm.can_access ? Math.max(1, rolePerm.level ?? 0) : (rolePerm.level ?? PERMISSION_LEVELS.NONE);
      const effectiveLevel = Math.min(roleLevel, systemRoleCeiling);
      return buildPermission(effectiveLevel, 'role');
    }

    // 4. Retourner la permission par défaut du scope (avec plafond)
    const effectiveDefault = Math.min(defaultLevel, systemRoleCeiling);
    return buildPermission(effectiveDefault, 'default');
  }, [scopes, userOverrides, groupPermissions, rolePermissions, isAdmin, systemRole]);

  // Helpers de permissions - mapping générique des niveaux
  // canViewScope   => level >= 1 (Lecture)
  // canEditScope   => level >= 2 (Écriture)
  // canCreateScope => level >= 2 (Écriture)
  // canDeleteScope => level >= 3 (Gestion)
  // canAdminScope  => level >= 4 (Admin)
  
  const canViewScope = useCallback((scopeSlug: string): boolean => {
    if (isAdmin) return true;
    return getEffectivePermission(scopeSlug).canView;
  }, [getEffectivePermission, isAdmin]);

  const canEditScope = useCallback((scopeSlug: string): boolean => {
    if (isAdmin) return true;
    return getEffectivePermission(scopeSlug).canEdit;
  }, [getEffectivePermission, isAdmin]);

  const canCreateScope = useCallback((scopeSlug: string): boolean => {
    if (isAdmin) return true;
    return getEffectivePermission(scopeSlug).canCreate;
  }, [getEffectivePermission, isAdmin]);

  const canDeleteScope = useCallback((scopeSlug: string): boolean => {
    if (isAdmin) return true;
    return getEffectivePermission(scopeSlug).canDelete;
  }, [getEffectivePermission, isAdmin]);

  const canAdminScope = useCallback((scopeSlug: string): boolean => {
    if (isAdmin) return true;
    return getEffectivePermission(scopeSlug).canAdmin;
  }, [getEffectivePermission, isAdmin]);

  const hasCapability = useCallback((capability: string): boolean => {
    if (isAdmin) return true;
    return capabilities.some(c => c.capability === capability && c.is_active);
  }, [capabilities, isAdmin]);

  // Compatibilité avec l'ancien système
  const hasAccessToScope = useCallback((scope: string): boolean => {
    return canViewScope(scope);
  }, [canViewScope]);

  const hasAccessToBlock = useCallback((blockId: string): boolean => {
    if (isAdmin) return true;
    if (!roleAgence) return true;
    
    const perm = getEffectivePermission(blockId);
    return perm.canView;
  }, [isAdmin, roleAgence, getEffectivePermission]);

  const canManageTickets = useCallback((): boolean => {
    return isAdmin || isSupport || isFranchiseur || hasCapability('support');
  }, [isAdmin, isSupport, isFranchiseur, hasCapability]);

  // Charger les données utilisateur
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Charger les rôles système
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const hasAdmin = roles?.some(r => r.role === 'admin') || false;
      const hasSupportRole = roles?.some(r => r.role === 'support') || false;
      const hasFranchiseur = roles?.some(r => r.role === 'franchiseur') || false;
      
      setIsAdmin(hasAdmin);
      setIsSupport(hasSupportRole);
      setIsFranchiseur(hasFranchiseur);

      // Charger le profil complet
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('must_change_password, role_agence, agence, role_id, group_id, system_role')
        .eq('id', userId)
        .single();
      
      setMustChangePassword(profile?.must_change_password || false);
      setRoleAgence(profile?.role_agence || null);
      setAgence(profile?.agence || null);

      // Charger les données de permissions
      await loadPermissionsData(
        userId, 
        profile?.role_agence || null, 
        profile?.role_id || null,
        profile?.group_id || null,
        profile?.system_role || null
      );

    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  }, [loadPermissionsData]);

  useEffect(() => {
    // Flag pour éviter les doubles chargements
    let isLoadingUserData = false;
    let isMounted = true;
    
    /**
     * IMPORTANT: Pattern recommandé par Supabase pour éviter le deadlock
     * - onAuthStateChange ne doit PAS faire d'appels DB synchrones dans son callback
     * - Utiliser setTimeout(0) pour différer les appels DB
     * - Cela permet au callback auth de se terminer avant les requêtes DB
     */
    
    // Fonction d'initialisation - appelée une seule fois au mount
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // DIFFÉRER le chargement des données avec setTimeout pour éviter deadlock
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            setIsAuthLoading(true);
            await loadUserData(session.user.id);
            if (isMounted) {
              setIsAuthLoading(false);
            }
            isLoadingUserData = false;
          }, 0);
        } else {
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    
    // Initialiser d'abord
    init();
    
    // Puis écouter les changements
    // IMPORTANT: Le callback NE DOIT PAS être async pour éviter les deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignorer INITIAL_SESSION car init() gère la session initiale
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        // Mettre à jour l'utilisateur immédiatement (synchrone, pas de deadlock)
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // DIFFÉRER les appels DB avec setTimeout(0) - pattern Supabase recommandé
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            
            isLoadingUserData = true;
            setIsAuthLoading(true);
            
            try {
              await loadUserData(session.user.id);
              if (isMounted) {
                setIsAuthLoading(false);
              }
            } catch (error) {
              console.error('Erreur chargement données utilisateur:', error);
              if (isMounted) {
                setIsAuthLoading(false);
              }
            }
            
            isLoadingUserData = false;
          }, 0);
        } else {
          // Reset synchrone - pas de risque de deadlock
          setIsAdmin(false);
          setIsSupport(false);
          setIsFranchiseur(false);
          setMustChangePassword(false);
          setRoleAgence(null);
          setAgence(null);
          setUserPermissions([]);
          setRole(null);
          setCapabilities([]);
          setScopes([]);
          setRolePermissions([]);
          setGroupPermissions([]);
          setUserOverrides([]);
          setSystemRole(null);
          setIsAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      console.error('Erreur connexion:', err);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await supabase.auth.signOut();

      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => localStorage.removeItem(key));

      localStorage.removeItem('editMode');
      
      // Reset tous les états
      setIsAdmin(false);
      setIsSupport(false);
      setIsFranchiseur(false);
      setMustChangePassword(false);
      setRoleAgence(null);
      setAgence(null);
      setUserPermissions([]);
      setRole(null);
      setCapabilities([]);
      setScopes([]);
      setRolePermissions([]);
      setGroupPermissions([]);
      setUserOverrides([]);
      setSystemRole(null);
      setUser(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user,
      isAuthLoading,
      user,
      isAdmin,
      isSupport,
      isFranchiseur,
      role,
      capabilities,
      scopes,
      mustChangePassword,
      roleAgence,
      agence,
      userPermissions,
      isLoggingOut,
      // Nouveaux helpers (5 niveaux)
      canViewScope,
      canEditScope,
      canCreateScope,
      canDeleteScope,
      canAdminScope,
      getEffectivePermission,
      hasCapability,
      // Compatibilité
      hasAccessToBlock,
      hasAccessToScope,
      canManageTickets,
      login, 
      logout,
      signup 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
