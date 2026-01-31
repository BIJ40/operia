/**
 * Onglets de navigation par catégorie - Finder RH
 */

import { cn } from '@/lib/utils';
import { DocumentType, DOCUMENT_TYPES } from '@/types/collaboratorDocument';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Receipt, 
  FileCheck, 
  FileWarning, 
  Stethoscope, 
  AlertTriangle,
  StickyNote,
  FolderOpen 
} from 'lucide-react';

interface DocumentCategoryTabsProps {
  activeCategory: DocumentType | 'ALL';
  onCategoryChange: (category: DocumentType | 'ALL') => void;
  counts: Record<string, number>;
  totalCount: number;
}

const CATEGORY_ICONS: Record<DocumentType | 'ALL', React.ElementType> = {
  ALL: FolderOpen,
  PAYSLIP: Receipt,
  CONTRACT: FileCheck,
  AVENANT: FileText,
  ATTESTATION: FileText,
  MEDICAL_VISIT: Stethoscope,
  SANCTION: AlertTriangle,
  HR_NOTE: StickyNote,
  OTHER: FileWarning,
};

// Warm pastel theme colors
const CATEGORY_COLORS: Record<DocumentType | 'ALL', string> = {
  ALL: 'text-warm-teal',
  PAYSLIP: 'text-warm-orange',
  CONTRACT: 'text-warm-blue',
  AVENANT: 'text-warm-purple',
  ATTESTATION: 'text-warm-green',
  MEDICAL_VISIT: 'text-warm-teal',
  SANCTION: 'text-warm-red',
  HR_NOTE: 'text-warm-pink',
  OTHER: 'text-muted-foreground',
};

const CATEGORY_BG_ACTIVE: Record<DocumentType | 'ALL', string> = {
  ALL: 'bg-warm-teal',
  PAYSLIP: 'bg-warm-orange',
  CONTRACT: 'bg-warm-blue',
  AVENANT: 'bg-warm-purple',
  ATTESTATION: 'bg-warm-green',
  MEDICAL_VISIT: 'bg-warm-teal',
  SANCTION: 'bg-warm-red',
  HR_NOTE: 'bg-warm-pink',
  OTHER: 'bg-muted-foreground',
};

export function DocumentCategoryTabs({
  activeCategory,
  onCategoryChange,
  counts,
  totalCount,
}: DocumentCategoryTabsProps) {
  const categories: Array<{ value: DocumentType | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Tous' },
    ...DOCUMENT_TYPES,
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
      {categories.map(({ value, label }) => {
        const count = value === 'ALL' ? totalCount : (counts[value] || 0);
        const isActive = activeCategory === value;
        const Icon = CATEGORY_ICONS[value];
        const colorClass = CATEGORY_COLORS[value];
        const bgClass = CATEGORY_BG_ACTIVE[value];

        // Skip categories with 0 documents (except ALL and active)
        if (count === 0 && value !== 'ALL' && !isActive) return null;

        return (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border',
              isActive
                ? `${bgClass} text-white shadow-warm border-transparent`
                : 'bg-card/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/30'
            )}
          >
            <Icon className={cn('h-4 w-4', isActive ? 'text-white' : colorClass)} />
            <span>{label}</span>
            {count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full',
                  isActive 
                    ? 'bg-white/20 text-white border-white/30' 
                    : 'bg-muted/50 text-muted-foreground'
                )}
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
