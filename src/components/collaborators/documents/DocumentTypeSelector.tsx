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
      <Label>Type / Dossier de destination</Label>
      
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={isSelected(option) ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelectOption(option)}
            className={cn(
              'gap-1.5 transition-all',
              isSelected(option) && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            {option.isType ? (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {option.label.slice(0, 3).toUpperCase()}
              </Badge>
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">{option.label}</span>
            {isSelected(option) && <Check className="h-3 w-3 ml-1" />}
          </Button>
        ))}

        {/* Bouton nouveau dossier */}
        {!showNewFolderInput ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolderInput(true)}
            className="gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="text-xs">Créer dossier</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier..."
              className="h-8 w-32 text-xs"
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
              className="h-8 px-2"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Indication du dossier sélectionné */}
      {selectedSubfolder && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FolderOpen className="h-3 w-3" />
          Sera rangé dans : <strong className="text-foreground">{selectedSubfolder}</strong>
        </p>
      )}
    </div>
  );
}
