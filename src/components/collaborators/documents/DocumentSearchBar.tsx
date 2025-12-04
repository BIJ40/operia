/**
 * Barre de recherche full-text pour documents RH (P2-02)
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
  onStartSearch: () => void;
  onCancelSearch: () => void;
  resultCount: number;
  isLoading: boolean;
  className?: string;
}

export function DocumentSearchBar({
  searchQuery,
  onSearchChange,
  isSearching,
  onStartSearch,
  onCancelSearch,
  resultCount,
  isLoading,
  className,
}: DocumentSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search mode is activated
  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearching]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to start search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        onStartSearch();
      }
      // Escape to cancel search
      if (e.key === 'Escape' && isSearching) {
        onCancelSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearching, onStartSearch, onCancelSearch]);

  if (!isSearching) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onStartSearch}
        className={cn("gap-2", className)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
          ⌘F
        </kbd>
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Rechercher un document..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {searchQuery.length >= 2 && !isLoading && (
            <Badge variant="secondary" className="text-xs">
              {resultCount} résultat{resultCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCancelSearch}
        className="shrink-0"
        aria-label="Annuler la recherche"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
