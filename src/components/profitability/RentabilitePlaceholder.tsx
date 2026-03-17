/**
 * RentabilitePlaceholder — Placeholder for the project profitability module.
 * Will be replaced by the real UI in Phase 2.
 */
import { Construction } from 'lucide-react';

export default function RentabilitePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <Construction className="w-10 h-10" />
      <p className="text-sm font-medium">Module Rentabilité Dossier — en cours de développement</p>
    </div>
  );
}
