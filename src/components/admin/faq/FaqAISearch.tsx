/**
 * FAQ AI Search - Intelligent search using Lovable AI
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FaqItem } from './types';
import { toast } from 'sonner';

interface SearchResult {
  item: FaqItem;
  score: number;
  reason: string;
}

interface FaqAISearchProps {
  onResults: (results: FaqItem[] | null) => void;
  onClear: () => void;
}

export function FaqAISearch({ onResults, onClear }: FaqAISearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('faq-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        onResults(data.results);
        setHasResults(true);
        toast.success(`${data.results.length} FAQ trouvées`);
      } else {
        onResults([]);
        setHasResults(true);
        toast.info('Aucune FAQ pertinente trouvée');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche IA');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setHasResults(false);
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Recherche intelligente... (ex: comment gérer les avoirs)"
            className="pl-10 pr-10 border-violet-200 focus:border-violet-400 focus:ring-violet-400"
          />
          {hasResults && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </>
          )}
        </Button>
      </div>
      
      {hasResults && (
        <div className="mt-2">
          <Badge variant="secondary" className="bg-violet-100 text-violet-700">
            <Sparkles className="h-3 w-3 mr-1" />
            Résultats IA
          </Badge>
        </div>
      )}
    </div>
  );
}
