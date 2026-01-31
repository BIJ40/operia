/**
 * Sélecteur de type/dossier par boutons - Upload dialog
 * Permet de sélectionner un type existant ou créer un nouveau dossier
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FolderOpen, FolderPlus, Plus, Check } from 'lucide-react';
import { DocumentType, DOCUMENT_TYPES } from '@/types/collaboratorDocument';

// Mapping type → nom de dossier par défaut
const TYPE_TO_FOLDER: Record<DocumentType, string> = {
  PAYSLIP: 'Salaires',
  CONTRACT: 'Contrats',
  AVENANT: 'Avenants',
  ATTESTATION: 'Attestations',
  MEDICAL_VISIT: 'Visites médicales',
  SANCTION: 'Sanctions',
  HR_NOTE: 'Notes RH',
  OTHER: '',
};

interface DocumentTypeSelectorProps {
  selectedType: DocumentType;
  selectedSubfolder: string | null;
  existingSubfolders: string[];
  onTypeChange: (type: DocumentType, subfolder: string | null) => void;
  onCreateFolder: (folderName: string) => void;
}

export function DocumentTypeSelector({
  selectedType,
  selectedSubfolder,
  existingSubfolders,
  onTypeChange,
  onCreateFolder,
}: DocumentTypeSelectorProps) {
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Combine les types standards avec les dossiers existants
  const allOptions = useMemo(() => {
    const typeOptions = DOCUMENT_TYPES.map(t => ({
      id: t.value,
      label: t.label,
      type: t.value as DocumentType,
      folder: TYPE_TO_FOLDER[t.value as DocumentType] || null,
      isType: true,
    }));

    // Ajouter les dossiers existants qui ne correspondent pas à un type
    const standardFolders = Object.values(TYPE_TO_FOLDER).filter(Boolean);
    const customFolders = existingSubfolders.filter(
      folder => !standardFolders.includes(folder)
    );

    const folderOptions = customFolders.map(folder => ({
      id: `folder-${folder}`,
      label: folder,
      type: 'OTHER' as DocumentType,
      folder: folder,
      isType: false,
    }));

    return [...typeOptions, ...folderOptions];
  }, [existingSubfolders]);

  const handleSelectOption = (option: typeof allOptions[0]) => {
    onTypeChange(option.type, option.folder);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const folderName = newFolderName.trim();
    onCreateFolder(folderName);
    onTypeChange('OTHER', folderName);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const isSelected = (option: typeof allOptions[0]) => {
    if (option.isType) {
      return selectedType === option.type && selectedSubfolder === option.folder;
    }
    return selectedSubfolder === option.folder;
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Type / Dossier de destination</Label>
      
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelectOption(option)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
              isSelected(option) 
                ? 'bg-warm-green text-white border-warm-green shadow-warm ring-2 ring-warm-green/30'
                : 'bg-card/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/30'
            )}
          >
            {option.isType ? (
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-4 px-1 text-[10px] rounded-md",
                  isSelected(option) ? 'bg-white/20 text-white' : 'bg-warm-green/10 text-warm-green'
                )}
              >
                {option.label.slice(0, 3).toUpperCase()}
              </Badge>
            ) : (
              <FolderOpen className={cn('h-3.5 w-3.5', isSelected(option) ? 'text-white' : 'text-warm-orange')} />
            )}
            <span>{option.label}</span>
            {isSelected(option) && <Check className="h-3 w-3 ml-1" />}
          </button>
        ))}

        {/* Bouton nouveau dossier */}
        {!showNewFolderInput ? (
          <button
            type="button"
            onClick={() => setShowNewFolderInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border border-dashed border-warm-purple/50 text-warm-purple hover:bg-warm-purple/10 hover:border-warm-purple"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Créer dossier</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier..."
              className="h-8 w-32 text-xs rounded-lg border-warm-purple/30 focus:border-warm-purple focus:ring-warm-purple/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateFolder();
                }
                if (e.key === 'Escape') {
                  setShowNewFolderInput(false);
                  setNewFolderName('');
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="h-8 px-2 bg-warm-purple hover:bg-warm-purple/90 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Indication du dossier sélectionné */}
      {selectedSubfolder && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warm-green/10 border border-warm-green/20">
          <FolderOpen className="h-3.5 w-3.5 text-warm-green" />
          <span className="text-xs text-muted-foreground">
            Sera rangé dans : <strong className="text-warm-green">{selectedSubfolder}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
