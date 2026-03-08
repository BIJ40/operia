/**
 * ApporteurCreateWizardV2 - Wizard de création d'espace apporteur
 * 
 * Étapes:
 * 1. Sélection d'un apporteur dans la liste Apogée (avec filtrage par type)
 * 2. Confirmation et création de l'espace
 * 3. Suggestion de création d'utilisateurs via les contacts de l'apporteur
 */

import { useState, useMemo } from 'react';
import { logError } from '@/lib/logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  Search, Building2, User, Check, Loader2, ArrowRight, ArrowLeft, 
  Mail, Phone, MapPin, Users, RefreshCw, CheckCircle2,
  Link2Off, AlertCircle
} from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { useCreateApporteur, useCreateApporteurUser } from '@/hooks/useApporteurs';
import { useApogeeCommanditaires, getApporteurTypeLabel, ApogeeCommanditaire, ApogeeContact } from '@/hooks/useApogeeCommanditaires';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ApporteurCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select' | 'confirm' | 'users' | 'complete';

interface SelectedContact extends ApogeeContact {
  selected: boolean;
  generatedPassword?: string;
}

export function ApporteurCreateWizard({ open, onOpenChange }: ApporteurCreateWizardProps) {
  const { agencyId } = useProfile();
  const queryClient = useQueryClient();
  const createApporteur = useCreateApporteur();
  const createApporteurUser = useCreateApporteurUser();
  
  // Data
  const { data: commanditaires = [], isLoading, refetch, error } = useApogeeCommanditaires();
  
  // State
  const [step, setStep] = useState<Step>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideLinked, setHideLinked] = useState(true);
  const [selectedCommanditaire, setSelectedCommanditaire] = useState<ApogeeCommanditaire | null>(null);
  const [createdApporteurId, setCreatedApporteurId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<Array<{ email: string; password: string; name: string }>>([]);

  // Filtrage
  const filteredCommanditaires = useMemo(() => {
    return commanditaires.filter(cmd => {
      // Filtre "déjà lié"
      if (hideLinked && cmd.alreadyLinked) return false;
      
      // Filtre par recherche
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = cmd.name.toLowerCase().includes(query);
        const idMatch = String(cmd.id).includes(query);
        const villeMatch = cmd.ville?.toLowerCase().includes(query);
        const typeMatch = cmd.type.toLowerCase().includes(query);
        if (!nameMatch && !idMatch && !villeMatch && !typeMatch) return false;
      }
      
      return true;
    });
  }, [commanditaires, hideLinked, searchQuery]);

  // Stats pour le header
  const stats = useMemo(() => {
    const total = commanditaires.length;
    const linked = commanditaires.filter(c => c.alreadyLinked).length;
    const available = total - linked;
    return { total, linked, available };
  }, [commanditaires]);

  const resetForm = () => {
    setStep('select');
    setSearchQuery('');
    setSelectedCommanditaire(null);
    setCreatedApporteurId(null);
    setSelectedContacts([]);
    setCreatedUsers([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const selectCommanditaire = (cmd: ApogeeCommanditaire) => {
    setSelectedCommanditaire(cmd);
    // Préparer les contacts avec des mots de passe générés
    const contactsWithSelection: SelectedContact[] = cmd.contacts
      .filter(c => c.email) // Uniquement ceux avec email
      .map(c => ({
        ...c,
        selected: false,
        generatedPassword: generatePassword(),
      }));
    setSelectedContacts(contactsWithSelection);
    setStep('confirm');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateSpace = async () => {
    if (!agencyId || !selectedCommanditaire) return;
    
    setIsCreating(true);
    try {
      const apporteur = await createApporteur.mutateAsync({
        name: selectedCommanditaire.name,
        type: selectedCommanditaire.type,
        apogee_client_id: selectedCommanditaire.id,
      });
      
      setCreatedApporteurId(apporteur.id);
      
      // Si des contacts avec email sont disponibles, proposer de créer des utilisateurs
      if (selectedContacts.length > 0) {
        setStep('users');
      } else {
        setStep('complete');
      }
      
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      queryClient.invalidateQueries({ queryKey: ['apogee-commanditaires'] });
      
      toast.success('Espace apporteur créé avec succès');
    } catch (err: any) {
      logError('Create error:', err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleContact = (index: number) => {
    setSelectedContacts(prev => prev.map((c, i) => 
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleCreateUsers = async () => {
    if (!createdApporteurId) return;
    
    const toCreate = selectedContacts.filter(c => c.selected && c.email);
    if (toCreate.length === 0) {
      setStep('complete');
      return;
    }
    
    setIsCreatingUsers(true);
    const created: typeof createdUsers = [];
    
    for (const contact of toCreate) {
      try {
        await createApporteurUser.mutateAsync({
          apporteur_id: createdApporteurId,
          email: contact.email!,
          password: contact.generatedPassword!,
          first_name: contact.prenom || 'Utilisateur',
          last_name: contact.nom || 'Apporteur',
          role: 'manager',
          send_email: false,
        });
        
        created.push({
          email: contact.email!,
          password: contact.generatedPassword!,
          name: `${contact.prenom || ''} ${contact.nom || ''}`.trim() || contact.email!,
        });
      } catch (err: any) {
        logError(`Failed to create user ${contact.email}:`, err);
        toast.error(`Erreur pour ${contact.email}: ${err.message}`);
      }
    }
    
    setCreatedUsers(created);
    setIsCreatingUsers(false);
    setStep('complete');
    
    if (created.length > 0) {
      toast.success(`${created.length} utilisateur(s) créé(s)`);
    }
  };

  const skipUserCreation = () => {
    setStep('complete');
  };

  const copyAllCredentials = () => {
    const text = createdUsers.map(u => 
      `${u.name}\nEmail: ${u.email}\nMot de passe: ${u.password}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Identifiants copiés');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nouvel Espace Apporteur
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Sélectionnez un apporteur dans votre base Apogée'}
            {step === 'confirm' && 'Confirmez la création de l\'espace'}
            {step === 'users' && 'Créez les utilisateurs à partir des contacts'}
            {step === 'complete' && 'L\'espace a été créé avec succès'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {(['select', 'confirm', 'users', 'complete'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                step === s ? 'bg-primary text-primary-foreground' :
                ['select', 'confirm', 'users', 'complete'].indexOf(step) > i 
                  ? 'bg-green-500 text-white' 
                  : 'bg-muted text-muted-foreground'
              )}>
                {['select', 'confirm', 'users', 'complete'].indexOf(step) > i ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-6 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select from list */}
        {step === 'select' && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.total}</span>
                <span className="text-muted-foreground">apporteurs</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{stats.linked}</span>
                <span className="text-muted-foreground">déjà liés</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600">
                <Link2Off className="h-4 w-4" />
                <span className="font-medium">{stats.available}</span>
                <span className="text-muted-foreground">disponibles</span>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, ID ou ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>

            {/* Hide linked toggle */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="hideLinked" 
                checked={hideLinked} 
                onCheckedChange={(c) => setHideLinked(!!c)} 
              />
              <label htmlFor="hideLinked" className="text-sm text-muted-foreground cursor-pointer">
                Masquer les apporteurs déjà liés
              </label>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <p>Erreur lors du chargement</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            ) : filteredCommanditaires.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Building2 className="h-12 w-12 mb-2 opacity-50" />
                <p>Aucun apporteur trouvé</p>
                <p className="text-sm">Modifiez vos filtres ou recherche</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 pr-4">
                  {filteredCommanditaires.map((cmd) => (
                    <Card
                      key={cmd.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        cmd.alreadyLinked 
                          ? 'opacity-60 hover:opacity-80 border-green-200 bg-green-50/50' 
                          : 'hover:border-primary/50'
                      )}
                      onClick={() => !cmd.alreadyLinked && selectCommanditaire(cmd)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{cmd.name}</p>
                              {cmd.alreadyLinked && (
                                <Badge variant="secondary" className="shrink-0 text-xs bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Lié
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {getApporteurTypeLabel(cmd.type)}
                              </Badge>
                              <span className="text-xs">ID {cmd.id}</span>
                              {cmd.ville && (
                                <span className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3" />
                                  {cmd.ville}
                                </span>
                              )}
                              {cmd.contacts.length > 0 && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Users className="h-3 w-3" />
                                  {cmd.contacts.length} contact(s)
                                </span>
                              )}
                            </div>
                          </div>
                          {!cmd.alreadyLinked && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="text-xs text-muted-foreground text-center">
              {filteredCommanditaires.length} résultat(s) sur {stats.total}
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && selectedCommanditaire && (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedCommanditaire.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline">{getApporteurTypeLabel(selectedCommanditaire.type)}</Badge>
                      <span>ID Apogée: {selectedCommanditaire.id}</span>
                    </div>
                    
                    <div className="mt-3 space-y-1 text-sm">
                      {selectedCommanditaire.adresse && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedCommanditaire.adresse}, {selectedCommanditaire.ville}</span>
                        </div>
                      )}
                      {selectedCommanditaire.tel && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedCommanditaire.tel}</span>
                        </div>
                      )}
                      {selectedCommanditaire.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedCommanditaire.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedContacts.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedContacts.length} contact(s) avec email disponible(s)
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Vous pourrez créer des utilisateurs pour ces contacts après la création de l'espace.
                </p>
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateSpace}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer l'espace apporteur
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Create users from contacts */}
        {step === 'users' && selectedCommanditaire && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Espace créé pour {selectedCommanditaire.name}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Créer des utilisateurs (optionnel)
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez les contacts pour lesquels créer un accès au portail apporteur.
              </p>

              <div className="space-y-2">
                {selectedContacts.map((contact, index) => (
                  <Card
                    key={index}
                    className={cn(
                      'cursor-pointer transition-all',
                      contact.selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                    )}
                    onClick={() => toggleContact(index)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={contact.selected} />
                        <div className="flex-1">
                          <p className="font-medium">
                            {contact.prenom} {contact.nom}
                            {contact.fonction && (
                              <span className="text-muted-foreground font-normal ml-2">
                                — {contact.fonction}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                            {contact.tel && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.tel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={skipUserCreation}>
                Passer cette étape
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateUsers}
                disabled={isCreatingUsers || selectedContacts.filter(c => c.selected).length === 0}
              >
                {isCreatingUsers ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer {selectedContacts.filter(c => c.selected).length} utilisateur(s)
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold text-lg">Espace apporteur créé !</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCommanditaire?.name}
              </p>
            </div>

            {createdUsers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Identifiants créés</h4>
                    <Button variant="outline" size="sm" onClick={copyAllCredentials}>
                      Copier tout
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {createdUsers.map((user, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg font-mono text-sm">
                        <p className="font-semibold mb-1">{user.name}</p>
                        <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                        <p><span className="text-muted-foreground">Mot de passe:</span> {user.password}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    ⚠️ Notez ces identifiants, ils ne seront plus affichés.
                  </p>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={handleClose}>
              Terminer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ApporteurCreateWizard;
