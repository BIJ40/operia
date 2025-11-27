import { RefreshCw } from 'lucide-react';

interface UpdateBadgeProps {
  className?: string;
}

/**
 * Badge "M.A.J" en forme de panneau/pancarte avec un pied
 * Affiché pendant 7 jours après une mise à jour de contenu
 */
export function UpdateBadge({ className = '' }: UpdateBadgeProps) {
  return (
    <div className={`absolute -top-1 -right-1 z-10 flex flex-col items-center ${className}`}>
      {/* Panneau */}
      <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md border border-primary-foreground/20">
        <RefreshCw className="w-2.5 h-2.5" />
        M.A.J
      </div>
      {/* Pied du panneau */}
      <div className="w-0.5 h-2 bg-primary/80 rounded-b" />
    </div>
  );
}

// Helper to check if section was recently updated (within 7 days)
export const isSectionUpdated = (contentUpdatedAt?: string | null) => {
  if (!contentUpdatedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(contentUpdatedAt) > sevenDaysAgo;
};
