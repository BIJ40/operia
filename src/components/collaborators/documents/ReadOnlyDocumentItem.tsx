/**
 * Carte individuelle de document en lecture seule - Finder RH Employé
 * Pas de renommage, pas de suppression, pas d'édition
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CollaboratorDocument, DocumentType } from '@/types/collaboratorDocument';
import { 
  FileText, 
  Receipt, 
  FileCheck, 
  Stethoscope, 
  AlertTriangle,
  StickyNote,
  FileWarning,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReadOnlyDocumentItemProps {
  document: CollaboratorDocument;
  onPreview: () => void;
  onDownload: () => void;
}

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  PAYSLIP: Receipt,
  CONTRACT: FileCheck,
  AVENANT: FileText,
  ATTESTATION: FileText,
  MEDICAL_VISIT: Stethoscope,
  SANCTION: AlertTriangle,
  HR_NOTE: StickyNote,
  OTHER: FileWarning,
};

const TYPE_COLORS: Record<DocumentType, string> = {
  PAYSLIP: 'text-helpconfort-orange bg-helpconfort-orange/10',
  CONTRACT: 'text-helpconfort-blue bg-helpconfort-blue/10',
  AVENANT: 'text-helpconfort-blue bg-helpconfort-blue/10',
  ATTESTATION: 'text-emerald-600 bg-emerald-100',
  MEDICAL_VISIT: 'text-green-600 bg-green-100',
  SANCTION: 'text-destructive bg-destructive/10',
  HR_NOTE: 'text-amber-600 bg-amber-100',
  OTHER: 'text-muted-foreground bg-muted',
};

export function ReadOnlyDocumentItem({
  document,
  onPreview,
  onDownload,
}: ReadOnlyDocumentItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const Icon = TYPE_ICONS[document.doc_type] || FileText;
  const colorClass = TYPE_COLORS[document.doc_type] || TYPE_COLORS.OTHER;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200',
        'bg-gradient-to-br from-background to-muted/20',
        'hover:border-helpconfort-blue/50 hover:shadow-md hover:shadow-helpconfort-blue/5',
        isHovered && 'border-helpconfort-blue/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* File Icon */}
      <div
        className={cn(
          'w-16 h-16 rounded-xl flex items-center justify-center mb-3 transition-transform',
          colorClass,
          isHovered && 'scale-105'
        )}
      >
        <Icon className="h-8 w-8" />
      </div>

      {/* Title */}
      <div className="w-full text-center mb-1">
        <p 
          className="font-medium text-sm truncate px-1"
          title={document.title}
        >
          {document.title}
        </p>
      </div>

      {/* Meta info */}
      <div className="text-xs text-muted-foreground text-center space-y-0.5">
        <p>{format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}</p>
        {document.file_size && (
          <p>{formatFileSize(document.file_size)}</p>
        )}
        {document.period_month && document.period_year && (
          <p className="text-helpconfort-blue">
            {new Date(document.period_year, document.period_month - 1).toLocaleString('fr-FR', { month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Action buttons (appear on hover) - Read only: preview + download */}
      <div
        className={cn(
          'absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 transition-all duration-200',
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-helpconfort-blue hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title="Aperçu"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-helpconfort-blue hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Télécharger"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
