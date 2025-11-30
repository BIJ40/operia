/**
 * FAQ Page - Public listing of FAQ items
 * P2#3 - Grouped by context and category
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Link } from 'react-router-dom';

const CONTEXT_LABELS: Record<string, string> = {
  apogee: 'Apogée',
  apporteurs: 'Apporteurs',
  helpconfort: 'HelpConfort',
  documents: 'Documents',
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
    <div className="container max-w-4xl mx-auto px-4 py-6">

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Context filter */}
              <Select value={contextFilter} onValueChange={setContextFilter}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[180px]">
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

              <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Items */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune question trouvée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([context, ctxItems]) => (
              <Card key={context}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline">{CONTEXT_LABELS[context] || context}</Badge>
                    <span className="text-sm text-muted-foreground font-normal">
                      ({ctxItems.length} question{ctxItems.length > 1 ? 's' : ''})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {ctxItems.map((item) => (
                      <AccordionItem key={item.id} value={item.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-start gap-2 pr-4">
                            <HelpCircle className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                            <span>{item.question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-6 space-y-3">
                            <p className="whitespace-pre-wrap text-sm">{item.answer}</p>

                            {/* Category badge */}
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
