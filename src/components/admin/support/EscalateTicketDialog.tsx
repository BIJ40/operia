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

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  support_level: number;
}

interface EscalateTicketDialogProps {
  currentLevel: number;
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

export function EscalateTicketDialog({ currentLevel, supportUsers, onEscalate }: EscalateTicketDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState<number>(currentLevel + 1);
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

  // Déterminer les niveaux d'escalade disponibles
  const getAvailableLevels = () => {
    if (userLevel === 1 && currentLevel === 1) return [2]; // N1 -> N2
    if (userLevel === 2 && currentLevel === 2) return [3]; // N2 -> N3
    if (userLevel === 3 && currentLevel === 3) return [3]; // N3 -> N3 (autre collègue)
    return [];
  };

  const availableLevels = getAvailableLevels();
  const canEscalate = availableLevels.length > 0;

  // Filtrer les utilisateurs du niveau cible (et exclure l'utilisateur actuel pour N3->N3)
  const availableUsers = supportUsers.filter(u => {
    if (targetLevel === currentLevel && targetLevel === 3) {
      // N3 -> N3 : exclure l'utilisateur actuel
      return u.support_level === targetLevel && u.id !== user?.id;
    }
    return u.support_level === targetLevel;
  });

  const handleEscalate = () => {
    if (!selectedUserId || !reason.trim()) return;
    onEscalate(targetLevel, selectedUserId, reason);
    setOpen(false);
    setReason('');
    setSelectedUserId('');
  };

  if (!canEscalate) {
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
            Niveau actuel : <strong>{getSupportLevelLabel(currentLevel)}</strong>
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
                <p className="text-sm text-muted-foreground">Aucun support disponible pour ce niveau</p>
              ) : (
                availableUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={user.id} id={`user-${user.id}`} />
                    <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                      {user.first_name} {user.last_name}
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
