/**
 * Widget FAQ - Accès rapide à la FAQ
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function FaqWidget() {
  const { data: faqItems, isLoading } = useQuery({
    queryKey: ['widget-faq-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_items')
        .select('id, question')
        .eq('is_published', true)
        .order('display_order')
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-5 w-5 text-helpconfort-blue" />
        <span className="text-sm font-medium">Questions fréquentes</span>
      </div>
      
      <div className="space-y-2 flex-1">
        {faqItems && faqItems.length > 0 ? (
          faqItems.map((item) => (
            <Link
              key={item.id}
              to={`/support/faq#${item.id}`}
              className="block p-2 rounded-lg hover:bg-accent/50 transition-colors text-sm line-clamp-2"
            >
              {item.question}
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune FAQ disponible
          </p>
        )}
      </div>

      <Link
        to="/support/faq"
        className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
      >
        <HelpCircle className="h-3 w-3" />
        Voir toutes les FAQ
      </Link>
    </div>
  );
}
