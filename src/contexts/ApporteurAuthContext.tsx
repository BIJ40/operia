/**
 * ApporteurAuthContext - Contexte d'authentification pour les utilisateurs apporteurs
 * Système isolé du système interne (global_role N0-N6)
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface ApporteurUser {
  id: string;
  apporteurId: string;
  apporteurName: string;
  agencyId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'reader' | 'manager';
  isActive: boolean;
}

interface ApporteurAuthContextType {
  // État
  isApporteurAuthenticated: boolean;
  isApporteurLoading: boolean;
  user: User | null;
  apporteurUser: ApporteurUser | null;
  
  // Helpers
  isApporteurManager: boolean;
  apporteurId: string | null;
  agencyId: string | null;
  
  // Actions
  logout: () => Promise<void>;
}

const ApporteurAuthContext = createContext<ApporteurAuthContextType | undefined>(undefined);

export function ApporteurAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apporteurUser, setApporteurUser] = useState<ApporteurUser | null>(null);
  const [isApporteurLoading, setIsApporteurLoading] = useState(true);

  // Charger les données apporteur pour l'utilisateur connecté
  const loadApporteurData = useCallback(async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('apporteur_users')
        .select(`
          id,
          apporteur_id,
          agency_id,
          email,
          first_name,
          last_name,
          role,
          is_active,
          apporteurs:apporteur_id (
            name
          )
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // L'utilisateur n'est pas un apporteur
        setApporteurUser(null);
        return;
      }

      const apporteurData = data.apporteurs as unknown as { name: string } | null;

      setApporteurUser({
        id: data.id,
        apporteurId: data.apporteur_id,
        apporteurName: apporteurData?.name || 'Apporteur inconnu',
        agencyId: data.agency_id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role as 'reader' | 'manager',
        isActive: data.is_active,
      });
    } catch (err) {
      console.error('Error loading apporteur data:', err);
      setApporteurUser(null);
    }
  }, []);

  // Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsApporteurLoading(true);
      
      if (session?.user) {
        setUser(session.user);
        await loadApporteurData(session.user);
      } else {
        setUser(null);
        setApporteurUser(null);
      }
      
      setIsApporteurLoading(false);
    });

    // Charger l'état initial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadApporteurData(session.user);
      }
      setIsApporteurLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadApporteurData]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setApporteurUser(null);
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  }, []);

  const value: ApporteurAuthContextType = {
    isApporteurAuthenticated: !!apporteurUser,
    isApporteurLoading,
    user,
    apporteurUser,
    isApporteurManager: apporteurUser?.role === 'manager',
    apporteurId: apporteurUser?.apporteurId || null,
    agencyId: apporteurUser?.agencyId || null,
    logout,
  };

  return (
    <ApporteurAuthContext.Provider value={value}>
      {children}
    </ApporteurAuthContext.Provider>
  );
}

export function useApporteurAuth() {
  const context = useContext(ApporteurAuthContext);
  if (!context) {
    throw new Error('useApporteurAuth must be used within ApporteurAuthProvider');
  }
  return context;
}
