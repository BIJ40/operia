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
  franchiseur_role?: string;
}

interface EscalateTicketDialogProps {
  ticket: Ticket;
  supportUsers: SupportUser[];
  onEscalate: (targetLevel: number, targetUserId: string, reason: string) => void;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'SA1 - Support de base';
    case 2: return 'SA2 - Support technique';
    case 3: return 'SA3 - Support expert';
    default: return `SA${level}`;
  }
};

// Map franchiseur_role to display label
const getFranchiseurRoleLabel = (role: string) => {
  switch (role) {
    case 'animateur': return 'Animateur Réseau';
    case 'directeur': return 'Directeur Réseau';
    case 'dg': return 'Directeur Général';
    default: return role;
  }
};

export function EscalateTicketDialog({ ticket, supportUsers, onEscalate }: EscalateTicketDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState<number>((ticket.support_level || 1) + 1);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userFranchiseurRole, setUserFranchiseurRole] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return;
      
      // Load support level from profiles.support_level (V2 column)
      const { data: profile } = await supabase
        .from('profiles')
        .select('support_level, global_role')
        .eq('id', user.id)
        .single();
      if (profile) {
        // V2: Utiliser profiles.support_level directement
        setUserLevel(profile.support_level ?? 1);
      }
      
      // Note: franchiseur_roles sera supprimé - utiliser global_role N3/N4
      const franchiseurRole = profile?.global_role;
      if (franchiseurRole === 'franchisor_user') {
        setUserFranchiseurRole('animateur');
      } else if (franchiseurRole === 'franchisor_admin') {
        setUserFranchiseurRole('directeur');
      }
    };
    loadUserData();
  }, [user?.id]);

  // Normaliser le service pour comparaison insensible à la casse
  const normalizedService = ticket.service?.toLowerCase();
  const isApogeeService = normalizedService === 'apogee' || normalizedService === 'apogée';
  const isHelpConfortService = normalizedService === 'helpconfort';
  const isAutreService = normalizedService === 'autre' || !ticket.service;

  // Déterminer si l'escalade est possible selon le service
  const canEscalate = () => {
    const currentLevel = ticket.support_level || 1;
    
    // Pour Apogée ou Autre : système N1/N2/N3
    if (isApogeeService || isAutreService) {
      if (userLevel === 1 && currentLevel === 1) return true;
      if (userLevel === 2 && currentLevel <= 2) return true;
      if (userLevel === 3 && currentLevel <= 3) return true;
      return false;
    }
    
    // Pour HelpConfort : système Animateur -> Directeur -> DG
    if (isHelpConfortService) {
      return !!userFranchiseurRole;
    }
    
    return false;
  };

  // Déterminer les rôles d'escalade disponibles (pour HelpConfort)
  const getAvailableHelpConfortRoles = () => {
    const currentRole = ticket.escalation_history?.[ticket.escalation_history.length - 1]?.to_role || 'animateur';
    
    if (userFranchiseurRole === 'animateur' && currentRole === 'animateur') {
      return [{ value: 'directeur', label: 'Directeur Réseau' }];
    }
    if (userFranchiseurRole === 'directeur' && currentRole === 'directeur') {
      return [{ value: 'dg', label: 'Directeur Général' }];
    }
    if (userFranchiseurRole === 'dg' && currentRole === 'dg') {
      return [{ value: 'dg', label: 'Directeur Général (Réassignation)' }];
    }
    
    return [];
  };

  // Déterminer les niveaux d'escalade disponibles (pour Apogée ou Autre)
  const getAvailableLevels = () => {
    const currentLevel = ticket.support_level || 1;
    
    if (isApogeeService || isAutreService) {
      if (userLevel === 1 && currentLevel === 1) return [2];
      if (userLevel === 2 && currentLevel === 2) return [3];
      if (userLevel === 3 && currentLevel === 3) return [3];
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
    
    if (isApogeeService || isAutreService) {
      const correctLevel = u.support_level === targetLevel;
      if (!correctLevel) return false;
      
      const hasApogeeCompetency = u.service_competencies?.apogee !== false;
      
      if (targetLevel === currentLevel && targetLevel === 3) {
        return hasApogeeCompetency && u.id !== user?.id;
      }
      
      return hasApogeeCompetency;
    }
    
    if (isHelpConfortService) {
      // Use franchiseur_role instead of service_competencies.helpconfort
      if (targetRole && u.franchiseur_role !== targetRole) return false;
      
      if (targetRole === 'dg' && u.franchiseur_role === 'dg' && u.id === user?.id) return false;
      
      return u.franchiseur_role === targetRole;
    }
    
    return false;
  });

  const handleEscalate = () => {
    if (!selectedUserId || !reason.trim()) return;
    
    if (isHelpConfortService) {
      onEscalate(0, selectedUserId, reason);
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
          {(isApogeeService || isAutreService) && availableLevels.length > 1 && (
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
          
          {isHelpConfortService && availableHelpConfortRoles.length > 0 && (
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
                  {isHelpConfortService && !targetRole
                    ? 'Veuillez d\'abord sélectionner un rôle cible'
                    : `Aucun support compétent disponible pour ${ticket.service || 'ce service'}`
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
            {isHelpConfortService 
              ? `Escalader vers ${availableHelpConfortRoles.find(r => r.value === targetRole)?.label || 'le rôle sélectionné'}`
              : `Escalader au niveau ${targetLevel}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}