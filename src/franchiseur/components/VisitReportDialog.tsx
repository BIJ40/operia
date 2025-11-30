import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateVisit, AnimatorVisit, VISIT_STATUS_LABELS } from '../hooks/useAnimatorVisits';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface VisitReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: AnimatorVisit;
}

export function VisitReportDialog({ open, onOpenChange, visit }: VisitReportDialogProps) {
  const { toast } = useToast();
  const updateVisit = useUpdateVisit();
  
  const [status, setStatus] = useState<string>(visit.status);
  const [reportContent, setReportContent] = useState(visit.report_content || '');
  
  useEffect(() => {
    setStatus(visit.status);
    setReportContent(visit.report_content || '');
  }, [visit, open]);
  
  const handleSubmit = async () => {
    try {
      await updateVisit.mutateAsync({
        id: visit.id,
        status: status as AnimatorVisit['status'],
        report_content: reportContent || null,
      });
      toast({ title: 'Rapport enregistré' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rapport de visite - {visit.agency?.label}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Statut de la visite</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Compte-rendu de visite</Label>
            <Textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder="Résumé de la visite, points abordés, actions à mener..."
              rows={8}
              className="resize-none"
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            💡 La possibilité de joindre des fichiers (rapports PDF, photos) sera disponible prochainement.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={updateVisit.isPending}>
            {updateVisit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
