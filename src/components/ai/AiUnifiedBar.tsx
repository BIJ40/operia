/**
 * AI Unified Bar - Single floating search bar for all AI interactions
 * Always visible, fixed position, results shown inline below
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, X, Loader2, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiUnified } from './AiUnifiedContext';
import { AiInlineResult } from './AiInlineResult';
import { cn } from '@/lib/utils';

const QUICK_EXAMPLES = [
  "Quel est mon CA ce mois ?",
  "Top techniciens",
  "Taux SAV par univers",
  "Comment créer un devis ?",
];

export function AiUnifiedBar() {
  const { 
    isExpanded, 
    isLoading, 
    messages, 
    mode,
    expand, 
    collapse, 
    submitQuery,
    closeResult,
    clearMessages,
  } = useAiUnified();
  
  const [localQuery, setLocalQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        expand();
      }
      if (e.key === 'Escape') {
        if (isFocused) {
          inputRef.current?.blur();
          setIsFocused(false);
        }
        if (messages.length > 0) {
          closeResult();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expand, closeResult, isFocused, messages.length]);

  // Click outside to collapse (only if no results)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (messages.length === 0 && !isLoading) {
          setIsFocused(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [messages.length, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuery.trim() || isLoading) return;
    await submitQuery(localQuery);
    setLocalQuery('');
  };

  const handleExampleClick = (example: string) => {
    setLocalQuery(example);
    inputRef.current?.focus();
  };

  const hasResults = messages.length > 0;

  return (
    <div 
      ref={containerRef}
      className="w-full flex flex-col items-center py-3 relative z-40"
    >
      {/* Main Search Bar - Always visible */}
      <div className="w-full max-w-2xl px-4">
        <motion.div
          initial={false}
          animate={{
            boxShadow: isFocused || hasResults
              ? '0 8px 30px -5px rgba(0, 113, 188, 0.25), 0 0 0 1px rgba(0, 113, 188, 0.1)'
              : '0 2px 10px -2px rgba(0, 0, 0, 0.1)'
          }}
          className="relative rounded-full overflow-hidden"
        >
          {/* Animated glow border when focused */}
          {(isFocused || hasResults) && (
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
              onFocus={() => {
                setIsFocused(true);
                expand();
              }}
              onBlur={() => setIsFocused(false)}
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

        {/* Quick examples - show when focused and no query */}
        {isFocused && !localQuery && !hasResults && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-wrap gap-2 justify-center mt-3"
          >
            {QUICK_EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExampleClick(example)}
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
      </div>

      {/* Inline Results - Displayed below the search bar */}
      {(hasResults || isLoading) && (
        <div className="w-full max-w-2xl px-4 mt-2">
          <AiInlineResult
            messages={messages}
            isLoading={isLoading}
            onClose={() => {
              closeResult();
              clearMessages();
            }}
          />
        </div>
      )}
    </div>
  );
}
