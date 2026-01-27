/**
 * Vue liste des documents - Finder RH
 */

import { CollaboratorDocument } from '@/types/collaboratorDocument';
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
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface SubfolderInfo {
  id: string;
  name: string;
  documentCount: number;
}

interface DocumentListViewProps {
  documents: CollaboratorDocument[];
  subfolders: SubfolderInfo[];
  onPreview: (doc: CollaboratorDocument) => void;
  onDownload: (doc: CollaboratorDocument) => void;
  onDelete: (doc: CollaboratorDocument) => void;
  onEdit: (doc: CollaboratorDocument) => void;
  onFolderClick: (folderId: string) => void;
  canManage: boolean;
  selectedIds: Set<string>;
  onSelect: (docId: string, e: React.MouseEvent) => void;
  onCreateFolder: () => void;
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
};

export function DocumentListView({
  documents,
  subfolders,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  onFolderClick,
  canManage,
  selectedIds,
  onSelect,
  onCreateFolder,
}: DocumentListViewProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (documents.length === 0 && subfolders.length === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucun document</p>
            <p className="text-sm">Clic droit pour créer un dossier</p>
          </div>
        </ContextMenuTrigger>
        {canManage && (
          <ContextMenuContent>
            <ContextMenuItem onClick={onCreateFolder} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Nouveau dossier
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2 px-4 font-medium">Nom</th>
                <th className="text-left py-2 px-4 font-medium w-32">Date</th>
                <th className="text-left py-2 px-4 font-medium w-24">Taille</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {/* Folders first */}
              {subfolders.map((folder) => (
                <tr
                  key={folder.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onDoubleClick={() => onFolderClick(folder.id)}
                >
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-helpconfort-orange flex-shrink-0" />
                      <span className="font-medium">{folder.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({folder.documentCount} doc{folder.documentCount > 1 ? 's' : ''})
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">-</td>
                  <td className="py-2 px-4 text-muted-foreground">-</td>
                  <td className="py-2 px-4"></td>
                </tr>
              ))}
              
              {/* Documents */}
              {documents.map((doc) => {
                const Icon = TYPE_ICONS[doc.doc_type] || FileText;
                const isSelected = selectedIds.has(doc.id);
                
                return (
                  <tr
                    key={doc.id}
                    className={cn(
                      'border-t hover:bg-muted/30 cursor-pointer',
                      isSelected && 'bg-helpconfort-blue/10'
                    )}
                    onClick={(e) => onSelect(doc.id, e)}
                    onDoubleClick={() => onPreview(doc)}
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); onPreview(doc); }}
                          title="Aperçu"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); onEdit(doc); }}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ContextMenuTrigger>
      {canManage && (
        <ContextMenuContent>
          <ContextMenuItem onClick={onCreateFolder} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Nouveau dossier
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
