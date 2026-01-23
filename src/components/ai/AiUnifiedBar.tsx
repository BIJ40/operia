/**
 * AI Unified Bar - Single floating search bar for documentation
 * Always visible, fixed position, results shown inline below
 * V3: Simplified without Live Support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiUnified } from './AiUnifiedContext';
import { AiInlineResult } from './AiInlineResult';
import { cn } from '@/lib/utils';

const QUICK_EXAMPLES = [
  "Comment créer un devis ?",
  "Comment gérer les factures ?",
  "Accès aide academy",
  "Comment contacter le support ?",
];

export function AiUnifiedBar() {
  const { 
    isLoading, 
    messages, 
    expand, 
    submitQuery,
    closeResult,
    clearMessages,
  } = useAiUnified();
  
  const [localQuery, setLocalQuery] = useState('');
  const [isBarOpen, setIsBarOpen] = useState(false);
  const [isInteractingWithResults, setIsInteractingWithResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openBar = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsBarOpen(true);
    expand();
  }, [expand]);

  const closeBar = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      if (!isInteractingWithResults) {
        setIsBarOpen(false);
        if (messages.length > 0 || isLoading) {
          closeResult();
          clearMessages();
        }
      }
    }, 300);
  }, [messages.length, isLoading, closeResult, clearMessages, isInteractingWithResults]);

  const handleResultsMouseDown = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsInteractingWithResults(true);
  }, []);

  const handleResultsMouseUp = useCallback(() => {
    setIsInteractingWithResults(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        openBar();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsBarOpen(false);
        if (messages.length > 0) {
          closeResult();
          clearMessages();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openBar, closeResult, clearMessages, messages.length]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuery.trim() || isLoading) return;
    handleResultsMouseDown();
    await submitQuery(localQuery);
    setLocalQuery('');
  };

  const handleExampleClick = (example: string) => {
    handleResultsMouseDown();
    setLocalQuery(example);
    inputRef.current?.focus();
  };

  const hasResults = messages.length > 0;
  const showResultsZone = isBarOpen || localQuery.length > 0 || hasResults || isLoading;

  return (
    <div 
      ref={containerRef}
      className="w-full flex flex-col items-center py-3 relative overflow-hidden"
    >
      <div className="w-full max-w-5xl px-4 relative flex items-center gap-3">
        <motion.div
          initial={false}
          animate={{
            boxShadow: showResultsZone
              ? '0 8px 30px -5px rgba(0, 113, 188, 0.25), 0 0 0 1px rgba(0, 113, 188, 0.1)'
              : '0 2px 10px -2px rgba(0, 0, 0, 0.1)'
          }}
          className="relative rounded-full overflow-hidden flex-1"
        >
          {showResultsZone && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute -inset-[1px] rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-helpconfort-blue/40 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{ width: '200%' }}
                />
              </div>
            </motion.div>
          )}

          <form 
            onSubmit={handleSubmit}
            className={cn(
              "relative flex items-center gap-2",
              "bg-background/98 backdrop-blur-sm",
              "rounded-full",
              "px-4 py-2.5",
              "border border-border/50"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-helpconfort-blue animate-spin shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-helpconfort-blue shrink-0" />
            )}
            
            <Input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onFocus={openBar}
              onBlur={closeBar}
              placeholder="Posez votre question..."
              disabled={isLoading}
              className={cn(
                "flex-1 border-0 bg-transparent h-8",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground/60 text-sm"
              )}
            />
            
            <div className="flex items-center gap-1 shrink-0">
              {localQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setLocalQuery('')}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
              
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border/50 text-muted-foreground">
                ⌘K
              </kbd>
              
              <Button
                type="submit"
                size="sm"
                disabled={!localQuery.trim() || isLoading}
                className="rounded-full px-3 h-7 text-xs bg-helpconfort-blue hover:bg-helpconfort-blue/90"
              >
                {isLoading ? 'Recherche...' : 'Envoyer'}
              </Button>
            </div>
          </form>
        </motion.div>

        <AnimatePresence>
          {showResultsZone && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 px-4"
              onMouseDown={handleResultsMouseDown}
              onMouseUp={handleResultsMouseUp}
            >
              <div className="bg-background border border-border rounded-xl shadow-2xl max-h-[70vh] overflow-auto">
                <AiInlineResult
                  messages={messages}
                  isLoading={isLoading}
                  onClose={() => {
                    setIsBarOpen(false);
                    closeResult();
                    clearMessages();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isBarOpen && !localQuery && !hasResults && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-wrap gap-2 justify-center mt-3 px-4"
            onMouseDown={handleResultsMouseDown}
            onMouseUp={handleResultsMouseUp}
          >
            {QUICK_EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExampleClick(example);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full",
                  "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                  "border border-border/50 hover:border-border",
                  "transition-colors"
                )}
              >
                {example}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
