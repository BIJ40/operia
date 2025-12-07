/**
 * Widget Help Academy - Lien rapide vers la documentation
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function HelpAcademyWidget() {
  // Récupère les derniers contenus ajoutés
  const { data: recentBlocks } = useQuery({
    queryKey: ['widget-recent-academy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, title, slug, type, icon, updated_at')
        .eq('type', 'article')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  const quickLinks = [
    { label: 'Apogée', href: '/helpconfort', icon: '📘' },
    { label: 'Apporteurs', href: '/apporteurs', icon: '🤝' },
    { label: 'Guides', href: '/helpconfort', icon: '📚' },
  ];

  return (
    <div className="space-y-3">
      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg',
              'bg-helpconfort-blue/5 hover:bg-helpconfort-blue/10',
              'transition-colors text-center'
            )}
          >
            <span className="text-lg">{link.icon}</span>
            <span className="text-xs font-medium text-helpconfort-blue">
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Dernières mises à jour */}
      {recentBlocks && recentBlocks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Récemment mis à jour
          </p>
          {recentBlocks.slice(0, 2).map((block) => (
            <Link
              key={block.id}
              to={`/helpconfort/${block.slug}`}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-helpconfort-blue shrink-0" />
              <span className="text-xs truncate flex-1">{block.title}</span>
            </Link>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        to="/helpconfort"
        className={cn(
          'flex items-center justify-center gap-2 p-2 rounded-lg',
          'bg-helpconfort-blue text-white',
          'hover:bg-helpconfort-blue/90 transition-colors'
        )}
      >
        <GraduationCap className="h-4 w-4" />
        <span className="text-sm font-medium">Accéder à Help Academy</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
