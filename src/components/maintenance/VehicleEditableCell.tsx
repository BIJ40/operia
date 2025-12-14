/**
 * Cellule éditable pour le tableau véhicules (double-clic = édition)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VEHICLE_STATUSES } from '@/types/maintenance';
import type { FleetVehicleFormData, VehicleStatus } from '@/types/maintenance';

interface VehicleEditableCellProps {
  value: unknown;
  field: keyof FleetVehicleFormData;
  vehicleId: string;
  onValueChange: (vehicleId: string, field: keyof FleetVehicleFormData, value: unknown) => void;
  type?: 'text' | 'number' | 'date' | 'status';
  className?: string;
}

function formatDisplayValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/50">—</span>;
  }

  if (type === 'date' && typeof value === 'string') {
    try {
      return format(new Date(value), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return String(value);
    }
  }

  if (type === 'number' && typeof value === 'number') {
    return `${value.toLocaleString('fr-FR')} km`;
  }

  if (type === 'status') {
    const statusConfig = VEHICLE_STATUSES.find(s => s.value === value);
    return statusConfig?.label || String(value);
  }

  return String(value);
}

export function VehicleEditableCell({
  value,
  field,
  vehicleId,
  onValueChange,
  type = 'text',
  className,
}: VehicleEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''));
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const originalValue = String(value ?? '');
    if (editValue !== originalValue) {
      let finalValue: unknown = editValue;
      if (type === 'number') {
        finalValue = editValue ? parseInt(editValue.replace(/\s/g, ''), 10) : null;
      }
      onValueChange(vehicleId, field, finalValue);
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

  // Status dropdown
  if (type === 'status') {
    return (
      <Select
        value={String(value ?? 'active')}
        onValueChange={(v) => onValueChange(vehicleId, field, v as VehicleStatus)}
      >
        <SelectTrigger className={cn("h-7 text-xs border-0 bg-transparent", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VEHICLE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date input
  if (type === 'date' && isEditing) {
    return (
      <Input
        ref={inputRef}
        type="date"
        value={editValue ? editValue.split('T')[0] : ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn("h-7 text-xs px-1", className)}
      />
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn("h-7 text-xs px-1", className)}
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
      {formatDisplayValue(value, type)}
    </div>
  );
}
