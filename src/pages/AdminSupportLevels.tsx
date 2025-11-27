import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Shield, User } from 'lucide-react';

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  support_level: number;
  agence: string | null;
  role_agence: string | null;
  service_competencies: any;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'N1 - Aide de base';
    case 2: return 'N2 - Technique';
    case 3: return 'N3 - Développeur';
    default: return `Niveau ${level}`;
  }
};

const getSupportLevelColor = (level: number) => {
  switch (level) {
    case 1: return 'bg-blue-500';
    case 2: return 'bg-orange-500';
    case 3: return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export default function AdminSupportLevels() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadSupportUsers();
  }, [isAdmin, navigate]);

  const loadSupportUsers = async () => {
    setIsLoading(true);
    try {
      // Récupérer tous les utilisateurs ayant le rôle support
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'support');

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) {
        setSupportUsers([]);
        return;
      }

      const userIds = userRoles.map(ur => ur.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, support_level, agence, role_agence, service_competencies')
        .in('id', userIds)
        .order('support_level', { ascending: true })
        .order('last_name', { ascending: true });

      if (profilesError) throw profilesError;

      setSupportUsers(profiles as SupportUser[]);
    } catch (error) {
      console.error('Error loading support users:', error);
      toast.error('Impossible de charger les utilisateurs support');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSupportLevel = async (userId: string, newLevel: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ support_level: newLevel })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Niveau Apogée mis à jour vers ${getSupportLevelLabel(newLevel)}`);
      await loadSupportUsers();
    } catch (error) {
      console.error('Error updating support level:', error);
      toast.error('Impossible de mettre à jour le niveau');
    }
  };

  const toggleServiceCompetency = async (userId: string, service: string, currentCompetencies: any) => {
    try {
      const newCompetencies = { ...currentCompetencies };
      
      if (newCompetencies[service]) {
        delete newCompetencies[service];
      } else {
        newCompetencies[service] = true;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ service_competencies: newCompetencies })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Compétence ${service} ${newCompetencies[service] ? 'activée' : 'désactivée'}`);
      await loadSupportUsers();
    } catch (error) {
      console.error('Error updating service competency:', error);
      toast.error('Impossible de mettre à jour les compétences');
    }
  };

  const updateHelpConfortRole = async (userId: string, role: string, currentCompetencies: any) => {
    try {
      const newCompetencies = { ...currentCompetencies };
      
      if (role === 'none') {
        delete newCompetencies.helpconfort;
      } else {
        newCompetencies.helpconfort = role;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ service_competencies: newCompetencies })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Rôle HelpConfort mis à jour`);
      await loadSupportUsers();
    } catch (error) {
      console.error('Error updating HelpConfort role:', error);
      toast.error('Impossible de mettre à jour le rôle');
    }
  };

  const getUsersByLevel = (level: number) => {
    return supportUsers.filter(u => u.support_level === level);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
              Gestion des Compétences Support
            </h1>
            <p className="text-muted-foreground">
              Gérer les niveaux Apogée (N1/N2/N3) et les compétences par service
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/support')}
            className="gap-2"
          >
            Retour aux tickets
          </Button>
        </div>

        {/* Stats rapides */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(level => {
            const users = getUsersByLevel(level);
            return (
              <Card key={level} className="border-l-4 border-l-accent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${getSupportLevelColor(level)} text-white rounded-full p-0.5`} />
                    {getSupportLevelLabel(level)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {users.length === 0 ? 'Aucun utilisateur' : users.length === 1 ? 'utilisateur' : 'utilisateurs'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Liste des utilisateurs par niveau */}
        <div className="space-y-6">
          {[1, 2, 3].map(level => {
            const users = getUsersByLevel(level);
            return (
              <Card key={level} className="rounded-2xl shadow-lg border-l-4 border-l-accent">
                <CardHeader className="bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className={`w-5 h-5 ${getSupportLevelColor(level)} text-white rounded-full p-1`} />
                    {getSupportLevelLabel(level)}
                    <Badge variant="outline" className="ml-auto">
                      {users.length} {users.length === 1 ? 'membre' : 'membres'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun utilisateur à ce niveau
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {users.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${getSupportLevelColor(level)} flex items-center justify-center text-white font-bold`}>
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <User className="w-3 h-3" />
                                {user.email}
                                {user.agence && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {user.agence}
                                    </Badge>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Niveau Apogée :</span>
                              <Select
                                value={user.support_level.toString()}
                                onValueChange={(value) => updateSupportLevel(user.id, parseInt(value))}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">
                                    <span className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 bg-blue-500 text-white rounded-full p-0.5" />
                                      N1 - Aide de base
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="2">
                                    <span className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 bg-orange-500 text-white rounded-full p-0.5" />
                                      N2 - Technique
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="3">
                                    <span className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 bg-red-500 text-white rounded-full p-0.5" />
                                      N3 - Développeur
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">Compétences services :</span>
                                <Button
                                  size="sm"
                                  variant={user.service_competencies?.apogee ? "default" : "outline"}
                                  onClick={() => toggleServiceCompetency(user.id, 'apogee', user.service_competencies || {})}
                                >
                                  Apogée
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.service_competencies?.apporteurs ? "default" : "outline"}
                                  onClick={() => toggleServiceCompetency(user.id, 'apporteurs', user.service_competencies || {})}
                                >
                                  Apporteurs
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.service_competencies?.conseil ? "default" : "outline"}
                                  onClick={() => toggleServiceCompetency(user.id, 'conseil', user.service_competencies || {})}
                                >
                                  Conseil
                                </Button>
                              </div>
                              
                              {user.role_agence === 'tete_de_reseau' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Rôle HelpConfort :</span>
                                  <Select
                                    value={user.service_competencies?.helpconfort || 'none'}
                                    onValueChange={(value) => updateHelpConfortRole(user.id, value, user.service_competencies || {})}
                                  >
                                    <SelectTrigger className="w-[220px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Aucun</SelectItem>
                                      <SelectItem value="animateur_reseau">Animateur Réseau</SelectItem>
                                      <SelectItem value="directeur_reseau">Directeur Réseau</SelectItem>
                                      <SelectItem value="dg">Directeur Général</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
