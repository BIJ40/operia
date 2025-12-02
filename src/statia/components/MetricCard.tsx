/**
 * STATiA-BY-BIJ - Carte de métrique avec actions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlaskConical, Zap, Pencil, MoreVertical, ArrowUpCircle, CheckCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { MetricDefinition, ValidationStatus } from '../types';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  metric: MetricDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onTest: () => void;
  onEdit: () => void;
  onChangeStatus: (newStatus: ValidationStatus) => void;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  validated: 'bg-green-100 text-green-800 border-green-200',
  test: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels: Record<string, string> = {
  validated: 'Validée',
  test: 'En test',
  draft: 'Brouillon',
};

const scopeLabels: Record<string, string> = {
  agency: 'Agence',
  franchiseur: 'Franchiseur',
  apporteur: 'Apporteur',
  tech: 'Technicien',
  mix: 'Mixte',
};

export function MetricCard({ 
  metric, 
  isSelected, 
  onSelect, 
  onTest, 
  onEdit, 
  onChangeStatus, 
  onDelete 
}: MetricCardProps) {
  const status = metric.validation_status;

  // Transitions possibles selon le statut actuel
  const getAvailableTransitions = () => {
    switch (status) {
      case 'draft':
        return [{ status: 'test' as const, label: 'Promouvoir en test', icon: ArrowUpCircle }];
      case 'test':
        return [
          { status: 'validated' as const, label: 'Valider', icon: CheckCircle },
          { status: 'draft' as const, label: 'Rétrograder en brouillon', icon: ArrowDownCircle },
        ];
      case 'validated':
        return [{ status: 'test' as const, label: 'Dévalider (repasser en test)', icon: ArrowDownCircle }];
      default:
        return [];
    }
  };

  const transitions = getAvailableTransitions();

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4",
        isSelected 
          ? "border-l-helpconfort-blue ring-2 ring-helpconfort-blue/20" 
          : "border-l-transparent hover:border-l-helpconfort-blue/50"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{metric.label}</CardTitle>
            <CardDescription className="text-xs font-mono truncate">
              {metric.id}
            </CardDescription>
          </div>
          <Badge className={cn("shrink-0", statusColors[metric.validation_status])}>
            {statusLabels[metric.validation_status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {metric.description_agence || 'Aucune description'}
        </p>
        
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {scopeLabels[metric.scope] || metric.scope}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {metric.formula.type}
          </Badge>
          {metric.compute_hint === 'edge' && (
            <Badge variant="outline" className="text-xs gap-1">
              <Zap className="h-3 w-3" />
              Edge
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onTest();
            }}
          >
            <FlaskConical className="h-3 w-3" />
            Tester
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              {transitions.map((t) => (
                <DropdownMenuItem
                  key={t.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeStatus(t.status);
                  }}
                  className="gap-2"
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </DropdownMenuItem>
              ))}
              {transitions.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
