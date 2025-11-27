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
  
  // Helpers de permissions - NOUVEAU SYSTÈME
  canViewScope: (scopeSlug: ScopeSlug | string) => boolean;
  canEditScope: (scopeSlug: ScopeSlug | string) => boolean;
  canCreateScope: (scopeSlug: ScopeSlug | string) => boolean;
  canDeleteScope: (scopeSlug: ScopeSlug | string) => boolean;
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
  const [userOverrides, setUserOverrides] = useState<UserPermission[]>([]);
  
  // Anciennes propriétés (compatibilité)
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [agence, setAgence] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Charger les données de permissions
  const loadPermissionsData = useCallback(async (userId: string, profileRoleAgence: string | null, profileRoleId: string | null) => {
    try {
      // Charger tous les scopes (table nouvellement créée)
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

      // Charger les permissions du rôle (ancien système + nouveau)
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

  // Calculer la permission effective pour un scope
  const getEffectivePermission = useCallback((scopeSlug: string): EffectivePermission => {
    const scope = scopes.find(s => s.slug === scopeSlug);
    
    // Permission par défaut
    const defaultPerm: EffectivePermission = {
      level: scope?.default_level || PERMISSION_LEVELS.NONE,
      canView: (scope?.default_level || 0) >= PERMISSION_LEVELS.VIEW,
      canEdit: (scope?.default_level || 0) >= PERMISSION_LEVELS.EDIT,
      canCreate: (scope?.default_level || 0) >= PERMISSION_LEVELS.EDIT,
      canDelete: (scope?.default_level || 0) >= PERMISSION_LEVELS.ADMIN,
      source: 'default'
    };

    // Admin a tous les droits
    if (isAdmin) {
      return {
        level: PERMISSION_LEVELS.ADMIN,
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: true,
        source: 'default'
      };
    }

    // Chercher l'override utilisateur (priorité 1)
    const userOverride = userOverrides.find(p => {
      if (p.scope_id && scope) {
        return p.scope_id === scope.id;
      }
      return p.block_id === scopeSlug;
    });

    if (userOverride) {
      // Si deny = true, bloquer totalement
      if (userOverride.deny) {
        return {
          level: PERMISSION_LEVELS.NONE,
          canView: false,
          canEdit: false,
          canCreate: false,
          canDelete: false,
          source: 'denied'
        };
      }

      // Appliquer l'override (les champs définis écrasent)
      return {
        level: userOverride.level ?? defaultPerm.level,
        canView: userOverride.can_view ?? defaultPerm.canView,
        canEdit: userOverride.can_edit ?? defaultPerm.canEdit,
        canCreate: userOverride.can_create ?? defaultPerm.canCreate,
        canDelete: userOverride.can_delete ?? defaultPerm.canDelete,
        source: 'user_override'
      };
    }

    // Chercher la permission du rôle (priorité 2)
    const rolePerm = rolePermissions.find(p => {
      if (p.scope_id && scope) {
        return p.scope_id === scope.id;
      }
      return p.block_id === scopeSlug;
    });

    if (rolePerm) {
      return {
        level: rolePerm.level ?? PERMISSION_LEVELS.NONE,
        canView: rolePerm.can_view ?? false,
        canEdit: rolePerm.can_edit ?? false,
        canCreate: rolePerm.can_create ?? false,
        canDelete: rolePerm.can_delete ?? false,
        source: 'role'
      };
    }

    // Retourner la permission par défaut du scope
    return defaultPerm;
  }, [scopes, userOverrides, rolePermissions, isAdmin]);

  // Helpers de permissions
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
    
    // Utiliser le nouveau système si possible
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

      // Charger le profil (avec role_id nouvellement ajouté)
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password, role_agence, agence')
        .eq('id', userId)
        .single();
      
      // Charger role_id séparément car le type n'est pas encore mis à jour
      const { data: profileWithRoleId } = await (supabase as any)
        .from('profiles')
        .select('role_id')
        .eq('id', userId)
        .single();
      
      setMustChangePassword(profile?.must_change_password || false);
      setRoleAgence(profile?.role_agence || null);
      setAgence(profile?.agence || null);

      // Charger les données de permissions
      await loadPermissionsData(userId, profile?.role_agence || null, profileWithRoleId?.role_id || null);

    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  }, [loadPermissionsData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsAuthLoading(true);
          setTimeout(async () => {
            await loadUserData(session.user.id);
            setIsAuthLoading(false);
          }, 0);
        } else {
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
          setUserOverrides([]);
          setIsAuthLoading(false);
        }
      }
    );

    // Vérifier la session existante
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsAuthLoading(true);
        await loadUserData(session.user.id);
        setIsAuthLoading(false);
      } else {
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
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
      setUserOverrides([]);
      setUser(null);

      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
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
      // Nouveaux helpers
      canViewScope,
      canEditScope,
      canCreateScope,
      canDeleteScope,
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
