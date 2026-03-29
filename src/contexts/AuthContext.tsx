import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// ============================================================================
// SYSTÈME V2.0 - Imports des types et fonctions
// ============================================================================
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, MODULE_DEFINITIONS, isModuleEnabled as checkModuleEnabled } from '@/types/modules';
import { hasMinRole } from '@/permissions/shared-constants';


// Sub-contexts (Phase 1 split)
import { AuthCoreContext, type AuthCoreContextType } from './AuthCoreContext';
import { ProfileContext, type ProfileContextType } from './ProfileContext';
import { PermissionsContext, type PermissionsContextType } from './PermissionsContext';

// Types pour le module Support
interface SupportModuleOptions {
  user?: boolean;
  agent?: boolean;
  admin?: boolean;
}

// Types pour le module Admin Plateforme
interface AdminPlatformeModuleOptions {
  faq_admin?: boolean;
}

// ============================================================================
// Legacy AuthContextType — kept for backward-compat with useAuth()
// ============================================================================
interface AuthContextType extends AuthCoreContextType, ProfileContextType, PermissionsContextType {
  hasAccessToScope: (scope: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Import du contexte d'impersonation (lazy pour éviter les cycles)
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Profil utilisateur
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [poste, setPoste] = useState<string | null>(null);
  const [agence, setAgence] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Permissions V2
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);
  const [deployedModuleKeys, setDeployedModuleKeys] = useState<Set<string>>(new Set());
  
  const currentUserIdRef = useRef<string | null>(null);

  // ============================================================================
  // Derived permission flags (memoized)
  // ============================================================================
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isAdmin = globalRoleLevel >= GLOBAL_ROLES.platform_admin;
  const isFranchiseur = globalRoleLevel >= GLOBAL_ROLES.franchisor_user;
  const isSupport = checkModuleEnabled(enabledModules, 'support.aide_en_ligne');

  // Support module
  const supportModuleConfig = enabledModules?.['support.aide_en_ligne'];
  const supportOptions: SupportModuleOptions = 
    (typeof supportModuleConfig === 'object' && supportModuleConfig !== null && 'options' in supportModuleConfig)
      ? (supportModuleConfig.options as SupportModuleOptions)
      : {};
  
  const canAccessSupportUser = true;
  const hasSupportAgentRole = supportOptions.agent === true;
  const isSupportAdmin = supportOptions.admin === true;
  const canManageTickets = hasSupportAgentRole || isAdmin;

  // FAQ Admin module
  const adminModuleConfig = enabledModules?.admin_plateforme;
  const adminOptions: AdminPlatformeModuleOptions = 
    (typeof adminModuleConfig === 'object' && adminModuleConfig !== null && 'options' in adminModuleConfig)
      ? (adminModuleConfig.options as AdminPlatformeModuleOptions)
      : {};
  
  const hasFaqAdminRole = adminOptions.faq_admin === true;
  const canAccessFaqAdmin = hasFaqAdminRole || isAdmin;

  // Guards
  const hasGlobalRoleGuard = useCallback((requiredRole: GlobalRole): boolean => {
    return hasMinRole(globalRole, requiredRole);
  }, [globalRole]);

  const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
    if (!enabledModules) return false;
    const isBypassed = globalRole === 'platform_admin' || globalRole === 'superadmin';
    if (isBypassed) return true;
    return checkModuleEnabled(enabledModules, moduleKey);
  }, [enabledModules, globalRole]);

  const hasModuleOptionGuard = useCallback((moduleKey: ModuleKey, optionKey: string): boolean => {
    if (!enabledModules) return false;
    const isBypassed = globalRole === 'platform_admin' || globalRole === 'superadmin';
    if (isBypassed) return true;
    const moduleConfig = enabledModules[moduleKey];
    if (!moduleConfig) return false;
    if (typeof moduleConfig === 'boolean') return moduleConfig;
    if (!moduleConfig.enabled) return false;
    return moduleConfig.options?.[optionKey] === true;
  }, [enabledModules, globalRole]);

  const isDeployedModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
    return deployedModuleKeys.has(moduleKey);
  }, [deployedModuleKeys]);

  // ============================================================================
  // Chargement des données utilisateur
  // ============================================================================
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Promise.race avec un vrai timeout qui résout proprement
      // (l'ancien setTimeout + throw ne fonctionnait pas — le throw
      //  partait dans le vide sans annuler la chaîne async)
      const PROFILE_TIMEOUT_MS = 10000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: chargement profil trop long')), PROFILE_TIMEOUT_MS);
      });

      const [profileResult, modulesResult, deployedResult] = await Promise.race([
        Promise.all([
          supabase
            .from('profiles')
            // @ts-ignore — phone & poste may not be in generated types yet
            .select('first_name, last_name, agency_id, role_agence, must_change_password, global_role, is_active, is_read_only, phone, poste')
            .eq('id', userId)
            .single(),
          supabase.rpc('get_user_permissions', { p_user_id: userId }),
          (supabase
            .from('module_registry' as any) as any)
            .select('key')
            .eq('is_deployed', true),
        ]),
        timeoutPromise,
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: effectiveModules, error: modulesError } = modulesResult;
      const { data: deployedRows, error: deployedError } = deployedResult;

      // Build deployed module keys set
      if (!deployedError && Array.isArray(deployedRows)) {
        setDeployedModuleKeys(new Set(deployedRows.map((r: any) => r.key)));
      } else {
        logAuth.warn('[AUTH] Failed to load deployed module keys, fallback to local definitions', deployedError);
        setDeployedModuleKeys(new Set(MODULE_DEFINITIONS.filter(def => def.deployed !== false).map(def => def.key)));
      }
      
      if (profileError) {
        logAuth.error('Erreur requête profil:', profileError);
        throw profileError;
      }
      
      if (modulesError) {
        logAuth.warn('[AUTH] Erreur requête get_user_permissions:', modulesError);
      }
      
      setFirstName(profile?.first_name || null);
      setLastName(profile?.last_name || null);
      setPhone(profile?.phone || null);
      setPoste(profile?.poste || null);
      setAgencyId(profile?.agency_id || null);
      setRoleAgence(profile?.role_agence || null);
      
      if (profile?.agency_id) {
        // Non-blocking slug resolution
        Promise.resolve(
          supabase.from('apogee_agencies').select('slug').eq('id', profile.agency_id).single()
        ).then(({ data }) => setAgence(data?.slug || null))
          .catch(() => setAgence(null));
      } else {
        setAgence(null);
      }
      setRoleAgence(profile?.role_agence || null);
      setMustChangePassword(profile?.must_change_password || false);
      setIsReadOnly(profile?.is_read_only === true);
      
      const accountActive = profile?.is_active !== false;
      setIsActive(accountActive);
      
      if (!accountActive) {
        logAuth.warn('[AUTH] Compte désactivé, déconnexion forcée');
        await supabase.auth.signOut();
        toast.error('Votre compte a été désactivé. Contactez votre responsable ou le support.', {
          duration: 8000,
        });
        return;
      }

      const dbGlobalRole = profile?.global_role as GlobalRole | null;
      
      let resolvedModules: EnabledModules = {};
      if (effectiveModules && Array.isArray(effectiveModules) && effectiveModules.length > 0) {
        for (const row of effectiveModules) {
          const moduleKey = row.module_key;
          resolvedModules[moduleKey] = {
            enabled: row.granted === true,
            options: (typeof row.options === 'object' && row.options !== null) 
              ? row.options as Record<string, boolean>
              : {},
          };
        }

        // PRO plan auto-enrichment (check hierarchical + legacy keys for safety)
        // reseau_franchiseur retiré — interface de rôle, pas un indicateur de plan PRO
        const parcModule = (resolvedModules['organisation.parc'] || resolvedModules.parc) as any;
        const isProAgency = !!(
          (parcModule && typeof parcModule === 'object' && parcModule.enabled)
        );

        const agenceModule = (resolvedModules['pilotage.agence'] || resolvedModules.agence) as any;
        if (isProAgency && agenceModule && typeof agenceModule === 'object' && agenceModule.enabled) {
          const agenceOptions = (agenceModule.options && typeof agenceModule.options === 'object')
            ? agenceModule.options as Record<string, boolean>
            : {};

          resolvedModules['pilotage.agence'] = {
            enabled: true,
            options: { ...agenceOptions, stats_hub: true },
          } as any;
        }

        if (import.meta.env.DEV) {
          logAuth.info('[AUTH] Modules loaded from RPC:', effectiveModules.length);
        }
      } else {
        resolvedModules = {};
        if (import.meta.env.DEV) {
          logAuth.info('[AUTH] No effective modules returned from RPC');
        }
      }

      setGlobalRole(dbGlobalRole || 'base_user');
      setEnabledModules(resolvedModules);

      // Sentry user context
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setSentryUser({
          id: userId,
          email: userData.user.email,
          globalRole: dbGlobalRole || 'base_user',
          agencySlug: null,
        });
      }

      if (import.meta.env.DEV) {
        logAuth.info('[AUTH][V2] User loaded:', {
          userId,
          globalRole: dbGlobalRole || 'base_user (default)',
          modulesCount: Object.keys(resolvedModules).length,
        });
      }
    } catch (error) {
      logAuth.error('Erreur chargement données utilisateur', error);
    }
  }, []);

  // ============================================================================
  // Auth state management
  // ============================================================================
  useEffect(() => {
    let isLoadingUserData = false;
    let isMounted = true;
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        currentUserIdRef.current = session?.user?.id ?? null;
        
        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            setIsAuthLoading(true);
            try {
              await loadUserData(session.user.id);
            } catch (error) {
              logAuth.error('Erreur init loadUserData:', error);
            } finally {
              if (isMounted) setIsAuthLoading(false);
              isLoadingUserData = false;
            }
          }, 0);
        } else {
          setIsAuthLoading(false);
        }
      } catch (error) {
        logAuth.error('Erreur initialisation auth', error);
        if (isMounted) setIsAuthLoading(false);
      }
    };
    
    init();
    
    const getCurrentUserId = () => currentUserIdRef.current;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return;

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user?.id && getCurrentUserId() !== session.user.id) {
            currentUserIdRef.current = session.user.id;
          }
          return;
        }

        const prevUserId = getCurrentUserId();
        const newUserId = session?.user?.id ?? null;
        currentUserIdRef.current = newUserId;

        if (newUserId === prevUserId && event !== 'SIGNED_OUT') return;

        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            if (event === 'SIGNED_IN') setIsAuthLoading(true);
            try {
              await loadUserData(session.user.id);
            } catch (error) {
              logAuth.error('Erreur chargement données utilisateur', error);
            }
            if (isMounted) setIsAuthLoading(false);
            isLoadingUserData = false;
          }, 0);
        } else {
          // Reset on logout
          resetState();
          setIsAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const resetState = useCallback(() => {
    setFirstName(null);
    setLastName(null);
    setPhone(null);
    setPoste(null);
    setAgence(null);
    setAgencyId(null);
    setRoleAgence(null);
    setMustChangePassword(false);
    setIsActive(true);
    setGlobalRole(null);
    setEnabledModules(null);
    setDeployedModuleKeys(new Set());
    setIsReadOnly(false);
  }, []);

  // ============================================================================
  // Auth actions
  // ============================================================================
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      logAuth.error('Erreur connexion', err);
      return { success: false, error: 'Une erreur est survenue' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await supabase.auth.signOut();

      try {
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith('preload:') || key.startsWith('preload_ui_shown:'))
          .forEach((key) => sessionStorage.removeItem(key));
      } catch { /* ignore */ }

      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => localStorage.removeItem(key));

      localStorage.removeItem('editMode');
      clearSentryUser();
      resetState();
      setUser(null);
    } catch (error) {
      logAuth.error('Erreur déconnexion', error);
    } finally {
      window.location.href = '/';
    }
  }, [resetState]);

  /**
   * Scope-to-module mapping for legacy hasAccessToScope checks.
   * Single source of truth — delegates to module/option guards.
   */
  const hasAccessToScope = useCallback((scope: string): boolean => {
    // Bypass for platform_admin and above
    if (isAdmin) return true;

    switch (scope) {
      case 'mes_indicateurs':
        return hasModuleGuard('pilotage.agence');
      case 'apporteurs':
        return hasModuleGuard('support.guides.apporteurs');
      case 'helpconfort':
        return hasModuleGuard('support.guides.helpconfort');
      case 'apogee':
        return hasModuleGuard('support.guides.apogee');
      case 'ticketing':
      case 'apogee_tickets':
        return hasModuleGuard('ticketing');
      default:
        logAuth.warn(`hasAccessToScope: unknown scope "${scope}", denying access`);
        return false;
    }
  }, [isAdmin, hasModuleGuard, hasModuleOptionGuard]);

  // ============================================================================
  // Sub-context values (memoized independently to prevent cascading re-renders)
  // ============================================================================
  const coreValue: AuthCoreContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isAuthLoading,
    isLoggingOut,
    login,
    logout,
  }), [user, isAuthLoading, isLoggingOut, login, logout]);

  const profileValue: ProfileContextType = useMemo(() => ({
    firstName,
    lastName,
    phone,
    poste,
    agence,
    agencyId,
    roleAgence,
    mustChangePassword,
    isActive,
    isReadOnly,
  }), [firstName, lastName, phone, poste, agence, agencyId, roleAgence, mustChangePassword, isActive, isReadOnly]);

  const permissionsValue: PermissionsContextType = useMemo(() => ({
    globalRole,
    enabledModules,
    hasGlobalRole: hasGlobalRoleGuard,
    hasModule: hasModuleGuard,
    hasModuleOption: hasModuleOptionGuard,
    isDeployedModule: isDeployedModuleGuard,
    isAdmin,
    isSupport,
    isFranchiseur,
    canAccessSupportUser,
    hasSupportAgentRole,
    isSupportAdmin,
    canManageTickets,
    hasFaqAdminRole,
    canAccessFaqAdmin,
    hasAccessToScope,
    suggestedGlobalRole: globalRole ?? 'base_user',
  }), [
    globalRole, enabledModules,
    hasGlobalRoleGuard, hasModuleGuard, hasModuleOptionGuard, isDeployedModuleGuard,
    isAdmin, isSupport, isFranchiseur,
    canAccessSupportUser, hasSupportAgentRole, isSupportAdmin,
    canManageTickets,
    hasFaqAdminRole, canAccessFaqAdmin, hasAccessToScope,
  ]);

  // Legacy combined value for useAuth() backward compat
  const legacyValue: AuthContextType = useMemo(() => ({
    ...coreValue,
    ...profileValue,
    ...permissionsValue,
    hasAccessToScope,
  }), [coreValue, profileValue, permissionsValue, hasAccessToScope]);

  return (
    <AuthContext.Provider value={legacyValue}>
      <AuthCoreContext.Provider value={coreValue}>
        <ProfileContext.Provider value={profileValue}>
          <PermissionsContext.Provider value={permissionsValue}>
            {children}
          </PermissionsContext.Provider>
        </ProfileContext.Provider>
      </AuthCoreContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * useAuth() — Backward-compatible facade.
 * 
 * For new code, prefer the granular hooks:
 * - `useAuthCore()` — session/login/logout only
 * - `useProfile()` — user profile data only
 * - `usePermissions()` — roles and modules only
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
