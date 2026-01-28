/**
 * FAQ Page - Public listing of FAQ items
 * P2#3 - Grouped by context and category
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Loader2, HelpCircle, Search, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { getFaqItems, getFaqCategories, type FaqItem, type FaqCategory } from '@/lib/rag-improvement';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmCard } from '@/components/ui/warm-card';
import { WarmEmptyState } from '@/components/ui/warm-empty-state';

const CONTEXT_LABELS: Record<string, string> = {
  apogee: 'Apogée',
  apporteurs: 'Apporteurs',
  helpconfort: 'HelpConfort',
  documents: 'Documents',
};

const CONTEXT_COLORS: Record<string, 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal'> = {
  apogee: 'blue',
  apporteurs: 'orange',
  helpconfort: 'teal',
  documents: 'purple',
};

export default function Faq() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [faqItems, faqCategories] = await Promise.all([
      getFaqItems({
        contextType: contextFilter !== 'all' ? contextFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        publishedOnly: true,
      }),
      getFaqCategories(),
    ]);
    setItems(faqItems);
    setCategories(faqCategories);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [contextFilter, categoryFilter]);

  // Filter by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query)
    );
  });

  // Group by context then category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const ctx = item.context_type || 'autre';
    if (!acc[ctx]) acc[ctx] = [];
    acc[ctx].push(item);
    return acc;
  }, {} as Record<string, FaqItem[]>);

  return (
    <WarmPageContainer 
      maxWidth="4xl" 
      title="Questions fréquentes"
      description="Trouvez rapidement des réponses à vos questions"
    >
      {/* Filters */}
      <WarmCard variant="muted" padding="compact">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          {/* Context filter */}
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <SelectValue placeholder="Contexte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous contextes</SelectItem>
              <SelectItem value="apogee">Apogée</SelectItem>
              <SelectItem value="apporteurs">Apporteurs</SelectItem>
              <SelectItem value="helpconfort">HelpConfort</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadData} 
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </WarmCard>

      {/* FAQ Items */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <WarmCard>
          <WarmEmptyState
            icon={HelpCircle}
            title="Aucune question trouvée"
            description="Essayez d'ajuster vos filtres de recherche"
            accentColor="muted"
          />
        </WarmCard>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([context, ctxItems]) => (
            <WarmCard 
              key={context} 
              variant="accent" 
              accentColor={CONTEXT_COLORS[context] || 'blue'}
              padding="normal"
            >
              <div className="flex items-center gap-3 mb-4">
                <Badge 
                  variant="outline" 
                  className="rounded-lg px-3 py-1 text-sm font-medium"
                >
                  {CONTEXT_LABELS[context] || context}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {ctxItems.length} question{ctxItems.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <Accordion type="multiple" className="w-full">
                {ctxItems.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="border-b-muted/50">
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <div className="flex items-start gap-3 pr-4">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-9 space-y-3">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>

                        {/* Category badge */}
                        {item.category && (
                          <Badge variant="secondary" className="text-xs rounded-lg">
                            {item.category.label}
                          </Badge>
                        )}

                        {/* Linked blocks */}
                        {item.linked_block_ids && item.linked_block_ids.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <LinkIcon className="h-3 w-3" />
                            <span>{item.linked_block_ids.length} bloc(s) lié(s)</span>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </WarmCard>
          ))}
        </div>
      )}
    </WarmPageContainer>
  );
}
