import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  mustChangePassword: boolean;
  roleAgence: string | null;
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
  const [loading, setLoading] = useState(true);

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
          }, 0);
        } else {
          setIsAdmin(false);
          setMustChangePassword(false);
          setRoleAgence(null);
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
          .then(({ data }) => {
            setMustChangePassword(data?.must_change_password || false);
            setRoleAgence(data?.role_agence || null);
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
    await supabase.auth.signOut();
    setIsAdmin(false);
    setMustChangePassword(false);
    setRoleAgence(null);
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
