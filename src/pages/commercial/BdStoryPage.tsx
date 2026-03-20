/**
 * BdStoryPage - Page placeholder du module BD Story
 */

import { BookImage } from 'lucide-react';

export default function BdStoryPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <BookImage className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">BD Story</h2>
      <p className="text-muted-foreground max-w-md">
        Générez des planches BD métier mettant en scène votre équipe dans des interventions réalistes.
      </p>
      <span className="text-xs text-muted-foreground/60 bg-muted px-3 py-1 rounded-full">
        Module en cours de développement
      </span>
    </div>
  );
}
