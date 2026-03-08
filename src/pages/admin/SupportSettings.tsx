/**
 * SupportSettings - Page de configuration du module Support
 * Gestion des agents, niveaux SA1/SA2/SA3, compétences, notifications
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, Users, Shield, Bell, Loader2, 
  Save, UserCog, Award, Zap, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';


interface SupportAgentConfig {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  global_role: string | null;
  support_level: number | null;
  isAgent: boolean;
  isAdmin: boolean;
  skills: string[];
}

const SUPPORT_SKILLS = [
  { id: 'apogee', label: 'Apogée', description: 'Support logiciel Apogée' },
  { id: 'helpconfort', label: 'HelpConfort', description: 'Support plateforme HC' },
  { id: 'technique', label: 'Technique', description: 'Problèmes techniques' },
  { id: 'formation', label: 'Formation', description: 'Aide à la formation' },
  { id: 'facturation', label: 'Facturation', description: 'Questions facturation' },
];

const SUPPORT_LEVELS = [
  { value: 1, label: 'SA1 - Agent Standard', description: 'Support de premier niveau' },
  { value: 2, label: 'SA2 - Agent Confirmé', description: 'Support avancé, escalade possible' },
  { value: 3, label: 'SA3 - Expert', description: 'Résolution complexe, admin support' },
];

export default function SupportSettings() {
  const { globalRole } = usePermissions();
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<SupportAgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<SupportAgentConfig>>>(new Map());

  // Charger les agents support depuis user_modules (source de vérité)
  const loadAgents = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch aide modules from user_modules
      const { data: aideModules, error: modError } = await supabase
        .from('user_modules')
        .select('user_id, options')
        .eq('module_key', 'aide');
      
      if (modError) throw modError;

      // 2. Also include platform_admin/superadmin users
      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .in('global_role', ['platform_admin', 'superadmin']);
      
      if (adminError) throw adminError;

      // Combine user IDs
      const moduleUserIds = (aideModules || []).map(m => m.user_id);
      const adminUserIds = (adminProfiles || []).map(p => p.id);
      const allUserIds = [...new Set([...moduleUserIds, ...adminUserIds])];

      if (allUserIds.length === 0) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      // 3. Fetch profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, global_role, support_level')
        .in('id', allUserIds)
        .eq('is_active', true)
        .order('first_name');

      if (profileError) throw profileError;

      // Build options map from user_modules
      const optionsMap = new Map<string, Record<string, any>>();
      (aideModules || []).forEach(m => {
        optionsMap.set(m.user_id, (m.options as Record<string, any>) || {});
      });

      const formattedAgents: SupportAgentConfig[] = (profiles || []).map(p => {
        const options = optionsMap.get(p.id) || {};
        return {
          id: p.id,
          email: p.email,
          first_name: p.first_name,
          last_name: p.last_name,
          global_role: p.global_role,
          support_level: p.support_level ?? null,
          isAgent: options.agent === true,
          isAdmin: options.admin === true,
          skills: options.skills ?? [],
        };
      });

      setAgents(formattedAgents);
    } catch (error) {
      logError(error, 'SUPPORT_SETTINGS_LOAD');
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Mettre à jour un agent
  const updateAgentConfig = (agentId: string, field: keyof SupportAgentConfig, value: any) => {
    setPendingChanges(prev => {
      const updated = new Map(prev);
      const current = updated.get(agentId) || {};
      updated.set(agentId, { ...current, [field]: value });
      return updated;
    });

    // Mise à jour locale pour l'affichage
    setAgents(prev => prev.map(a => 
      a.id === agentId ? { ...a, [field]: value } : a
    ));
  };

  // Sauvegarder les changements
  const saveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Aucun changement à sauvegarder');
      return;
    }

    setIsSaving(true);
    try {
      for (const [agentId, changes] of pendingChanges.entries()) {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) continue;

        // Update support_level in profiles if changed
        if ('support_level' in changes) {
          const { error } = await supabase
            .from('profiles')
            .update({ support_level: changes.support_level })
            .eq('id', agentId);
          if (error) throw error;
        }

        // Update agent/admin/skills in user_modules
        if ('isAgent' in changes || 'isAdmin' in changes || 'skills' in changes) {
          const newOptions = {
            agent: 'isAgent' in changes ? changes.isAgent : agent.isAgent,
            admin: 'isAdmin' in changes ? changes.isAdmin : agent.isAdmin,
            skills: 'skills' in changes ? changes.skills : agent.skills,
          };

          const { error } = await supabase
            .from('user_modules')
            .upsert({
              user_id: agentId,
              module_key: 'aide',
              options: newOptions,
              enabled_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,module_key',
            });
          if (error) throw error;
        }
      }

      toast.success('Configuration sauvegardée');
      setPendingChanges(new Map());
      loadAgents();
    } catch (error) {
      logError(error, 'SUPPORT_SETTINGS_SAVE');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle skill
  const toggleSkill = (agentId: string, skillId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newSkills = agent.skills.includes(skillId)
      ? agent.skills.filter(s => s !== skillId)
      : [...agent.skills, skillId];

    updateAgentConfig(agentId, 'skills', newSkills);
  };

  const getAgentName = (agent: SupportAgentConfig) => {
    if (agent.first_name && agent.last_name) {
      return `${agent.first_name} ${agent.last_name}`;
    }
    return agent.email || 'Agent inconnu';
  };

  const hasPendingChanges = pendingChanges.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paramètres Support</h1>
          <p className="text-muted-foreground">Configuration des agents, niveaux et compétences</p>
        </div>
        <Button 
          onClick={saveChanges} 
          disabled={!hasPendingChanges || isSaving}
          className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Sauvegarder
          {hasPendingChanges && (
            <Badge variant="secondary" className="ml-2">
              {pendingChanges.size}
            </Badge>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="w-4 h-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-2">
            <Award className="w-4 h-4" />
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Zap className="w-4 h-4" />
            Compétences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Onglet Agents */}
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Gestion des Agents Support
              </CardTitle>
              <CardDescription>
                Activer/désactiver les agents et leurs rôles support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun utilisateur avec le module Support activé</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {agents.map((agent) => (
                      <div 
                        key={agent.id} 
                        className={`p-4 rounded-lg border transition-colors ${
                          pendingChanges.has(agent.id) ? 'border-helpconfort-blue bg-helpconfort-blue/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{getAgentName(agent)}</p>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={agent.isAgent}
                                onCheckedChange={(checked) => updateAgentConfig(agent.id, 'isAgent', checked)}
                              />
                              <Label className="text-sm">Agent</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={agent.isAdmin}
                                onCheckedChange={(checked) => updateAgentConfig(agent.id, 'isAdmin', checked)}
                              />
                              <Label className="text-sm">Admin</Label>
                            </div>
                          </div>
                        </div>
                        
                        {agent.isAgent && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-4">
                              <Label className="text-sm min-w-[80px]">Niveau:</Label>
                              <Select
                                value={String(agent.support_level || 1)}
                                onValueChange={(v) => updateAgentConfig(agent.id, 'support_level', parseInt(v))}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SUPPORT_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={String(level.value)}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Niveaux */}
        <TabsContent value="levels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Niveaux de Support
              </CardTitle>
              <CardDescription>
                Définition des niveaux SA1, SA2, SA3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {SUPPORT_LEVELS.map((level) => (
                  <div key={level.value} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={
                              level.value === 1 ? 'bg-blue-500' :
                              level.value === 2 ? 'bg-green-500' : 'bg-purple-500'
                            }
                          >
                            SA{level.value}
                          </Badge>
                          <span className="font-medium">{level.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {level.description}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {agents.filter(a => a.support_level === level.value).length} agent(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Compétences */}
        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Compétences par Agent
              </CardTitle>
              <CardDescription>
                Attribution des compétences techniques aux agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {agents.filter(a => a.isAgent).map((agent) => (
                      <div 
                        key={agent.id} 
                        className={`p-4 rounded-lg border ${
                          pendingChanges.has(agent.id) ? 'border-helpconfort-blue bg-helpconfort-blue/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{getAgentName(agent)}</p>
                            <Badge variant="outline" className="mt-1">
                              SA{agent.support_level || 1}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {SUPPORT_SKILLS.map((skill) => (
                            <Badge
                              key={skill.id}
                              variant={agent.skills.includes(skill.id) ? 'default' : 'outline'}
                              className={`cursor-pointer transition-colors ${
                                agent.skills.includes(skill.id) 
                                  ? 'bg-helpconfort-blue hover:bg-helpconfort-blue/80' 
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleSkill(agent.id, skill.id)}
                            >
                              {skill.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Paramètres de Notifications
              </CardTitle>
              <CardDescription>
                Configuration des alertes SMS, email et in-app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Notifications SMS</p>
                    <p className="text-sm text-muted-foreground">
                      Alerter les agents par SMS pour les demandes urgentes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Notifications Email</p>
                    <p className="text-sm text-muted-foreground">
                      Résumé quotidien des tickets non résolus
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Notifications In-App</p>
                    <p className="text-sm text-muted-foreground">
                      Afficher les notifications dans le header
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Les paramètres de notifications avancés sont configurés dans les secrets Supabase
                    (ALLMYSMS_API_KEY, RESEND_API_KEY)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
