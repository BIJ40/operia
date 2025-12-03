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

const CATEGORY_COLORS: Record<DocumentType | 'ALL', string> = {
  ALL: 'text-foreground',
  PAYSLIP: 'text-helpconfort-orange',
  CONTRACT: 'text-helpconfort-blue',
  AVENANT: 'text-helpconfort-blue',
  ATTESTATION: 'text-emerald-600',
  MEDICAL_VISIT: 'text-green-600',
  SANCTION: 'text-destructive',
  HR_NOTE: 'text-amber-600',
  OTHER: 'text-muted-foreground',
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
    <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
      {categories.map(({ value, label }) => {
        const count = value === 'ALL' ? totalCount : (counts[value] || 0);
        const isActive = activeCategory === value;
        const Icon = CATEGORY_ICONS[value];
        const colorClass = CATEGORY_COLORS[value];

        // Skip categories with 0 documents (except ALL and active)
        if (count === 0 && value !== 'ALL' && !isActive) return null;

        return (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-helpconfort-blue text-white shadow-sm'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-4 w-4', isActive ? 'text-white' : colorClass)} />
            <span>{label}</span>
            {count > 0 && (
              <Badge
                variant={isActive ? 'secondary' : 'outline'}
                className={cn(
                  'ml-1 h-5 min-w-5 px-1.5 text-xs',
                  isActive && 'bg-white/20 text-white border-white/30'
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
