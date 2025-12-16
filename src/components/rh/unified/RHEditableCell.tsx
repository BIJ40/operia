import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Options pour les tailles
const TAILLE_HAUT_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const TAILLE_BAS_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const POINTURE_OPTIONS = Array.from({ length: 15 }, (_, i) => String(36 + i)); // 36 à 50
const TAILLE_GANTS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

// Colonnes avec dropdown de tailles
const SIZE_DROPDOWN_COLUMNS: Record<string, string[]> = {
  taille_haut: TAILLE_HAUT_OPTIONS,
  taille_bas: TAILLE_BAS_OPTIONS,
  pointure: POINTURE_OPTIONS,
  taille_gants: TAILLE_GANTS_OPTIONS,
};

// Colonnes avec email (affichage tronqué + tooltip)
const EMAIL_COLUMNS = ['email'];

// Colonnes de type date (format JJ/MM/AAAA obligatoire)
const DATE_COLUMNS = ['birth_date', 'hiring_date', 'leaving_date', 'hab_elec_date', 'date_renouvellement'];

// Validation format date JJ/MM/AAAA
function isValidDateFormat(value: string): boolean {
  if (!value || value.trim() === '') return true; // Vide autorisé
  return /^(\d{2})\/(\d{2})\/(\d{4})$/.test(value);
}

// Convertir ISO (YYYY-MM-DD) vers JJ/MM/AAAA pour l'édition
function isoToFrenchDate(value: string): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return value;
}

interface RHEditableCellProps {
  value: unknown;
  columnId: string;
  collaboratorId: string;
  editable?: boolean;
  className?: string;
  onValueChange: (collaboratorId: string, columnId: string, value: string) => void;
}

function formatDisplayValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/50">—</span>;
  }
  
  if (typeof value === 'boolean') {
    return value ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Oui</Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground">Non</Badge>
    );
  }
  
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return format(new Date(value), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return value;
    }
  }
  
  return String(value);
}

export function RHEditableCell({
  value,
  columnId,
  collaboratorId,
  editable = true,
  className,
  onValueChange,
}: RHEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [dateError, setDateError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDateColumn = DATE_COLUMNS.includes(columnId);

  // Sync value when props change
  useEffect(() => {
    if (!isEditing) {
      // Pour les colonnes date, convertir ISO vers format français
      if (isDateColumn && value) {
        setEditValue(isoToFrenchDate(String(value)));
      } else {
        setEditValue(String(value ?? ''));
      }
      setDateError(false);
    }
  }, [value, isEditing, isDateColumn]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    // Pour les dates, convertir ISO vers format français avant édition
    if (isDateColumn && value) {
      setEditValue(isoToFrenchDate(String(value)));
    }
    setDateError(false);
    setIsEditing(true);
  };

  const handleBlur = () => {
    // Validation pour les colonnes date
    if (isDateColumn && editValue && !isValidDateFormat(editValue)) {
      setDateError(true);
      toast.error('Format de date invalide. Utilisez JJ/MM/AAAA');
      return; // Ne pas fermer l'édition si format invalide
    }
    
    setDateError(false);
    setIsEditing(false);
    
    // Pour les dates, comparer la valeur convertie
    const originalFormatted = isDateColumn && value ? isoToFrenchDate(String(value)) : String(value ?? '');
    if (editValue !== originalFormatted) {
      onValueChange(collaboratorId, columnId, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      if (isDateColumn && value) {
        setEditValue(isoToFrenchDate(String(value)));
      } else {
        setEditValue(String(value ?? ''));
      }
      setDateError(false);
      setIsEditing(false);
    }
  };

  const handleSelectChange = (newValue: string) => {
    setEditValue(newValue);
    onValueChange(collaboratorId, columnId, newValue);
  };

  // For boolean or non-editable values, just display
  if (typeof value === 'boolean' || !editable) {
    return <div className={className}>{formatDisplayValue(value)}</div>;
  }

  // Dropdown pour les tailles
  if (SIZE_DROPDOWN_COLUMNS[columnId]) {
    const options = SIZE_DROPDOWN_COLUMNS[columnId];
    const currentValue = editValue || '__EMPTY__';
    return (
      <Select 
        value={currentValue} 
        onValueChange={(v) => handleSelectChange(v === '__EMPTY__' ? '' : v)}
      >
        <SelectTrigger className={cn("h-7 text-sm", className)}>
          <SelectValue placeholder="—">
            {currentValue === '__EMPTY__' ? '—' : currentValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="__EMPTY__">—</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Email avec tooltip
  if (EMAIL_COLUMNS.includes(columnId)) {
    const displayValue = formatDisplayValue(value);
    const hasValue = value !== null && value !== undefined && value !== '';
    
    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={cn("h-7 text-sm px-1", className)}
        />
      );
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "min-h-[28px] px-1 py-0.5 rounded cursor-text hover:bg-muted/50 transition-colors max-w-[100px] truncate",
                className
              )}
              onDoubleClick={handleDoubleClick}
              title="Double-clic pour modifier"
            >
              {displayValue}
            </div>
          </TooltipTrigger>
          {hasValue && (
            <TooltipContent>
              <p>{String(value)}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        placeholder={isDateColumn ? 'JJ/MM/AAAA' : undefined}
        className={cn(
          "h-7 text-sm px-1", 
          dateError && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
    );
  }

  return (
    <div 
      className={cn(
        "min-h-[28px] px-1 py-0.5 rounded cursor-text hover:bg-muted/50 transition-colors",
        className
      )}
      onDoubleClick={handleDoubleClick}
      title="Double-clic pour modifier"
    >
      {formatDisplayValue(value)}
    </div>
  );
}
