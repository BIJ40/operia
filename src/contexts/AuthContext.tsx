import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;
  user: User | null;
  mustChangePassword: boolean;
  roleAgence: string | null;
  agence: string | null;
  userPermissions: string[];
  isLoggingOut: boolean;
  hasAccessToBlock: (blockId: string) => boolean;
  hasAccessToScope: (scope: 'apogee' | 'apporteurs' | 'helpconfort' | 'mes_indicateurs' | 'actions_a_mener' | 'mes_demandes') => boolean;
  canManageTickets: () => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isFranchiseur, setIsFranchiseur] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [agence, setAgence] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [individualPermissions, setIndividualPermissions] = useState<Record<string, boolean>>({});
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsAuthLoading(true);
          // Check if user is admin or support
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            
            setIsAdmin(roles?.some(r => r.role === 'admin') || false);
            setIsSupport(roles?.some(r => r.role === 'support') || false);
            setIsFranchiseur(roles?.some(r => r.role === 'franchiseur') || false);

            // Check if user must change password and get role_agence
            const { data: profile } = await supabase
              .from('profiles')
              .select('must_change_password, role_agence, agence')
              .eq('id', session.user.id)
              .single();
            
            setMustChangePassword(profile?.must_change_password || false);
            setRoleAgence(profile?.role_agence || null);
            setAgence(profile?.agence || null);

            // Load individual user permissions (priority)
            const { data: userPerms } = await supabase
              .from('user_permissions')
              .select('block_id, can_access')
              .eq('user_id', session.user.id);

            const individualPermsMap: Record<string, boolean> = {};
            userPerms?.forEach(p => {
              individualPermsMap[p.block_id] = p.can_access;
            });
            setIndividualPermissions(individualPermsMap);

            // Load permissions for this user's role
            if (profile?.role_agence) {
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', profile.role_agence)
                .eq('can_access', true);

              setUserPermissions(permissions?.map(p => p.block_id) || []);
            }
            
            setIsAuthLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSupport(false);
          setIsFranchiseur(false);
          setMustChangePassword(false);
          setRoleAgence(null);
          setAgence(null);
          setUserPermissions([]);
          setIsAuthLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsAuthLoading(true);
        // Check if user is admin or support
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .then(({ data: roles }) => {
            setIsAdmin(roles?.some(r => r.role === 'admin') || false);
            setIsSupport(roles?.some(r => r.role === 'support') || false);
            setIsFranchiseur(roles?.some(r => r.role === 'franchiseur') || false);
          });

        // Check if user must change password and get role_agence
        supabase
          .from('profiles')
          .select('must_change_password, role_agence, agence')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data }) => {
            setMustChangePassword(data?.must_change_password || false);
            setRoleAgence(data?.role_agence || null);
            setAgence(data?.agence || null);

            // Load individual user permissions (priority)
            const { data: userPerms } = await supabase
              .from('user_permissions')
              .select('block_id, can_access')
              .eq('user_id', session.user.id);

            const individualPermsMap: Record<string, boolean> = {};
            userPerms?.forEach(p => {
              individualPermsMap[p.block_id] = p.can_access;
            });
            setIndividualPermissions(individualPermsMap);

            // Load permissions for this user's role
            if (data?.role_agence) {
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', data.role_agence)
                .eq('can_access', true);

              setUserPermissions(permissions?.map(p => p.block_id) || []);
            }

            setIsAuthLoading(false);
          });
      } else {
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);

      // Petite pause pour laisser l'animation se voir
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Déconnexion complète de Supabase
      await supabase.auth.signOut();

      // Fallback de sécurité : supprimer manuellement les sessions locales Supabase
      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => localStorage.removeItem(key));

      // Nettoyer les préférences UI
      localStorage.removeItem('editMode');
      
      // Nettoyer les états en mémoire
      setIsAdmin(false);
      setIsSupport(false);
      setIsFranchiseur(false);
      setMustChangePassword(false);
      setRoleAgence(null);
      setUserPermissions([]);
      setIndividualPermissions({});
      setUser(null);

      // Redirection immédiate vers la page d'accueil
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, on redirige quand même
      window.location.href = '/';
    }
  };

  // Helper pour déterminer le scope d'un block à partir de son contexte
  const getScopeFromPath = (): 'apogee' | 'apporteurs' | 'helpconfort' | null => {
    const path = window.location.pathname;
    if (path.includes('/apogee')) return 'apogee';
    if (path.includes('/apporteurs')) return 'apporteurs';
    if (path.includes('/helpconfort')) return 'helpconfort';
    return null;
  };

  const hasAccessToBlock = (blockId: string): boolean => {
    // Les admins ont accès à tout
    if (isAdmin) return true;
    
    // Si aucun rôle agence, accès à tout
    if (!roleAgence) return true;
    
    // Déterminer le scope en fonction du chemin actuel
    const scope = getScopeFromPath();
    if (!scope) return true; // Si pas de scope identifié, autoriser par défaut
    
    // Vérifier l'accès au scope parent
    return hasAccessToScope(scope);
  };

  const hasAccessToScope = (scope: 'apogee' | 'apporteurs' | 'helpconfort' | 'mes_indicateurs' | 'actions_a_mener' | 'mes_demandes'): boolean => {
    // Les admins ont accès à tout
    if (isAdmin) return true;
    
    // Si aucun rôle agence, accès à tout
    if (!roleAgence) return true;
    
    // Les dirigeants ont automatiquement accès aux indicateurs
    if (scope === 'mes_indicateurs' && roleAgence === 'dirigeant') {
      return true;
    }
    
    // PRIORITÉ 1: Vérifier les permissions individuelles
    if (scope in individualPermissions) {
      return individualPermissions[scope];
    }
    
    // PRIORITÉ 2: Fallback sur permissions de rôle
    // Nouveaux scopes : bloqués par défaut (sauf si permission explicite)
    const newScopes = ['mes_indicateurs', 'actions_a_mener', 'mes_demandes'];
    if (newScopes.includes(scope)) {
      return userPermissions.includes(scope);
    }
    
    // Anciens scopes (apogee, apporteurs, helpconfort) : permissifs par défaut
    return userPermissions.length === 0 || userPermissions.includes(scope);
  };

  const canManageTickets = (): boolean => {
    return isAdmin || isSupport || isFranchiseur;
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user,
      isAuthLoading,
      isAdmin,
      isSupport,
      isFranchiseur,
      user,
      mustChangePassword,
      roleAgence,
      agence,
      userPermissions,
      isLoggingOut,
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
