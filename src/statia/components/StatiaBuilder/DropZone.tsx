/**
 * StatIA Builder - Zone de dépôt
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X, Layers, BarChart3, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { DimensionConfig, MeasureConfig, DimensionType } from './config';

interface DropZoneProps {
  selectedDimension: DimensionConfig | null;
  selectedMeasures: MeasureConfig[];
  onDimensionDrop: (dimensionId: DimensionType) => void;
  onMeasureDrop: (measureId: string) => void;
  onRemoveDimension: () => void;
  onRemoveMeasure: (measureId: string) => void;
}

export function DropZone({
  selectedDimension,
  selectedMeasures,
  onDimensionDrop,
  onMeasureDrop,
  onRemoveDimension,
  onRemoveMeasure,
}: DropZoneProps) {
  const [isDragOverDimension, setIsDragOverDimension] = useState(false);
  const [isDragOverMeasure, setIsDragOverMeasure] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDropDimension = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDimension(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'dimension') {
        onDimensionDrop(data.id);
      }
    } catch {
      // Ignore
    }
  }, [onDimensionDrop]);

  const handleDropMeasure = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverMeasure(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'measure') {
        onMeasureDrop(data.id);
      }
    } catch {
      // Ignore
    }
  }, [onMeasureDrop]);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Zone Dimension */}
      <div className="flex-none">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Layers className="h-4 w-4" />
          <span>Dimension (optionnel)</span>
        </div>
        
        <div
          onDragOver={handleDragOver}
          onDragEnter={() => setIsDragOverDimension(true)}
          onDragLeave={() => setIsDragOverDimension(false)}
          onDrop={handleDropDimension}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 min-h-[80px]",
            "transition-all duration-200",
            isDragOverDimension 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted-foreground/20 hover:border-muted-foreground/40",
            selectedDimension && "border-solid border-primary/30 bg-primary/5"
          )}
        >
          {selectedDimension ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                  selectedDimension.color
                )}>
                  {(() => {
                    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[selectedDimension.icon] || Icons.Circle;
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <div className="font-medium">{selectedDimension.label}</div>
                  <div className="text-sm text-muted-foreground">{selectedDimension.description}</div>
                </div>
              </div>
              <button
                onClick={onRemoveDimension}
                className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <Plus className="h-6 w-6 mb-1 opacity-50" />
              <span className="text-sm">Glissez une dimension ici</span>
              <span className="text-xs opacity-70">pour ventiler vos données</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone Mesures */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span>Mesures</span>
          {selectedMeasures.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {selectedMeasures.length}
            </Badge>
          )}
        </div>
        
        <div
          onDragOver={handleDragOver}
          onDragEnter={() => setIsDragOverMeasure(true)}
          onDragLeave={() => setIsDragOverMeasure(false)}
          onDrop={handleDropMeasure}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 min-h-[200px]",
            "transition-all duration-200",
            isDragOverMeasure 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted-foreground/20 hover:border-muted-foreground/40",
            selectedMeasures.length > 0 && "border-solid border-primary/30 bg-primary/5"
          )}
        >
          {selectedMeasures.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedMeasures.map((measure) => {
                const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[measure.icon] || Icons.Circle;
                return (
                  <div
                    key={measure.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      "bg-background border shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-white",
                      measure.color
                    )}>
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium">{measure.label}</span>
                    {measure.unit && (
                      <span className="text-xs text-muted-foreground">({measure.unit})</span>
                    )}
                    <button
                      onClick={() => onRemoveMeasure(measure.id)}
                      className="p-0.5 hover:bg-destructive/10 rounded-full transition-colors ml-1"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Plus className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm font-medium">Glissez des mesures ici</span>
              <span className="text-xs opacity-70">CA, productivité, taux SAV...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
