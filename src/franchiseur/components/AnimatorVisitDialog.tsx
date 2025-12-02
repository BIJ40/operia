import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminAgencies } from '@/hooks/use-admin-agencies';
import { useCreateVisit, useUpdateVisit, AnimatorVisit, VISIT_TYPE_LABELS, VISIT_TYPE_ICONS } from '../hooks/useAnimatorVisits';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, MapPin, ClipboardCheck, Users, GraduationCap } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin,
  ClipboardCheck,
  Users,
  GraduationCap,
};

interface AnimatorVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animatorId: string;
  assignedAgencyIds: string[];
  visit?: AnimatorVisit | null;
}

export function AnimatorVisitDialog({
  open,
  onOpenChange,
  animatorId,
  assignedAgencyIds,
  visit,
}: AnimatorVisitDialogProps) {
  const { toast } = useToast();
  const { data: allAgencies } = useAdminAgencies();
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();
  
  const [agencyId, setAgencyId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitType, setVisitType] = useState<string>('visite_terrain');
  const [notes, setNotes] = useState('');
  
  const isEditing = !!visit;
  
  // Filter agencies: assigned ones or all if none assigned
  const availableAgencies = assignedAgencyIds.length > 0
    ? allAgencies?.filter(a => assignedAgencyIds.includes(a.id))
    : allAgencies;
  
  useEffect(() => {
    if (visit) {
      setAgencyId(visit.agency_id);
      setVisitDate(visit.visit_date);
      setVisitType(visit.visit_type);
      setNotes(visit.notes || '');
    } else {
      setAgencyId('');
      setVisitDate('');
      setVisitType('visite_terrain');
      setNotes('');
    }
  }, [visit, open]);
  
  const handleSubmit = async () => {
    if (!agencyId || !visitDate) {
      toast({ title: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    
    try {
      if (isEditing && visit) {
        await updateVisit.mutateAsync({
          id: visit.id,
          agency_id: agencyId,
          visit_date: visitDate,
          visit_type: visitType as AnimatorVisit['visit_type'],
          notes: notes || null,
        });
        toast({ title: 'Visite mise à jour' });
      } else {
        await createVisit.mutateAsync({
          animator_id: animatorId,
          agency_id: agencyId,
          visit_date: visitDate,
          visit_type: visitType,
          notes: notes || undefined,
        });
        toast({ title: 'Visite planifiée' });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    }
  };
  
  const isLoading = createVisit.isPending || updateVisit.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isEditing ? 'Modifier la visite' : 'Planifier une visite'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="agency">Agence *</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {availableAgencies?.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date de visite *</Label>
            <Input
              id="date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Type de visite</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => {
                  const IconComponent = iconMap[VISIT_TYPE_ICONS[value]];
                  return (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        {IconComponent && <IconComponent className="h-4 w-4 text-helpconfort-blue" />}
                        {label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objectifs de la visite, points à aborder..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Mettre à jour' : 'Planifier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
