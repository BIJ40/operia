import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Ticket } from '@/hooks/use-user-tickets';

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  support_level: number;
  service_competencies: any;
}

interface EscalateTicketDialogProps {
  ticket: Ticket;
  supportUsers: SupportUser[];
  onEscalate: (targetLevel: number, targetUserId: string, reason: string) => void;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'Aide de base';
    case 2: return 'Technique';
    case 3: return 'Développeur';
    default: return `Niveau ${level}`;
  }
};

export function EscalateTicketDialog({ ticket, supportUsers, onEscalate }: EscalateTicketDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState<number>((ticket.support_level || 1) + 1);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [userLevel, setUserLevel] = useState<number>(1);

  useEffect(() => {
    const loadUserLevel = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('support_level')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserLevel(data.support_level || 1);
      }
    };
    loadUserLevel();
  }, [user?.id]);

  // Déterminer si l'escalade est possible selon le service
  const canEscalate = () => {
    const currentLevel = ticket.support_level || 1;
    
    // Pour Apogée : système N1/N2/N3
    if (ticket.service === 'Apogée') {
      if (userLevel === 1 && currentLevel === 1) return true; // N1 -> N2
      if (userLevel === 2 && currentLevel <= 2) return true; // N2 -> N3
      if (userLevel === 3 && currentLevel <= 3) return true; // N3 -> N3
    }
    
    // Pour les autres services, pas encore implémenté
    return false;
  };

  // Déterminer les niveaux d'escalade disponibles
  const getAvailableLevels = () => {
    const currentLevel = ticket.support_level || 1;
    
    if (ticket.service === 'Apogée') {
      if (userLevel === 1 && currentLevel === 1) return [2]; // N1 -> N2
      if (userLevel === 2 && currentLevel === 2) return [3]; // N2 -> N3
      if (userLevel === 3 && currentLevel === 3) return [3]; // N3 -> N3 (autre collègue)
    }
    
    return [];
  };

  const availableLevels = getAvailableLevels();
  const isEscalateAvailable = canEscalate();

  // Filtrer les utilisateurs du niveau cible qui ont la compétence du service
  const availableUsers = supportUsers.filter(u => {
    const currentLevel = ticket.support_level || 1;
    
    // Vérifier le niveau
    const correctLevel = u.support_level === targetLevel;
    if (!correctLevel) return false;
    
    // Pour Apogée, vérifier la compétence
    if (ticket.service === 'Apogée') {
      const hasApogeeCompetency = u.service_competencies?.apogee !== false;
      
      // N3 -> N3 : exclure l'utilisateur actuel
      if (targetLevel === currentLevel && targetLevel === 3) {
        return hasApogeeCompetency && u.id !== user?.id;
      }
      
      return hasApogeeCompetency;
    }
    
    // Pour les autres services, à implémenter
    return false;
  });

  const handleEscalate = () => {
    if (!selectedUserId || !reason.trim()) return;
    onEscalate(targetLevel, selectedUserId, reason);
    setOpen(false);
    setReason('');
    setSelectedUserId('');
  };

  if (!isEscalateAvailable) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-l-4 border-l-accent bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white hover:shadow-lg"
        >
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Escalader
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Escalader le ticket</DialogTitle>
          <DialogDescription>
            Service: <strong>{ticket.service || 'Non défini'}</strong> • Niveau actuel : <strong>{getSupportLevelLabel(ticket.support_level || 1)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableLevels.length > 1 && (
            <div className="space-y-2">
              <Label>Niveau cible</Label>
              <RadioGroup value={targetLevel.toString()} onValueChange={(v) => setTargetLevel(parseInt(v))}>
                {availableLevels.map(level => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level.toString()} id={`level-${level}`} />
                    <Label htmlFor={`level-${level}`} className="cursor-pointer">
                      Niveau {level} - {getSupportLevelLabel(level)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>Support assigné</Label>
            <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun support compétent disponible pour {ticket.service} - Niveau {targetLevel}
                </p>
              ) : (
                availableUsers.map(u => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={u.id} id={`user-${u.id}`} />
                    <Label htmlFor={`user-${u.id}`} className="cursor-pointer">
                      {u.first_name} {u.last_name}
                    </Label>
                  </div>
                ))
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motif de l'escalade *</Label>
            <Textarea
              id="reason"
              placeholder="Décrivez pourquoi ce ticket nécessite une escalade..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleEscalate}
            disabled={!selectedUserId || !reason.trim()}
            className="bg-gradient-to-r from-primary to-helpconfort-blue-dark"
          >
            Escalader au niveau {targetLevel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}