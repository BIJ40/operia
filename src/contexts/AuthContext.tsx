import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// ============================================================================
// SYSTÈME V2.0 - Imports des types et fonctions
// ============================================================================
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, isModuleEnabled as checkModuleEnabled } from '@/types/modules';
import { 
  AccessControlContext,
  hasGlobalRole as hasGlobalRoleFn,
  hasModule as hasModuleFn,
  hasModuleOption as hasModuleOptionFn,
} from '@/types/accessControl';
import { getRoleCapabilities } from '@/config/roleMatrix';
import { hasAccess, hasMinRole, getUserManagementCapabilities, isModuleEnabled, isModuleOptionEnabled } from '@/permissions';
import { userModulesToEnabledModules } from '@/lib/userModulesUtils';

// Types pour le module Support
interface SupportModuleOptions {
  user?: boolean;   // Portail Mes Demandes
  agent?: boolean;  // Accès console support
  admin?: boolean;  // Admin support
}

// Types pour le module Admin Plateforme
interface AdminPlatformeModuleOptions {
  faq_admin?: boolean; // Admin FAQ sans accès /admin complet
}

interface AuthContextType {
  // État utilisateur
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: User | null;
  isLoggingOut: boolean;
  
  // Profil utilisateur
  firstName: string | null;
  lastName: string | null;
  agence: string | null;
  agencyId: string | null; // UUID de l'agence
  roleAgence: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  isSalariedManager: boolean; // Dirigeant salarié (N2 avec coffre RH)
  
  // ============================================================================
  // SYSTÈME V2.0 - Source de vérité unique
  // ============================================================================
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  accessContext: AccessControlContext;
  
  // Guards V2.0 - À UTILISER PARTOUT
  hasGlobalRole: (requiredRole: GlobalRole) => boolean;
  hasModule: (moduleKey: ModuleKey) => boolean;
  hasModuleOption: (moduleKey: ModuleKey, optionKey: string) => boolean;
  
  // Helpers de niveau V2
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;
  
  // ============================================================================
  // MODULE SUPPORT - Flags granulaires (P1.2 - Option B, P2.1 - Sémantique)
  // ============================================================================
  canAccessSupportUser: boolean;       // Portail Mes Demandes (toujours true)
  hasSupportAgentRole: boolean;        // Module support.agent activé
  isSupportAdmin: boolean;             // Module support.admin activé
  canAccessSupportConsoleUI: boolean;  // Console Support = support.agent OU N5+
  canManageTickets: boolean;           // Alias de canAccessSupportConsoleUI
  
  // ============================================================================
  // MODULE FAQ ADMIN - Accès /admin/faq sans accès /admin complet
  // ============================================================================
  hasFaqAdminRole: boolean;            // Module admin_plateforme.faq_admin activé
  canAccessFaqAdmin: boolean;          // faq_admin OU N5+
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // Compatibilité minimale
  hasAccessToScope: (scope: string) => boolean;
  suggestedGlobalRole: GlobalRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Profil utilisateur
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [agence, setAgence] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSalariedManager, setIsSalariedManager] = useState(false);
  
  // ============================================================================
  // SYSTÈME V2.0 - États principaux
  // ============================================================================
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);

  // ============================================================================
  // Calculs dérivés V2
  // ============================================================================
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isAdmin = globalRoleLevel >= GLOBAL_ROLES.platform_admin; // N5+
  const isFranchiseur = globalRoleLevel >= GLOBAL_ROLES.franchisor_user; // N3+
  const isSupport = checkModuleEnabled(enabledModules, 'support');

  // ============================================================================
  // MODULE SUPPORT - Logique granulaire (P1.2 - Option B)
  // ============================================================================
  // Parser le module support depuis enabled_modules (structure: support.options.agent)
  const supportModuleConfig = enabledModules?.support;
  const supportOptions: SupportModuleOptions = 
    (typeof supportModuleConfig === 'object' && supportModuleConfig !== null && 'options' in supportModuleConfig)
      ? (supportModuleConfig.options as SupportModuleOptions)
      : {};
  
  // P1.2 - Option B, P2.1 - Sémantique clarifiée
  const canAccessSupportUser = true; // Tous les utilisateurs peuvent accéder au portail Mes Demandes
  const hasSupportAgentRole = supportOptions.agent === true; // Module support.agent activé
  const isSupportAdmin = supportOptions.admin === true; // Admin support (non utilisé pour console)
  
  // Console Support = support.agent OU N5+
  const canAccessSupportConsoleUI = hasSupportAgentRole || isAdmin;
  const canManageTickets = canAccessSupportConsoleUI; // Alias pour compatibilité

  // ============================================================================
  // MODULE FAQ ADMIN - Logique granulaire
  // ============================================================================
  const adminModuleConfig = enabledModules?.admin_plateforme;
  const adminOptions: AdminPlatformeModuleOptions = 
    (typeof adminModuleConfig === 'object' && adminModuleConfig !== null && 'options' in adminModuleConfig)
      ? (adminModuleConfig.options as AdminPlatformeModuleOptions)
      : {};
  
  const hasFaqAdminRole = adminOptions.faq_admin === true; // Module admin_plateforme.faq_admin activé
  const canAccessFaqAdmin = hasFaqAdminRole || isAdmin; // faq_admin OU N5+

  // Contexte d'accès V2.0
  const accessContext: AccessControlContext = {
    globalRole: globalRole ?? 'base_user',
    enabledModules: enabledModules ?? {},
    agencyId, // Pour les contrôles de modules nécessitant une agence (pilotage_agence, rh, parc)
  };

  // ============================================================================
  // Guards V2.0 - À utiliser partout
  // ============================================================================
  const hasGlobalRoleGuard = useCallback((requiredRole: GlobalRole): boolean => {
    return hasGlobalRoleFn(accessContext, requiredRole);
  }, [accessContext]);

  const hasModuleGuard = useCallback((moduleKey: ModuleKey): boolean => {
    return hasModuleFn(accessContext, moduleKey);
  }, [accessContext]);

  const hasModuleOptionGuard = useCallback((moduleKey: ModuleKey, optionKey: string): boolean => {
    return hasModuleOptionFn(accessContext, moduleKey, optionKey);
  }, [accessContext]);

  // Helper convertUserModulesToEnabledModules déplacé vers src/lib/userModulesUtils.ts

  // ============================================================================
  // Chargement des données utilisateur (V2 + user_modules table)
  // ============================================================================
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Requêtes parallèles avec timeout global
      const timeoutId = setTimeout(() => {
        throw new Error('Timeout: chargement profil trop long');
      }, 10000);

      // Requête profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, agence, agency_id, role_agence, must_change_password, global_role, enabled_modules, is_active, is_salaried_manager')
        .eq('id', userId)
        .single();
      
      // Appeler la RPC qui combine plan agence + overrides utilisateur
      const { data: effectiveModules, error: modulesError } = await supabase.rpc(
        'get_user_effective_modules',
        { p_user_id: userId }
      );
      
      clearTimeout(timeoutId);
      
      if (profileError) {
        logAuth.error('Erreur requête profil:', profileError);
        throw profileError;
      }
      
      if (modulesError) {
        logAuth.warn('[AUTH] Erreur requête get_user_effective_modules:', modulesError);
      }
      
      setFirstName(profile?.first_name || null);
      setLastName(profile?.last_name || null);
      setAgence(profile?.agence || null);
      setAgencyId(profile?.agency_id || null);
      setRoleAgence(profile?.role_agence || null);
      setMustChangePassword(profile?.must_change_password || false);
      setIsSalariedManager(profile?.is_salaried_manager || false);
      
      // Vérifier si le compte est actif
      const accountActive = profile?.is_active !== false; // true par défaut
      setIsActive(accountActive);
      
      // Si le compte est désactivé, forcer la déconnexion
      if (!accountActive) {
        logAuth.warn('[AUTH] Compte désactivé, déconnexion forcée');
        await supabase.auth.signOut();
        toast.error('Votre compte a été désactivé. Contactez votre responsable ou le support.', {
          duration: 8000,
        });
        return;
      }

      // V2.0 - Utiliser directement les valeurs de la DB
      const dbGlobalRole = profile?.global_role as GlobalRole | null;
      
      // Convertir le résultat de la RPC get_user_effective_modules en EnabledModules
      // La RPC combine: plan agence (plan_tier_modules) + overrides agence + overrides utilisateur
      let resolvedModules: EnabledModules = {};
      if (effectiveModules && Array.isArray(effectiveModules) && effectiveModules.length > 0) {
        for (const row of effectiveModules) {
          const moduleKey = row.module_key as ModuleKey;
          resolvedModules[moduleKey] = {
            enabled: row.enabled === true,
            options: (typeof row.options === 'object' && row.options !== null) 
              ? row.options as Record<string, boolean>
              : {},
          };
        }

        // Règle métier: dans le plan PRO, certaines options de pilotage_agence sont incluses d'office
        // On considère qu'une agence est en PRO si elle a accès à parc ou reseau_franchiseur
        const parcModule = resolvedModules.parc as any;
        const reseauModule = resolvedModules.reseau_franchiseur as any;
        const isProAgency = !!(
          (parcModule && typeof parcModule === 'object' && parcModule.enabled) ||
          (reseauModule && typeof reseauModule === 'object' && reseauModule.enabled)
        );

        const pilotageModule = resolvedModules.pilotage_agence as any;
        if (isProAgency && pilotageModule && typeof pilotageModule === 'object' && pilotageModule.enabled) {
          const pilotageOptions = (pilotageModule.options && typeof pilotageModule.options === 'object')
            ? pilotageModule.options as Record<string, boolean>
            : {};

          resolvedModules.pilotage_agence = {
            enabled: true,
            options: {
              ...pilotageOptions,
              // Stats Hub inclus dans le plan PRO (mais pas dans STARTER)
              stats_hub: true,
            },
          } as any;
        }

        if (import.meta.env.DEV) {
          logAuth.info('[AUTH] Modules loaded from RPC get_user_effective_modules:', effectiveModules.length);
        }
      } else {
        // Fallback minimal si RPC échoue ou retourne vide
        resolvedModules = {};
        if (import.meta.env.DEV) {
          logAuth.info('[AUTH] No effective modules returned from RPC');
        }
      }

      // Définir le rôle global (valeur par défaut si non défini)
      setGlobalRole(dbGlobalRole || 'base_user');
      
      // Définir les modules activés
      setEnabledModules(resolvedModules);

      // Configurer Sentry avec le contexte utilisateur
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setSentryUser({
          id: userId,
          email: userData.user.email,
          globalRole: dbGlobalRole || 'base_user',
          agencySlug: profile?.agence || null,
        });
      }

      // Logging en dev
      if (import.meta.env.DEV) {
        logAuth.info('[AUTH][V2] User loaded:', {
          userId,
          globalRole: dbGlobalRole || 'base_user (default)',
          modulesCount: Object.keys(resolvedModules).length,
          moduleSource: 'rpc_get_user_effective_modules',
        });
      }

    } catch (error) {
      logAuth.error('Erreur chargement données utilisateur', error);
    }
  }, []);

  // ============================================================================
  // Gestion de l'authentification Supabase
  // ============================================================================
  useEffect(() => {
    let isLoadingUserData = false;
    let isMounted = true;
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
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
              if (isMounted) {
                setIsAuthLoading(false);
              }
              isLoadingUserData = false;
            }
          }, 0);
        } else {
          setIsAuthLoading(false);
        }
      } catch (error) {
        logAuth.error('Erreur initialisation auth', error);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    
    init();
    
    // Track the current user ID to avoid unnecessary reloads
    let currentUserId: string | null = null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip initial session - handled by init()
        if (event === 'INITIAL_SESSION') return;
        
        // CRITICAL: Ignore TOKEN_REFRESHED if user hasn't changed
        // This prevents unnecessary re-renders when switching browser tabs
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === currentUserId) {
          logAuth.debug('Token refreshed but user unchanged, skipping reload');
          return;
        }
        
        const newUserId = session?.user?.id ?? null;
        
        // Skip if user hasn't actually changed (prevents tab-switch re-renders)
        if (newUserId === currentUserId && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
          return;
        }
        
        currentUserId = newUserId;
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted || isLoadingUserData) return;
            isLoadingUserData = true;
            // Only show loading for actual sign-in, not token refresh
            if (event === 'SIGNED_IN') {
              setIsAuthLoading(true);
            }
            try {
              await loadUserData(session.user.id);
            } catch (error) {
              logAuth.error('Erreur chargement données utilisateur', error);
            }
            if (isMounted) {
              setIsAuthLoading(false);
            }
            isLoadingUserData = false;
          }, 0);
        } else {
          // Reset state on logout
          setFirstName(null);
          setLastName(null);
          setAgence(null);
          setAgencyId(null);
          setRoleAgence(null);
          setMustChangePassword(false);
          setIsActive(true);
          setIsSalariedManager(false);
          setGlobalRole(null);
          setEnabledModules(null);
          setIsAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // ============================================================================
  // Actions d'authentification
  // ============================================================================
  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      logAuth.error('Erreur connexion', err);
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
      
      // Clear Sentry user context
      clearSentryUser();
      
      // Reset V2 state
      setFirstName(null);
      setLastName(null);
      setAgence(null);
      setAgencyId(null);
      setRoleAgence(null);
      setMustChangePassword(false);
      setIsActive(true);
      setIsSalariedManager(false);
      setGlobalRole(null);
      setEnabledModules(null);
      setUser(null);
    } catch (error) {
      logAuth.error('Erreur déconnexion', error);
    } finally {
      window.location.href = '/';
    }
  };

  // Wrappers minimaux de compatibilité
  const hasAccessToScope = useCallback((_scope: string): boolean => true, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user,
      isAuthLoading,
      user,
      isLoggingOut,
      firstName,
      lastName,
      agence,
      agencyId,
      roleAgence,
      mustChangePassword,
      isActive,
      isSalariedManager,
      globalRole,
      enabledModules,
      accessContext,
      hasGlobalRole: hasGlobalRoleGuard,
      hasModule: hasModuleGuard,
      hasModuleOption: hasModuleOptionGuard,
      isAdmin,
      isSupport,
      isFranchiseur,
      // Support module flags
      canAccessSupportUser,
      hasSupportAgentRole,
      isSupportAdmin,
      canAccessSupportConsoleUI,
      canManageTickets,
      // FAQ Admin flags
      hasFaqAdminRole,
      canAccessFaqAdmin,
      // Auth actions
      login, 
      logout,
      hasAccessToScope,
      suggestedGlobalRole: globalRole ?? 'base_user',
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
