/**
 * Widget Guides - Accès rapide aux guides Help Academy
 */

import { BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function GuidesWidget() {
  const quickLinks = [
    { label: 'Guide Apogée', path: '/category/documentation' },
    { label: 'Guides métiers', path: '/category/guides-metiers' },
    { label: 'Procédures', path: '/category/procedures' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-helpconfort-blue" />
        <span className="text-sm font-medium">Accès rapide</span>
      </div>
      
      <div className="space-y-2 flex-1">
        {quickLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors text-sm"
          >
            <span>{link.label}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
        <Link to="/help-academy">
          Voir tous les guides
        </Link>
      </Button>
    </div>
  );
}
