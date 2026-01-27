/**
 * Document item style Finder avec thumbnail preview et menu contextuel
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
  Trash2,
  ExternalLink,
  Pencil,
  Loader2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentFinderItemProps {
  document: {
    id: string;
    title: string;
    doc_type: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    created_at: string;
    file_size?: number | null;
    period_year?: number | null;
    period_month?: number | null;
  };
  onPreview: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onOpenExternal?: () => void;
  canManage?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  PAYSLIP: Receipt,
  CONTRACT: FileCheck,
  AVENANT: FileText,
  ATTESTATION: FileText,
  MEDICAL_VISIT: Stethoscope,
  SANCTION: AlertTriangle,
  HR_NOTE: StickyNote,
  OTHER: FileWarning,
  payslip: Receipt,
  contract: FileCheck,
  certificate: FileText,
  medical: Stethoscope,
  training: FileText,
  other: FileWarning,
};

const TYPE_COLORS: Record<string, string> = {
  PAYSLIP: 'text-helpconfort-orange',
  CONTRACT: 'text-helpconfort-blue',
  AVENANT: 'text-helpconfort-blue',
  ATTESTATION: 'text-emerald-600',
  MEDICAL_VISIT: 'text-green-600',
  SANCTION: 'text-destructive',
  HR_NOTE: 'text-amber-600',
  OTHER: 'text-muted-foreground',
  payslip: 'text-helpconfort-orange',
  contract: 'text-helpconfort-blue',
  certificate: 'text-emerald-600',
  medical: 'text-green-600',
  training: 'text-amber-600',
  other: 'text-muted-foreground',
};

export function DocumentFinderItem({
  document,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  onOpenExternal,
  canManage = false,
  isSelected = false,
  onSelect,
}: DocumentFinderItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  const isImage = document.file_type?.startsWith('image/');
  const isPDF = document.file_type === 'application/pdf';
  const Icon = TYPE_ICONS[document.doc_type] || FileText;
  const colorClass = TYPE_COLORS[document.doc_type] || 'text-muted-foreground';

  // Load thumbnail for images
  useEffect(() => {
    if (isImage && document.file_path) {
      setIsLoadingThumbnail(true);
      supabase.storage
        .from('rh-documents')
        .createSignedUrl(document.file_path, 3600)
        .then(({ data }) => {
          setThumbnailUrl(data?.signedUrl || null);
          setIsLoadingThumbnail(false);
        });
    }
  }, [document.file_path, isImage]);

  const handleDoubleClick = () => {
    onPreview();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(e);
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group relative flex flex-col items-center p-3 rounded-xl transition-all duration-200 cursor-pointer',
            'hover:bg-muted/60',
            isSelected && 'bg-helpconfort-blue/10 ring-2 ring-helpconfort-blue'
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {/* Thumbnail / Icon */}
          <div className="relative w-20 h-20 mb-2 rounded-lg overflow-hidden flex items-center justify-center bg-muted/40">
            {isImage && thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={document.title}
                className="w-full h-full object-cover"
              />
            ) : isPDF ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-14 bg-destructive/10 rounded border border-destructive/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-destructive">PDF</span>
                </div>
              </div>
            ) : isLoadingThumbnail ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Icon className={cn('h-10 w-10', colorClass)} />
            )}
          </div>

          {/* Title */}
          <p 
            className="text-xs font-medium text-center line-clamp-2 w-full px-1 leading-tight"
            title={document.title}
          >
            {document.title}
          </p>

          {/* Date */}
          <p className="text-[10px] text-muted-foreground mt-1">
            {format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}
          </p>

          {/* Size */}
          {document.file_size && (
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(document.file_size)}
            </p>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onPreview} className="gap-2">
          <Eye className="h-4 w-4" />
          Aperçu rapide
        </ContextMenuItem>
        {onOpenExternal && (
          <ContextMenuItem onClick={onOpenExternal} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Ouvrir dans un nouvel onglet
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger
        </ContextMenuItem>
        {canManage && (
          <>
            <ContextMenuSeparator />
            {onEdit && (
              <ContextMenuItem onClick={onEdit} className="gap-2">
                <Pencil className="h-4 w-4" />
                Modifier les infos
              </ContextMenuItem>
            )}
            {onDelete && (
              <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
