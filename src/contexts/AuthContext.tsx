import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  mustChangePassword: boolean;
  roleAgence: string | null;
  userPermissions: string[];
  hasRolePermissionsConfig: boolean;
  isLoggingOut: boolean;
  hasAccessToBlock: (blockId: string) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [hasRolePermissionsConfig, setHasRolePermissionsConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is admin
          setTimeout(async () => {
            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('role', 'admin')
              .maybeSingle();
            
            setIsAdmin(!!data);

            // Check if user must change password and get role_agence
            const { data: profile } = await supabase
              .from('profiles')
              .select('must_change_password, role_agence')
              .eq('id', session.user.id)
              .single();
            
            setMustChangePassword(profile?.must_change_password || false);
            setRoleAgence(profile?.role_agence || null);

            // Load permissions for this user's role
            if (profile?.role_agence) {
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', profile.role_agence);

              const allowedPermissions = permissions?.filter(p => p.can_access) || [];

              setUserPermissions(allowedPermissions.map(p => p.block_id));
              setHasRolePermissionsConfig((permissions?.length || 0) > 0);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setMustChangePassword(false);
          setRoleAgence(null);
          setUserPermissions([]);
          setHasRolePermissionsConfig(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user is admin
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle()
          .then(({ data }) => {
            setIsAdmin(!!data);
          });

        // Check if user must change password and get role_agence
        supabase
          .from('profiles')
          .select('must_change_password, role_agence')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data }) => {
            setMustChangePassword(data?.must_change_password || false);
            setRoleAgence(data?.role_agence || null);

            // Load permissions for this user's role
            if (data?.role_agence) {
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', data.role_agence);

              const allowedPermissions = permissions?.filter(p => p.can_access) || [];

              setUserPermissions(allowedPermissions.map(p => p.block_id));
              setHasRolePermissionsConfig((permissions?.length || 0) > 0);
            }

            setLoading(false);
          });
      } else {
        setHasRolePermissionsConfig(false);
        setLoading(false);
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

      // Nettoyer les états en mémoire
      setIsAdmin(false);
      setMustChangePassword(false);
      setRoleAgence(null);
      setUserPermissions([]);
      setHasRolePermissionsConfig(false);
      setUser(null);

      // Redirection immédiate vers la page d'accueil
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, on redirige quand même
      window.location.href = '/';
    }
  };

  const hasAccessToBlock = (blockId: string): boolean => {
    // Les admins ont accès à tout
    if (isAdmin) return true;

    // Les dirigeants n'ont accès à rien (sauf si admin)
    if (roleAgence === 'dirigeant') return false;

    // Les utilisateurs sans rôle spécifique ont accès à tout
    if (!roleAgence) return true;

    // Si aucune permission n'est configurée pour ce rôle, accès total (compatibilité)
    if (!hasRolePermissionsConfig) return true;

    // Sinon, accès uniquement si le block est dans la liste des permissions autorisées
    return userPermissions.includes(blockId);
  };

  if (loading) {
    // Afficher l'application même pendant le chargement, en considérant l'utilisateur comme non connecté
    return (
      <AuthContext.Provider value={{ 
        isAuthenticated: !!user, 
        isAdmin,
        user,
        mustChangePassword,
        roleAgence,
        userPermissions,
        hasRolePermissionsConfig,
        isLoggingOut,
        hasAccessToBlock,
        login, 
        logout,
        signup 
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      isAdmin,
      user,
      mustChangePassword,
      roleAgence,
      userPermissions,
      hasRolePermissionsConfig,
      isLoggingOut,
      hasAccessToBlock,
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
