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
      return false;
    }
    
    // Pour HelpConfort : système Animateur -> Directeur -> DG
    if (ticket.service === 'HelpConfort') {
      return true; // Tous peuvent escalader
    }
    
    return false;
  };

  // Get user's HelpConfort role from service_competencies
  const [userHelpConfortRole, setUserHelpConfortRole] = useState<string | null>(null);
  
  useEffect(() => {
    const loadUserHelpConfortRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('service_competencies')
        .eq('id', user.id)
        .single();
      if (data?.service_competencies) {
        const competencies = data.service_competencies as any;
        if (competencies?.helpconfort) {
          setUserHelpConfortRole(competencies.helpconfort);
        }
      }
    };
    loadUserHelpConfortRole();
  }, [user?.id]);

  // Déterminer les rôles d'escalade disponibles (pour HelpConfort)
  const getAvailableHelpConfortRoles = () => {
    const currentRole = ticket.escalation_history?.[ticket.escalation_history.length - 1]?.to_role || 'animateur_reseau';
    
    if (userHelpConfortRole === 'animateur_reseau' && currentRole === 'animateur_reseau') {
      return [{ value: 'directeur_reseau', label: 'Directeur Réseau' }];
    }
    if (userHelpConfortRole === 'directeur_reseau' && currentRole === 'directeur_reseau') {
      return [{ value: 'dg', label: 'Directeur Général' }];
    }
    if (userHelpConfortRole === 'dg' && currentRole === 'dg') {
      return [{ value: 'dg', label: 'Directeur Général (Réassignation)' }];
    }
    
    return [];
  };

  // Déterminer les niveaux d'escalade disponibles (pour Apogée)
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
  const availableHelpConfortRoles = getAvailableHelpConfortRoles();
  const isEscalateAvailable = canEscalate();
  
  const [targetRole, setTargetRole] = useState<string>('');

  // Filtrer les utilisateurs selon le service
  const availableUsers = supportUsers.filter(u => {
    const currentLevel = ticket.support_level || 1;
    
    if (ticket.service === 'Apogée') {
      // Vérifier le niveau
      const correctLevel = u.support_level === targetLevel;
      if (!correctLevel) return false;
      
      const hasApogeeCompetency = u.service_competencies?.apogee !== false;
      
      // N3 -> N3 : exclure l'utilisateur actuel
      if (targetLevel === currentLevel && targetLevel === 3) {
        return hasApogeeCompetency && u.id !== user?.id;
      }
      
      return hasApogeeCompetency;
    }
    
    if (ticket.service === 'HelpConfort') {
      const userRole = u.service_competencies?.helpconfort;
      
      // Filtrer par rôle cible
      if (targetRole && userRole !== targetRole) return false;
      
      // DG -> DG : exclure l'utilisateur actuel
      if (targetRole === 'dg' && userRole === 'dg' && u.id === user?.id) return false;
      
      return userRole === targetRole;
    }
    
    return false;
  });

  const handleEscalate = () => {
    if (!selectedUserId || !reason.trim()) return;
    
    // Pour HelpConfort, on passe le rôle au lieu du niveau
    if (ticket.service === 'HelpConfort') {
      onEscalate(0, selectedUserId, reason); // Le niveau sera ignoré pour HelpConfort
    } else {
      onEscalate(targetLevel, selectedUserId, reason);
    }
    
    setOpen(false);
    setReason('');
    setSelectedUserId('');
    setTargetRole('');
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
          {ticket.service === 'Apogée' && availableLevels.length > 1 && (
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
          
          {ticket.service === 'HelpConfort' && availableHelpConfortRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Rôle cible</Label>
              <RadioGroup value={targetRole} onValueChange={setTargetRole}>
                {availableHelpConfortRoles.map(role => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={role.value} id={`role-${role.value}`} />
                    <Label htmlFor={`role-${role.value}`} className="cursor-pointer">
                      {role.label}
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
                  {ticket.service === 'HelpConfort' && !targetRole
                    ? 'Veuillez d\'abord sélectionner un rôle cible'
                    : `Aucun support compétent disponible pour ${ticket.service}`
                  }
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
            {ticket.service === 'HelpConfort' 
              ? `Escalader vers ${availableHelpConfortRoles.find(r => r.value === targetRole)?.label || 'le rôle sélectionné'}`
              : `Escalader au niveau ${targetLevel}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}