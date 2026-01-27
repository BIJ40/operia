/**
 * Composant d'édition inline avec auto-save
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface InlineEditProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void> | void;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'textarea';
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  debounceMs?: number;
}

export function InlineEdit({
  value,
  onSave,
  label,
  placeholder = '-',
  type = 'text',
  className,
  inputClassName,
  disabled = false,
  debounceMs = 800,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync local value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value || '');
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'date') {
        inputRef.current.select?.();
      }
    }
  }, [isEditing, type]);

  const handleSave = useCallback(async (newValue: string) => {
    if (newValue === (value || '')) return;
    
    setIsSaving(true);
    try {
      await onSave(newValue);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (error) {
      console.error('Save error:', error);
      setLocalValue(value || '');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Debounce auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, debounceMs);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleSave(localValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalValue(value || '');
      setIsEditing(false);
    } else if (e.key === 'Enter' && type !== 'textarea') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleSave(localValue);
      setIsEditing(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (disabled) {
    return (
      <div className={cn("space-y-0.5", className)}>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <p className="text-sm font-medium text-muted-foreground">{value || placeholder}</p>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div 
        className={cn(
          "space-y-0.5 cursor-pointer group relative",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <p className={cn(
          "text-sm font-medium min-h-[20px] px-2 py-0.5 -mx-2 rounded transition-colors",
          "hover:bg-muted/60 group-hover:bg-muted/60",
          !value && "text-muted-foreground italic"
        )}>
          {value || placeholder}
        </p>
        {(isSaving || showSaved) && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : showSaved ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : null}
          </span>
        )}
      </div>
    );
  }

  const commonProps = {
    value: localValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    placeholder,
    className: cn("h-8 text-sm", inputClassName),
  };

  return (
    <div className={cn("space-y-0.5 relative", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      {type === 'textarea' ? (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...commonProps}
          rows={3}
          className={cn("text-sm resize-none", inputClassName)}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          {...commonProps}
        />
      )}
      {isSaving && (
        <span className="absolute right-2 top-1/2 translate-y-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      )}
    </div>
  );
}

// Select variant for inline editing
interface InlineSelectProps {
  value: string | null | undefined;
  options: { value: string; label: string }[];
  onSave: (value: string) => Promise<void> | void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineSelect({
  value,
  options,
  onSave,
  label,
  placeholder = 'Sélectionner...',
  className,
  disabled = false,
}: InlineSelectProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === (value || '')) return;
    
    setIsSaving(true);
    try {
      await onSave(newValue);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = options.find(o => o.value === value)?.label || value || placeholder;

  return (
    <div className={cn("space-y-0.5 relative", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="relative">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || isSaving}
          className={cn(
            "w-full h-8 text-sm font-medium bg-transparent border-0 cursor-pointer",
            "px-2 py-0.5 -mx-2 rounded transition-colors appearance-none",
            "hover:bg-muted/60 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(isSaving || showSaved) && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : showSaved ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
