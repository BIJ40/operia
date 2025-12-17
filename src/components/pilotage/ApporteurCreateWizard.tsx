import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Building2, User, Check, Copy, Loader2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateApporteur } from '@/hooks/useApporteurs';
import { useCreateApporteurContact, CreateContactInput } from '@/hooks/useApporteurContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ApporteurCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommanditaireResult {
  id: number;
  name: string;
  type: string;
}

type Step = 'search' | 'organization' | 'user' | 'complete';

export function ApporteurCreateWizard({ open, onOpenChange }: ApporteurCreateWizardProps) {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const createApporteur = useCreateApporteur();
  const createContact = useCreateApporteurContact();
  
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommanditaireResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCommanditaire, setSelectedCommanditaire] = useState<CommanditaireResult | null>(null);
  
  // Organization form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('agence_immo');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // User form
  const [userEmail, setUserEmail] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  
  // Result
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCommanditaire(null);
    setOrgName('');
    setOrgType('agence_immo');
    setContactFirstName('');
    setContactLastName('');
    setContactPhone('');
    setContactEmail('');
    setUserEmail('');
    setUserFirstName('');
    setUserLastName('');
    setUserPassword('');
    setCreatedCredentials(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const searchCommanditaires = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');
      
      const { data, error } = await supabase.functions.invoke('search-apogee-commanditaires', {
        body: { query: searchQuery },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) throw error;
      setSearchResults(data?.data || []);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const selectCommanditaire = (cmd: CommanditaireResult) => {
    setSelectedCommanditaire(cmd);
    setOrgName(cmd.name);
    setOrgType(cmd.type || 'agence_immo');
    setStep('organization');
  };

  const skipToOrganization = () => {
    setSelectedCommanditaire(null);
    setStep('organization');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserPassword(password);
  };

  const handleCreate = async () => {
    if (!agencyId) {
      toast.error('Agence non trouvée');
      return;
    }
    
    if (!orgName.trim() || !userEmail.trim() || !userPassword.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setIsCreating(true);
    try {
      // 1. Create the apporteur organization
      const apporteur = await createApporteur.mutateAsync({
        name: orgName,
        type: orgType,
        apogee_client_id: selectedCommanditaire?.id || null,
      });
      
      // 2. Create primary contact if provided
      if (contactFirstName.trim() && contactLastName.trim()) {
        const contactData: CreateContactInput = {
          apporteur_id: apporteur.id,
          agency_id: agencyId,
          first_name: contactFirstName,
          last_name: contactLastName,
          phone: contactPhone || undefined,
          email: contactEmail || undefined,
          is_primary: true,
        };
        await createContact.mutateAsync(contactData);
      }
      
      // 3. Create the first user via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');
      
      const { data: userData, error: userError } = await supabase.functions.invoke('create-apporteur-user', {
        body: {
          agency_id: agencyId,
          apporteur_id: apporteur.id,
          email: userEmail,
          password: userPassword,
          first_name: userFirstName || 'Utilisateur',
          last_name: userLastName || 'Apporteur',
          role: 'manager',
          send_email: false,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (userError) throw userError;
      if (userData?.error) throw new Error(userData.error);
      
      // 4. Show credentials
      setCreatedCredentials({ email: userEmail, password: userPassword });
      setStep('complete');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      
      toast.success('Espace apporteur créé avec succès');
    } catch (err: any) {
      console.error('Create error:', err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(
        `Email: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`
      );
      toast.success('Identifiants copiés');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nouvel Espace Apporteur
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['search', 'organization', 'user', 'complete'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['search', 'organization', 'user', 'complete'].indexOf(step) > i 
                  ? 'bg-green-500 text-white' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {['search', 'organization', 'user', 'complete'].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {/* Step 1: Search Apogée */}
        {step === 'search' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recherchez un commanditaire Apogée pour lier automatiquement les dossiers.
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCommanditaires()}
              />
              <Button onClick={searchCommanditaires} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {searchResults.map((cmd) => (
                  <Card
                    key={cmd.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => selectCommanditaire(cmd)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cmd.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cmd.type} • ID {cmd.id}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Separator />
            
            <Button variant="outline" className="w-full" onClick={skipToOrganization}>
              Créer sans liaison Apogée
            </Button>
          </div>
        )}

        {/* Step 2: Organization */}
        {step === 'organization' && (
          <div className="space-y-4">
            {selectedCommanditaire && (
              <Badge variant="secondary" className="mb-2">
                Lié à Apogée: {selectedCommanditaire.name} (ID {selectedCommanditaire.id})
              </Badge>
            )}
            
            <div className="space-y-3">
              <div>
                <Label>Nom de l'organisation *</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: Cabinet Martin Immobilier"
                />
              </div>
              
              <div>
                <Label>Type</Label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agence_immo">Agence immobilière</SelectItem>
                    <SelectItem value="syndic">Syndic</SelectItem>
                    <SelectItem value="assurance">Assurance</SelectItem>
                    <SelectItem value="courtier">Courtier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4" />
              
              <p className="text-sm font-medium">Contact principal (optionnel)</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={contactFirstName}
                    onChange={(e) => setContactFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={contactLastName}
                    onChange={(e) => setContactLastName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('search')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setStep('user')}
                disabled={!orgName.trim()}
              >
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: First User */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <User className="h-5 w-5 text-blue-500" />
              <p className="text-sm">
                Créez le premier utilisateur qui pourra accéder au portail apporteur.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Mot de passe *</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Générer
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('organization')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreate}
                disabled={isCreating || !userEmail.trim() || !userPassword.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer l'espace
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && createdCredentials && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <Check className="h-5 w-5 text-green-500" />
              <p className="text-sm font-medium text-green-700">
                Espace apporteur créé avec succès !
              </p>
            </div>
            
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Identifiants de connexion</p>
                <div className="space-y-2 font-mono text-sm bg-muted p-3 rounded">
                  <p><span className="text-muted-foreground">Email:</span> {createdCredentials.email}</p>
                  <p><span className="text-muted-foreground">Mot de passe:</span> {createdCredentials.password}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={copyCredentials}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier les identifiants
                </Button>
              </CardContent>
            </Card>
            
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Transmettez ces identifiants de manière sécurisée à l'apporteur.
                Le mot de passe ne pourra plus être affiché.
              </p>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Terminé
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
