import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  user: User | null;
  mustChangePassword: boolean;
  roleAgence: string | null;
  userPermissions: string[];
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
  const [isSupport, setIsSupport] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [roleAgence, setRoleAgence] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is admin or support
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            
            setIsAdmin(roles?.some(r => r.role === 'admin') || false);
            setIsSupport(roles?.some(r => r.role === 'support') || false);

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
              console.log('🔐 Chargement permissions pour role_agence:', profile.role_agence);
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', profile.role_agence)
                .eq('can_access', true);

              console.log('🔐 Permissions trouvées:', permissions);
              setUserPermissions(permissions?.map(p => p.block_id) || []);
            } else {
              console.log('🔐 Aucun role_agence défini pour cet utilisateur');
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSupport(false);
          setMustChangePassword(false);
          setRoleAgence(null);
          setUserPermissions([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user is admin or support
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .then(({ data: roles }) => {
            setIsAdmin(roles?.some(r => r.role === 'admin') || false);
            setIsSupport(roles?.some(r => r.role === 'support') || false);
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
              console.log('🔐 [Init] Chargement permissions pour role_agence:', data.role_agence);
              const { data: permissions } = await supabase
                .from('role_permissions')
                .select('block_id, can_access')
                .eq('role_agence', data.role_agence)
                .eq('can_access', true);

              console.log('🔐 [Init] Permissions trouvées:', permissions);
              setUserPermissions(permissions?.map(p => p.block_id) || []);
            } else {
              console.log('🔐 [Init] Aucun role_agence défini pour cet utilisateur');
            }

            setLoading(false);
          });
      } else {
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
      setIsSupport(false);
      setMustChangePassword(false);
      setRoleAgence(null);
      setUserPermissions([]);
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
    console.log('🔐 hasAccessToBlock appelé:', { blockId, isAdmin, roleAgence, userPermissionsCount: userPermissions.length });
    
    // POLITIQUE STRICTE : DENY PAR DÉFAUT
    
    // Les admins ont accès à tout
    if (isAdmin) {
      console.log('✅ Accès accordé (admin)');
      return true;
    }
    
    // Si l'utilisateur n'a pas de rôle agence, on ne lui donne pas d'accès fin par défaut
    if (!roleAgence) {
      console.log('❌ Accès REFUSÉ (pas de role_agence)');
      return false;
    }
    
    // Pas de blockId = pas d'accès
    if (!blockId) {
      console.log('❌ Accès REFUSÉ (pas de blockId)');
      return false;
    }
    
    // DENY par défaut : si le blockId n'est pas dans la liste → accès refusé
    const hasPermission = userPermissions.includes(blockId);
    
    if (!hasPermission) {
      console.log('❌ Accès REFUSÉ (aucune permission explicite pour ce block)');
      return false;
    }
    
    console.log('✅ Accès accordé (permission explicite trouvée)');
    return true;
  };

  if (loading) {
    // Afficher l'application même pendant le chargement, en considérant l'utilisateur comme non connecté
    return (
      <AuthContext.Provider value={{ 
        isAuthenticated: !!user, 
        isAdmin,
        isSupport,
        user,
        mustChangePassword,
        roleAgence,
        userPermissions,
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
      isSupport,
      user,
      mustChangePassword,
      roleAgence,
      userPermissions,
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
