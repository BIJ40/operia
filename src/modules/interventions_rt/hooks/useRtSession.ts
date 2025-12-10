// Hook pour gérer une session de relevé technique
// Version mockée - sera connectée à Supabase plus tard

import { useState, useCallback, useRef, useEffect } from 'react';
import { RtEngine } from '../services/rtEngine';
import { rtTreePlomberie } from '../services/rtTreePlomberie';
import { logDebug } from '@/lib/logger';
import { 
  RtSession, 
  RtAnswer, 
  InterventionMode, 
  RunnerState,
  QuestionNode,
  RtQuestionSuggestion
} from '../types';

interface UseRtSessionResult {
  // Session
  session: RtSession | null;
  isLoading: boolean;
  error: Error | null;
  
  // Engine
  engine: RtEngine | null;
  currentNode: QuestionNode | null;
  runnerState: RunnerState | null;
  
  // Actions
  startSession: (interventionId: string, mode: InterventionMode) => void;
  resumeSession: (interventionId: string) => void;
  setAnswer: (nodeId: string, value: any) => void;
  goNext: () => boolean;
  goBack: () => boolean;
  canGoBack: () => boolean;
  isAtEnd: () => boolean;
  addPhoto: (nodeId: string, url: string) => void;
  submitSuggestion: (suggestion: Omit<RtQuestionSuggestion, 'id' | 'status' | 'created_at'>) => void;
  completeSession: () => void;
  
  // Data
  getAnswersSummary: () => Array<{ nodeId: string; question: string; answer: any; branch: string }>;
  getAllPhotos: () => string[];
}

// Mock storage for sessions (in-memory)
const mockSessions: Map<string, { session: RtSession; state: RunnerState }> = new Map();
const mockSuggestions: RtQuestionSuggestion[] = [];

export function useRtSession(): UseRtSessionResult {
  const [session, setSession] = useState<RtSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [runnerState, setRunnerState] = useState<RunnerState | null>(null);
  
  const engineRef = useRef<RtEngine | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new RtEngine(rtTreePlomberie);
    }
  }, []);

  const updateState = useCallback(() => {
    if (engineRef.current) {
      setRunnerState(engineRef.current.getState());
    }
  }, []);

  const startSession = useCallback((interventionId: string, mode: InterventionMode) => {
    setIsLoading(true);
    
    // Check if session already exists
    const existing = mockSessions.get(interventionId);
    if (existing) {
      setSession(existing.session);
      engineRef.current?.loadState(existing.state);
      updateState();
      setIsLoading(false);
      return;
    }

    // Create new session
    const newSession: RtSession = {
      id: `rt-${Date.now()}`,
      intervention_id: interventionId,
      tech_id: 1, // Mock
      univers: 'plomberie',
      mode,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Reset engine
    engineRef.current?.reset();
    const state = engineRef.current?.getState();
    
    if (state) {
      mockSessions.set(interventionId, { session: newSession, state });
    }

    setSession(newSession);
    updateState();
    setIsLoading(false);
  }, [updateState]);

  const resumeSession = useCallback((interventionId: string) => {
    setIsLoading(true);
    
    const existing = mockSessions.get(interventionId);
    if (existing) {
      setSession(existing.session);
      engineRef.current?.loadState(existing.state);
      updateState();
    } else {
      setError(new Error('Session non trouvée'));
    }
    
    setIsLoading(false);
  }, [updateState]);

  const setAnswer = useCallback((nodeId: string, value: any) => {
    if (!engineRef.current || !session) return;
    
    engineRef.current.setAnswer(nodeId, value);
    updateState();
    
    // Auto-save to mock storage
    const state = engineRef.current.getState();
    mockSessions.set(session.intervention_id, { 
      session: { ...session, updated_at: new Date().toISOString() }, 
      state 
    });
  }, [session, updateState]);

  const goNext = useCallback((): boolean => {
    if (!engineRef.current) return false;
    
    const nextNode = engineRef.current.goNext();
    updateState();
    
    // Save state
    if (session) {
      const state = engineRef.current.getState();
      mockSessions.set(session.intervention_id, { 
        session: { ...session, updated_at: new Date().toISOString() }, 
        state 
      });
    }
    
    return nextNode !== null;
  }, [session, updateState]);

  const goBack = useCallback((): boolean => {
    if (!engineRef.current) return false;
    
    const prevNode = engineRef.current.goBack();
    updateState();
    return prevNode !== null;
  }, [updateState]);

  const canGoBack = useCallback((): boolean => {
    return engineRef.current?.canGoBack() ?? false;
  }, []);

  const isAtEnd = useCallback((): boolean => {
    return engineRef.current?.isAtEnd() ?? false;
  }, []);

  const addPhoto = useCallback((nodeId: string, url: string) => {
    if (!engineRef.current) return;
    
    engineRef.current.addPhoto(nodeId, url);
    updateState();
  }, [updateState]);

  const submitSuggestion = useCallback((suggestion: Omit<RtQuestionSuggestion, 'id' | 'status' | 'created_at'>) => {
    const newSuggestion: RtQuestionSuggestion = {
      ...suggestion,
      id: `sug-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    mockSuggestions.push(newSuggestion);
    logDebug('[RT Session] Suggestion submitted:', newSuggestion);
  }, []);

  const completeSession = useCallback(() => {
    if (!session) return;
    
    const updatedSession: RtSession = {
      ...session,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };
    
    setSession(updatedSession);
    
    if (engineRef.current) {
      const state = engineRef.current.getState();
      mockSessions.set(session.intervention_id, { session: updatedSession, state });
    }
  }, [session]);

  const getAnswersSummary = useCallback(() => {
    return engineRef.current?.getAnswersSummary() ?? [];
  }, []);

  const getAllPhotos = useCallback(() => {
    return engineRef.current?.getPhotos() ?? [];
  }, []);

  const currentNode = engineRef.current?.getCurrentNode() ?? null;

  return {
    session,
    isLoading,
    error,
    engine: engineRef.current,
    currentNode,
    runnerState,
    startSession,
    resumeSession,
    setAnswer,
    goNext,
    goBack,
    canGoBack,
    isAtEnd,
    addPhoto,
    submitSuggestion,
    completeSession,
    getAnswersSummary,
    getAllPhotos,
  };
}

// Export mock suggestions for admin view
export function getMockSuggestions(): RtQuestionSuggestion[] {
  return [...mockSuggestions];
}

export default useRtSession;
