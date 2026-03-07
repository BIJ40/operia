/**
 * ApporteurAuthContext - Contexte d'authentification pour les utilisateurs apporteurs
 * Système isolé du système interne (global_role N0-N6)
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { logError } from '@/lib/logger';
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
  orgIsActive: boolean; // Organisation apporteur active
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
  isOrgDisabled: boolean; // Organisation désactivée
  
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
            name,
            is_active
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

      const apporteurData = data.apporteurs as unknown as { name: string; is_active: boolean } | null;

      // Fallback: si first_name manquant dans apporteur_users, chercher dans apporteur_managers
      let firstName = data.first_name;
      let lastName = data.last_name;
      if (!firstName) {
        const { data: managerData } = await supabase
          .from('apporteur_managers')
          .select('first_name, last_name')
          .eq('apporteur_id', data.apporteur_id)
          .ilike('email', authUser.email ?? '')
          .maybeSingle();
        if (managerData) {
          firstName = managerData.first_name || firstName;
          lastName = managerData.last_name || lastName;
        }
      }

      // Fallback final: metadata auth puis préfixe email
      if (!firstName) {
        const metaFirstName = authUser.user_metadata?.first_name;
        if (typeof metaFirstName === 'string' && metaFirstName.trim()) {
          firstName = metaFirstName.trim();
        }
      }
      if (!firstName && authUser.email) {
        const localPart = authUser.email.split('@')[0] || '';
        const token = localPart.split(/[._-]/).find(Boolean) || '';
        if (token) firstName = token.charAt(0).toUpperCase() + token.slice(1);
      }

      setApporteurUser({
        id: data.id,
        apporteurId: data.apporteur_id,
        apporteurName: apporteurData?.name || 'Apporteur inconnu',
        agencyId: data.agency_id,
        email: data.email,
        firstName,
        lastName,
        role: data.role as 'reader' | 'manager',
        isActive: data.is_active,
        orgIsActive: apporteurData?.is_active ?? true,
      });
    } catch (err) {
      logError('Error loading apporteur data:', err);
      setApporteurUser(null);
    }
  }, []);

  // Écouter les changements d'authentification
  // IMPORTANT: Ne pas utiliser async dans onAuthStateChange pour éviter les deadlocks
  useEffect(() => {
    // 1. Set up listener FIRST (synchronous state updates only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Synchronous updates only
      setUser(session?.user ?? null);
      
      // Defer Supabase calls with setTimeout to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          loadApporteurData(session.user).finally(() => {
            setIsApporteurLoading(false);
          });
        }, 0);
      } else {
        setApporteurUser(null);
        setIsApporteurLoading(false);
      }
    });

    // 2. THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadApporteurData(session.user).finally(() => {
          setIsApporteurLoading(false);
        });
      } else {
        setIsApporteurLoading(false);
      }
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
    isApporteurAuthenticated: !!apporteurUser && apporteurUser.orgIsActive,
    isApporteurLoading,
    user,
    apporteurUser,
    isApporteurManager: apporteurUser?.role === 'manager',
    apporteurId: apporteurUser?.apporteurId || null,
    agencyId: apporteurUser?.agencyId || null,
    isOrgDisabled: apporteurUser ? !apporteurUser.orgIsActive : false,
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
