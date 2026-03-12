/**
 * DataPreloadContext - Orchestration du préchargement des données Apogée
 * 
 * Responsabilités:
 * - Détection automatique des conditions de préchargement
 * - Gestion des steps pondérés avec progression en temps réel
 * - Modes non-bloquant (défaut) et bloquant (erreur critique)
 * - Gestion du cache session versionnée
 * - Invalidation sur changement d'agence/impersonation
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePermissions as usePermissionsCtx } from '@/contexts/PermissionsContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

import { apogeeProxy } from '@/services/apogeeProxy';
import { logApogee } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface PreloadStep {
  key: string;
  label: string;
  weight: number;
  critical: boolean;
  status: StepStatus;
  error?: string;
}

export type PreloadMode = 'non-blocking' | 'blocking';

interface PreloadSessionMeta {
  completedAt: number;
  agencySlug: string;
  userId: string;
  version: 'v1';
  stepResults: Record<string, 'done' | 'error'>;
}

interface DataPreloadContextType {
  // État
  isPreloading: boolean;
  progress: number;
  steps: PreloadStep[];
  mode: PreloadMode;
  error: string | null;
  isDegraded: boolean;
  isMinimized: boolean;
  isVisible: boolean;
  
  // Actions
  startPreload: () => Promise<void>;
  retryPreload: () => Promise<void>;
  skipPreload: () => void;
  minimize: () => void;
  maximize: () => void;
  dismiss: () => void;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PRELOAD_STEPS_CONFIG: Omit<PreloadStep, 'status' | 'error'>[] = [
  { key: 'users', label: 'Utilisateurs', weight: 10, critical: false },
  { key: 'clients', label: 'Clients', weight: 15, critical: false },
  { key: 'projects', label: 'Projets', weight: 25, critical: false },
  { key: 'interventions', label: 'Interventions', weight: 20, critical: false },
  { key: 'factures', label: 'Factures', weight: 20, critical: false },
  { key: 'devis', label: 'Devis', weight: 10, critical: false },
];

const TOTAL_WEIGHT = PRELOAD_STEPS_CONFIG.reduce((sum, s) => sum + s.weight, 0);
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures
const SESSION_VERSION = 'v1';
const UI_SHOWN_PREFIX = 'preload_ui_shown';

// =============================================================================
// CONTEXT
// =============================================================================

const DataPreloadContext = createContext<DataPreloadContextType | undefined>(undefined);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSessionKey(userId: string, agencySlug: string): string {
  return `preload:${userId}:${agencySlug}:${SESSION_VERSION}`;
}

function getUiShownKey(userId: string, agencySlug: string): string {
  return `${UI_SHOWN_PREFIX}:${userId}:${agencySlug}:${SESSION_VERSION}`;
}

function hasUiBeenShown(userId: string, agencySlug: string): boolean {
  try {
    return !!sessionStorage.getItem(getUiShownKey(userId, agencySlug));
  } catch {
    return false;
  }
}

function markUiShown(userId: string, agencySlug: string): void {
  try {
    sessionStorage.setItem(getUiShownKey(userId, agencySlug), String(Date.now()));
  } catch {
    // Ignore
  }
}

function getSessionMeta(userId: string, agencySlug: string): PreloadSessionMeta | null {
  try {
    const key = getSessionKey(userId, agencySlug);
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as PreloadSessionMeta;
  } catch {
    return null;
  }
}

function setSessionMeta(meta: PreloadSessionMeta): void {
  try {
    const key = getSessionKey(meta.userId, meta.agencySlug);
    sessionStorage.setItem(key, JSON.stringify(meta));
    logApogee.debug(`[PRELOAD] Session meta saved: ${key}`);
  } catch (e) {
    logApogee.warn('[PRELOAD] Failed to save session meta', e);
  }
}

function clearSessionMeta(userId: string, agencySlug: string): void {
  try {
    const key = getSessionKey(userId, agencySlug);
    sessionStorage.removeItem(key);
    logApogee.debug(`[PRELOAD] Session meta cleared: ${key}`);
  } catch {
    // Ignore
  }
}

function initializeSteps(): PreloadStep[] {
  return PRELOAD_STEPS_CONFIG.map(step => ({
    ...step,
    status: 'pending' as StepStatus,
  }));
}

// =============================================================================
// PROVIDER
// =============================================================================

export function DataPreloadProvider({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuthCore();
  const { agence } = useProfile();
  const { globalRole } = usePermissionsCtx();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  const { hasModule, hasModuleOption } = usePermissionsCtx();
  
  // État
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<PreloadStep[]>(initializeSteps);
  const [mode, setMode] = useState<PreloadMode>('non-blocking');
  const [error, setError] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Refs pour éviter les re-renders
  const hasTriggeredRef = useRef(false);
  const previousAgencyRef = useRef<string | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Agence effective (impersonation ou réelle)
  const effectiveAgence = useMemo(() => {
    if (isRealUserImpersonation && impersonatedUser?.agence) {
      return impersonatedUser.agence;
    }
    return agence;
  }, [isRealUserImpersonation, impersonatedUser, agence]);
  
  // Vérifier si l'utilisateur a accès aux stats
  const hasStatsAccess = useMemo(() => {
    // Admin bypass
    if (globalRole === 'platform_admin' || globalRole === 'superadmin') {
      return true;
    }
    // Vérifier les modules stats — clé canonique G3
    return hasModule('pilotage.statistiques' as any);
  }, [globalRole, hasModule]);
  
  // Fonction de mise à jour de progression throttlée
  const updateProgress = useCallback((newProgress: number) => {
    if (throttleTimeoutRef.current) return;
    
    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;
    }, 100);
    
    requestAnimationFrame(() => {
      setProgress(newProgress);
    });
  }, []);
  
  // Fonction de mise à jour d'un step
  const updateStep = useCallback((stepKey: string, status: StepStatus, stepError?: string) => {
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => 
        step.key === stepKey 
          ? { ...step, status, error: stepError }
          : step
      );
      
      // Calculer la progression
      const doneWeight = newSteps
        .filter(s => s.status === 'done')
        .reduce((sum, s) => sum + s.weight, 0);
      
      updateProgress(Math.round((doneWeight / TOTAL_WEIGHT) * 100));
      
      return newSteps;
    });
  }, [updateProgress]);
  
  // Vérifier si le préchargement doit être déclenché
  const shouldTriggerPreload = useCallback((): boolean => {
    // 1. Conditions de base
    if (!user || isAuthLoading || isModulesLoading) {
      logApogee.debug('[PRELOAD] Skip: auth or modules loading');
      return false;
    }
    
    // 2. Agence requise
    if (!effectiveAgence) {
      logApogee.debug('[PRELOAD] Skip: no agency');
      return false;
    }
    
    // 3. Accès stats requis
    if (!hasStatsAccess) {
      logApogee.debug('[PRELOAD] Skip: no stats access');
      return false;
    }
    
    // 4. Vérifier le cache session ET le cache mémoire apogeeProxy
    // Le cache session peut être valide mais le cache mémoire peut être vide (après refresh/deco-reco)
    const meta = getSessionMeta(user.id, effectiveAgence);
    if (meta) {
      const age = Date.now() - meta.completedAt;
      if (age < CACHE_TTL_MS) {
        // Vérifier si le cache mémoire proxy est encore chaud (au moins les projets)
        const hasMemoryCache = apogeeProxy.hasCachedData('apiGetProjects', effectiveAgence);
        if (hasMemoryCache) {
          logApogee.debug(`[PRELOAD] Skip: session + memory cache valid (${Math.round(age / 60000)}min old)`);
          return false;
        }
        // Cache session ok mais mémoire vide → forcer le preload
        logApogee.info('[PRELOAD] Session cache valid but memory cache empty → will preload');
      } else {
        logApogee.debug('[PRELOAD] Session cache expired, will preload');
      }
    }
    
    return true;
  }, [user, isAuthLoading, isModulesLoading, effectiveAgence, hasStatsAccess]);
  
  // Fonction de préchargement principale
  const executePreload = useCallback(async (opts?: { showUI?: boolean }) => {
    if (!user || !effectiveAgence) return;

    const showUI = opts?.showUI ?? true;
    
    logApogee.info(`[PRELOAD] Starting for agency: ${effectiveAgence}`);
    
    setIsPreloading(true);
    setIsVisible(showUI);
    setProgress(0);
    setError(null);
    setIsDegraded(false);
    setMode('non-blocking');
    setSteps(initializeSteps());

    // IMPORTANT: ne montrer la pop-up qu'après connexion (pas après refresh).
    // Une fois affichée dans cette session d'onglet, on la masque aux triggers suivants.
    if (showUI) {
      markUiShown(user.id, effectiveAgence);
    }
    
    const stepResults: Record<string, 'done' | 'error'> = {};
    let hasCriticalError = false;
    let hasAnyError = false;
    
    // Mapper les steps aux appels API
    const apiCalls: Record<string, () => Promise<any>> = {
      users: () => apogeeProxy.getUsers({ agencySlug: effectiveAgence }),
      clients: () => apogeeProxy.getClients({ agencySlug: effectiveAgence }),
      projects: () => apogeeProxy.getProjects({ agencySlug: effectiveAgence }),
      interventions: () => apogeeProxy.getInterventions({ agencySlug: effectiveAgence }),
      factures: () => apogeeProxy.getFactures({ agencySlug: effectiveAgence }),
      devis: () => apogeeProxy.getDevis({ agencySlug: effectiveAgence }),
    };
    
    // Exécuter tous les appels en parallèle
    const promises = PRELOAD_STEPS_CONFIG.map(async (stepConfig) => {
      const { key, critical } = stepConfig;
      
      updateStep(key, 'active');
      
      try {
        await apiCalls[key]();
        updateStep(key, 'done');
        stepResults[key] = 'done';
        logApogee.debug(`[PRELOAD] Step ${key} completed`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        updateStep(key, 'error', errorMsg);
        stepResults[key] = 'error';
        hasAnyError = true;
        
        if (critical) {
          hasCriticalError = true;
          logApogee.error(`[PRELOAD] Critical step ${key} failed:`, err);
        } else {
          logApogee.warn(`[PRELOAD] Non-critical step ${key} failed:`, err);
        }
      }
    });
    
    await Promise.allSettled(promises);
    
    // Gérer le résultat
    if (hasCriticalError) {
      setMode('blocking');
      setError('Une erreur critique s\'est produite. Veuillez réessayer.');
      logApogee.error('[PRELOAD] Completed with critical errors');
    } else if (hasAnyError) {
      setIsDegraded(true);
      logApogee.warn('[PRELOAD] Completed in degraded mode');
      
      // Sauvegarder le meta session même en mode dégradé
      setSessionMeta({
        completedAt: Date.now(),
        agencySlug: effectiveAgence,
        userId: user.id,
        version: SESSION_VERSION,
        stepResults,
      });
      
      // Fermer après un délai
      setTimeout(() => {
        setIsVisible(false);
        setIsPreloading(false);
      }, 2000);
    } else {
      logApogee.info('[PRELOAD] Completed successfully');
      
      // Sauvegarder le meta session
      setSessionMeta({
        completedAt: Date.now(),
        agencySlug: effectiveAgence,
        userId: user.id,
        version: SESSION_VERSION,
        stepResults,
      });
      
      // Animation de fermeture
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        setIsPreloading(false);
      }, 1500);
    }
  }, [user, effectiveAgence, updateStep]);
  
  // Actions exposées
  const startPreload = useCallback(async () => {
    await executePreload({ showUI: true });
  }, [executePreload]);
  
  const retryPreload = useCallback(async () => {
    setError(null);
    await executePreload({ showUI: true });
  }, [executePreload]);
  
  const skipPreload = useCallback(() => {
    setIsVisible(false);
    setIsPreloading(false);
    logApogee.info('[PRELOAD] Skipped by user');
  }, []);
  
  const minimize = useCallback(() => {
    setIsMinimized(true);
  }, []);
  
  const maximize = useCallback(() => {
    setIsMinimized(false);
  }, []);
  
  const dismiss = useCallback(() => {
    if (mode !== 'blocking') {
      setIsVisible(false);
    }
  }, [mode]);
  
  // Effet de déclenchement automatique
  useEffect(() => {
    // Ne pas déclencher si déjà en cours ou déjà déclenché cette session
    if (isPreloading || hasTriggeredRef.current) return;
    
    // Attendre que tout soit chargé
    if (isAuthLoading || isModulesLoading) return;
    
    // Vérifier les conditions
    if (shouldTriggerPreload()) {
      hasTriggeredRef.current = true;
      const showUI = (() => {
        if (!user || !effectiveAgence) return true;
        // Si on a déjà un meta de session (préchargement terminé),
        // alors on ne ré-affiche pas la pop-up lors d'un simple refresh.
        const hasCompletedSession = !!getSessionMeta(user.id, effectiveAgence);
        if (hasCompletedSession) return false;
        return !hasUiBeenShown(user.id, effectiveAgence);
      })();
      executePreload({ showUI });
    }
  }, [isAuthLoading, isModulesLoading, isPreloading, shouldTriggerPreload, executePreload, user, effectiveAgence]);
  
  // Effet d'invalidation sur changement d'agence
  useEffect(() => {
    if (!user || !effectiveAgence) return;
    
    // Si l'agence a changé, réinitialiser
    if (previousAgencyRef.current && previousAgencyRef.current !== effectiveAgence) {
      logApogee.info(`[PRELOAD] Agency changed: ${previousAgencyRef.current} → ${effectiveAgence}`);
      
      // Clear l'ancien cache session
      clearSessionMeta(user.id, previousAgencyRef.current);
      
      // Reset les flags pour permettre un nouveau préchargement
      hasTriggeredRef.current = false;
      setIsPreloading(false);
      setIsVisible(false);
      setProgress(0);
      setSteps(initializeSteps());
    }
    
    previousAgencyRef.current = effectiveAgence;
  }, [user, effectiveAgence]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);
  
  const value: DataPreloadContextType = {
    isPreloading,
    progress,
    steps,
    mode,
    error,
    isDegraded,
    isMinimized,
    isVisible,
    startPreload,
    retryPreload,
    skipPreload,
    minimize,
    maximize,
    dismiss,
  };
  
  return (
    <DataPreloadContext.Provider value={value}>
      {children}
    </DataPreloadContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useDataPreload(): DataPreloadContextType {
  const context = useContext(DataPreloadContext);
  if (!context) {
    throw new Error('useDataPreload must be used within DataPreloadProvider');
  }
  return context;
}
