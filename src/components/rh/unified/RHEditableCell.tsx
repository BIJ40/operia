import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value when props change
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''));
    }
  }, [value, isEditing]);

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
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== String(value ?? '')) {
      onValueChange(collaboratorId, columnId, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(String(value ?? ''));
      setIsEditing(false);
    }
  };

  // For boolean or non-editable values, just display
  if (typeof value === 'boolean' || !editable) {
    return <div className={className}>{formatDisplayValue(value)}</div>;
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
        className={cn("h-7 text-sm px-1", className)}
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
