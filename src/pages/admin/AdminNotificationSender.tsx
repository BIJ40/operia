import { useState, useEffect } from 'react';
import { Bell, Send, Users, User, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  agence: string | null;
}

const CATEGORIES = [
  { value: 'system', label: '🔧 Système', description: 'Annonces techniques, maintenance' },
  { value: 'support', label: '🎫 Support', description: 'Tickets, demandes' },
  { value: 'rh', label: '👥 RH', description: 'Documents, congés' },
  { value: 'epi', label: '🦺 EPI', description: 'Équipements de protection' },
  { value: 'info', label: 'ℹ️ Information', description: 'Informations générales' },
];

export default function AdminNotificationSender() {
  const [targetType, setTargetType] = useState<'all' | 'agency' | 'users'>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; label: string; slug: string }[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('system');
  const [actionUrl, setActionUrl] = useState('');
  const [sendPush, setSendPush] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Charger les agences et utilisateurs
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [agenciesRes, usersRes] = await Promise.all([
          supabase.from('apogee_agencies').select('id, label, slug').order('label'),
          supabase.from('profiles').select('id, first_name, last_name, email, agency_id').order('last_name')
        ]);
        
        if (agenciesRes.data) setAgencies(agenciesRes.data);
        if (usersRes.data) {
          setUsers(usersRes.data);
          setFilteredUsers(usersRes.data);
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  // Filtrer les utilisateurs selon la recherche
  useEffect(() => {
    if (!userSearch.trim()) {
      setFilteredUsers(users);
      return;
    }
    const search = userSearch.toLowerCase();
    setFilteredUsers(users.filter(u => 
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.agence?.toLowerCase().includes(search)
    ));
  }, [userSearch, users]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getTargetUserIds = async (): Promise<string[]> => {
    if (targetType === 'users') {
      return selectedUsers;
    }
    
    if (targetType === 'agency' && selectedAgency) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('agency_id', selectedAgency);
      
      return data?.map(u => u.id) || [];
    }
    
    // Tous les utilisateurs
    return users.map(u => u.id);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Le titre et le message sont requis');
      return;
    }

    if (targetType === 'users' && selectedUsers.length === 0) {
      toast.error('Sélectionnez au moins un utilisateur');
      return;
    }

    if (targetType === 'agency' && !selectedAgency) {
      toast.error('Sélectionnez une agence');
      return;
    }

    setLoading(true);
    try {
      const targetUserIds = await getTargetUserIds();
      
      if (targetUserIds.length === 0) {
        toast.error('Aucun destinataire trouvé');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Envoyer les notifications
      for (const userId of targetUserIds) {
        try {
          // Notification in-app
          const { error: notifError } = await supabase.rpc('create_notification', {
            p_user_id: userId,
            p_category: category,
            p_notification_type: 'admin_message',
            p_title: title,
            p_message: message,
            p_action_url: actionUrl || null
          });

          if (notifError) throw notifError;

          // Push notification si activé
          if (sendPush) {
            await supabase.functions.invoke('send-push', {
              body: {
                user_id: userId,
                title: title,
                body: message,
                url: actionUrl || undefined
              }
            });
          }

          successCount++;
        } catch (err) {
          console.error(`Erreur envoi à ${userId}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} notification(s) envoyée(s)`);
        // Reset form
        setTitle('');
        setMessage('');
        setActionUrl('');
        setSelectedUsers([]);
      }
      
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} erreur(s) d'envoi`);
      }
    } catch (err) {
      console.error('Erreur envoi notifications:', err);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const getTargetLabel = () => {
    if (targetType === 'all') return `${users.length} utilisateur(s)`;
    if (targetType === 'agency') {
      const agency = agencies.find(a => a.id === selectedAgency);
      return agency ? `Agence ${agency.label}` : 'Sélectionnez une agence';
    }
    return `${selectedUsers.length} utilisateur(s) sélectionné(s)`;
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Envoyer une notification</h1>
          <p className="text-sm text-muted-foreground">Envoyez des notifications aux utilisateurs de la plateforme</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Destinataires */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Destinataires
            </CardTitle>
            <CardDescription>Choisissez qui recevra la notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">Tous les utilisateurs ({users.length})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agency" id="agency" />
                <Label htmlFor="agency" className="cursor-pointer">Une agence spécifique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="users" id="users" />
                <Label htmlFor="users" className="cursor-pointer">Utilisateurs spécifiques</Label>
              </div>
            </RadioGroup>

            {targetType === 'agency' && (
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une agence" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map(agency => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {targetType === 'users' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {loadingData ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleUserSelection(user.id)}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">
                            {user.first_name} {user.last_name}
                          </span>
                          {user.agence && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {user.agence}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            <div className="pt-2 text-sm text-muted-foreground border-t">
              → {getTargetLabel()}
            </div>
          </CardContent>
        </Card>

        {/* Contenu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5" />
              Message
            </CardTitle>
            <CardDescription>Rédigez votre notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <span>{cat.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {cat.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Maintenance prévue ce soir"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Rédigez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionUrl">Lien (optionnel)</Label>
              <Input
                id="actionUrl"
                placeholder="/chemin/vers/page"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">L'utilisateur sera redirigé vers cette page en cliquant</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="sendPush"
                checked={sendPush}
                onCheckedChange={(v) => setSendPush(!!v)}
              />
              <Label htmlFor="sendPush" className="cursor-pointer text-sm">
                Envoyer aussi une notification push (mobile/desktop)
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bouton envoi */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSend}
          disabled={loading || !title.trim() || !message.trim()}
          className="gap-2"
        >
          {loading ? (
            <>Envoi en cours...</>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Envoyer la notification
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
