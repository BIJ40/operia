/**
 * SavDetailsDrawer - Drawer pour visualiser et valider les SAV d'un technicien
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Tag,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { useTechnicianSavDetails, useValidateSav, SavDetail } from '@/hooks/useTechnicianSavDetails';
import { TechnicianPerformance } from '@/hooks/usePerformanceTerrain';
import { cn } from '@/lib/utils';

interface Props {
  technician: TechnicianPerformance | null;
  dateRange: { start: Date; end: Date };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SourceBadge({ source }: { source: SavDetail['source'] }) {
  const config = {
    type2: { label: 'Type2', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    visite: { label: 'Visite', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    picto: { label: 'Picto', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  };
  
  const c = config[source];
  return (
    <Badge variant="outline" className={cn('text-xs', c.color)}>
      <Tag className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function ValidationStatus({ sav }: { sav: SavDetail }) {
  if (sav.isValidated === undefined || sav.isValidated === null) {
    return (
      <Badge variant="outline" className="text-xs bg-muted">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Non vérifié
      </Badge>
    );
  }
  
  if (sav.isValidated) {
    return (
      <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <CheckCircle className="w-3 h-3 mr-1" />
        SAV confirmé
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      <XCircle className="w-3 h-3 mr-1" />
      Faux positif
    </Badge>
  );
}

function SavCard({ sav, onValidate }: { sav: SavDetail; onValidate: (isValid: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  
  const handleValidate = async (isValid: boolean) => {
    setLoading(true);
    await onValidate(isValid);
    setLoading(false);
  };
  
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{sav.projectRef}</span>
            <SourceBadge source={sav.source} />
            <ValidationStatus sav={sav} />
          </div>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {sav.clientName}
          </p>
        </div>
      </div>
      
      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {sav.date ? format(new Date(sav.date), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          {sav.type2 || sav.type || 'N/A'}
        </div>
      </div>
      
      {/* Description */}
      {sav.description && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
          {sav.description}
        </p>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          size="sm"
          variant={sav.isValidated === true ? 'default' : 'outline'}
          className="flex-1 h-8 text-xs"
          disabled={loading}
          onClick={() => handleValidate(true)}
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
          SAV confirmé
        </Button>
        <Button
          size="sm"
          variant={sav.isValidated === false ? 'default' : 'outline'}
          className="flex-1 h-8 text-xs"
          disabled={loading}
          onClick={() => handleValidate(false)}
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Faux positif
        </Button>
      </div>
    </div>
  );
}

export function SavDetailsDrawer({ technician, dateRange, open, onOpenChange }: Props) {
  const { data: savDetails, isLoading } = useTechnicianSavDetails(
    technician?.id || null, 
    dateRange
  );
  const validateMutation = useValidateSav();
  
  const handleValidate = (interventionId: string) => async (isValid: boolean) => {
    await validateMutation.mutateAsync({ interventionId, isValidSav: isValid });
  };
  
  // Stats rapides
  const stats = {
    total: savDetails?.length || 0,
    confirmed: savDetails?.filter(s => s.isValidated === true).length || 0,
    falsePositive: savDetails?.filter(s => s.isValidated === false).length || 0,
    pending: savDetails?.filter(s => s.isValidated === undefined || s.isValidated === null).length || 0,
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: technician?.color || 'hsl(var(--primary))' }}
            >
              <User className="w-4 h-4" />
            </div>
            <span>SAV - {technician?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Vérifiez et validez les interventions SAV détectées
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
          <div className="bg-amber-100/50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground">À vérifier</div>
          </div>
          <div className="bg-red-100/50 dark:bg-red-900/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-700 dark:text-red-400">{stats.confirmed}</div>
            <div className="text-[10px] text-muted-foreground">Confirmés</div>
          </div>
          <div className="bg-green-100/50 dark:bg-green-900/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-400">{stats.falsePositive}</div>
            <div className="text-[10px] text-muted-foreground">Faux +</div>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : savDetails && savDetails.length > 0 ? (
            <div className="space-y-3 pr-4">
              {savDetails.map(sav => (
                <SavCard 
                  key={sav.interventionId} 
                  sav={sav} 
                  onValidate={handleValidate(sav.interventionId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun SAV détecté pour ce technicien</p>
              <p className="text-xs mt-1">sur la période sélectionnée</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
