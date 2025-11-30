/**
 * Page de gestion des utilisateurs pour le franchiseur (N3/N4)
 * Permet de créer/modifier/désactiver les utilisateurs des agences du réseau
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { 
  GLOBAL_ROLES, 
  GLOBAL_ROLE_LABELS, 
  GLOBAL_ROLE_COLORS,
  GlobalRole,
} from '@/types/globalRoles';
import {
  getUserManagementCapabilities,
  canManageUser,
} from '@/config/roleMatrix';
import { 
  MODULE_DEFINITIONS, 
  EnabledModules,
  ModuleOptionsState,
  ModuleKey
} from '@/types/modules';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Save, 
  Loader2,
  Building2,
  UserPlus,
  MoreHorizontal,
  UserX,
  UserCheck,
  Pencil,
  KeyRound,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgencies } from '../hooks/useAgencies';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  role_agence: string | null;
  is_active: boolean | null;
}

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export default function FranchiseurUsers() {
  const queryClient = useQueryClient();
  const { globalRole, user } = useAuth();
  const { franchiseurRole, assignedAgencies } = useFranchiseur();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state for edit/create
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    agence: '',
    global_role: 'franchisee_user' as GlobalRole,
    role_agence: 'assistante',
    enabled_modules: {} as EnabledModules,
  });
  
  const capabilities = getUserManagementCapabilities(globalRole);
  const { data: agencies } = useAgencies();
  
  // Get agencies this user can manage
  const manageableAgencies = useMemo(() => {
    if (!agencies) return [];
    
    if (capabilities.manageScope === 'allAgencies') {
      return agencies;
    }
    
    if (capabilities.manageScope === 'assignedAgencies' && assignedAgencies && assignedAgencies.length > 0) {
      return agencies.filter(a => assignedAgencies.includes(a.slug));
    }
    
    // If no assigned agencies, show all (default for animateurs without restrictions)
    if (capabilities.manageScope === 'assignedAgencies') {
      return agencies;
    }
    
    return [];
  }, [agencies, capabilities.manageScope, assignedAgencies]);
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['franchiseur-users', filterAgency],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules, role_agence, is_active')
        .order('last_name', { ascending: true });
      
      // Filter by manageable agencies for non-admin
      if (capabilities.manageScope === 'assignedAgencies' && assignedAgencies && assignedAgencies.length > 0) {
        query = query.in('agence', assignedAgencies);
      }
      
      if (filterAgency && filterAgency !== 'all') {
        query = query.eq('agence', filterAgency);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
  });
  
  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(u => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        u.first_name?.toLowerCase().includes(searchLower) ||
        u.last_name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.agence?.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = filterRole === 'all' || u.global_role === filterRole;
      
      // Active filter
      const matchesActive = showInactive ? true : u.is_active !== false;
      
      // Only show users that can be managed (check role hierarchy)
      const canManage = capabilities.canEditRoles.includes(u.global_role || 'base_user');
      
      return matchesSearch && matchesRole && matchesActive && canManage;
    });
  }, [users, searchQuery, filterRole, showInactive, globalRole]);
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      first_name: string;
      last_name: string;
      agence: string;
      global_role: GlobalRole;
      role_agence: string;
      enabled_modules: EnabledModules;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          agence: data.agence,
          global_role: data.global_role,
          role_agence: data.role_agence,
          enabled_modules: data.enabled_modules as unknown as Json,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Utilisateur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
  
  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user?.id,
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Utilisateur désactivé');
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      setIsDeactivateDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la désactivation');
      console.error(error);
    },
  });
  
  // Reactivate user mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Utilisateur réactivé');
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la réactivation');
      console.error(error);
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé (temporaire envoyé par email)');
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la réinitialisation');
      console.error(error);
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          agence: data.agence,
          global_role: data.global_role,
          role_agence: data.role_agence,
          enabled_modules: data.enabled_modules,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé');
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur lors de la création');
      console.error(error);
    },
  });
  
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      agence: '',
      global_role: 'franchisee_user',
      role_agence: 'assistante',
      enabled_modules: {},
    });
  };
  
  const openEditDialog = (u: UserProfile) => {
    setSelectedUser(u);
    setFormData({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      agence: u.agence || '',
      global_role: u.global_role || 'franchisee_user',
      role_agence: u.role_agence || 'assistante',
      enabled_modules: u.enabled_modules || {},
    });
    setIsEditDialogOpen(true);
  };
  
  const handleSaveUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...formData,
    });
  };
  
  const handleCreateUser = () => {
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.agence) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createUserMutation.mutate(formData);
  };
  
  // Module toggle helper
  const toggleModule = (moduleKey: ModuleKey, enabled: boolean) => {
    setFormData(prev => {
      const currentModuleState = prev.enabled_modules[moduleKey];
      const existing = typeof currentModuleState === 'object' && currentModuleState !== null 
        ? currentModuleState 
        : { enabled: false, options: {} };
      
      return {
        ...prev,
        enabled_modules: {
          ...prev.enabled_modules,
          [moduleKey]: {
            ...existing,
            enabled,
          },
        },
      };
    });
  };
  
  const toggleModuleOption = (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    setFormData(prev => {
      const currentModuleState = prev.enabled_modules[moduleKey];
      const currentModule = typeof currentModuleState === 'object' && currentModuleState !== null 
        ? currentModuleState 
        : { enabled: false, options: {} };
      
      return {
        ...prev,
        enabled_modules: {
          ...prev.enabled_modules,
          [moduleKey]: {
            ...currentModule,
            options: {
              ...((currentModule as ModuleOptionsState).options || {}),
              [optionKey]: enabled,
            },
          },
        },
      };
    });
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
        </p>
        
        <Button 
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterAgency} onValueChange={setFilterAgency}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Toutes les agences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {manageableAgencies.map((a) => (
                  <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {capabilities.canEditRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Switch 
                id="show-inactive" 
                checked={showInactive} 
                onCheckedChange={setShowInactive} 
              />
              <Label htmlFor="show-inactive" className="text-sm">Inclure inactifs</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Rôle Système</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className={u.is_active === false ? 'opacity-50' : ''}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{u.first_name} {u.last_name}</div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.agence || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.global_role && (
                      <Badge className={GLOBAL_ROLE_COLORS[u.global_role]}>
                        {GLOBAL_ROLE_LABELS[u.global_role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role_agence && ROLE_AGENCE_LABELS[u.role_agence] || u.role_agence || '-'}
                  </TableCell>
                  <TableCell>
                    {u.is_active === false ? (
                      <Badge variant="secondary">Inactif</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Actif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(u)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(u);
                          setIsResetPasswordDialogOpen(true);
                        }}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Réinitialiser MDP
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.is_active === false ? (
                          <DropdownMenuItem onClick={() => reactivateUserMutation.mutate(u.id)}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Réactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDeactivateDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Désactiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun utilisateur trouvé</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Identity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input 
                  value={formData.first_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input 
                  value={formData.last_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Agency & Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agence *</Label>
                <Select 
                  value={formData.agence} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manageableAgencies.map((a) => (
                      <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rôle Système *</Label>
                <Select 
                  value={formData.global_role} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, global_role: v as GlobalRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities.canEditRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {GLOBAL_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Poste occupé</Label>
              <Select 
                value={formData.role_agence} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, role_agence: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_AGENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Modules */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Modules activés</Label>
              <Accordion type="multiple" className="w-full">
                {MODULE_DEFINITIONS.map((module) => {
                  const moduleState = formData.enabled_modules[module.key] as ModuleOptionsState | undefined;
                  const isEnabled = moduleState?.enabled ?? false;
                  
                  return (
                    <AccordionItem key={module.key} value={module.key}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isEnabled}
                            onCheckedChange={(checked) => toggleModule(module.key, !!checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>{module.label}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-8 space-y-2">
                          {module.options.map((opt) => (
                            <div key={opt.key} className="flex items-center gap-2">
                              <Checkbox 
                                id={`${module.key}-${opt.key}`}
                                checked={moduleState?.options?.[opt.key] ?? false}
                                onCheckedChange={(checked) => toggleModuleOption(module.key, opt.key, !!checked)}
                                disabled={!isEnabled}
                              />
                              <Label 
                                htmlFor={`${module.key}-${opt.key}`}
                                className="text-sm cursor-pointer"
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveUser} 
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input 
                  value={formData.first_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input 
                  value={formData.last_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agence *</Label>
                <Select 
                  value={formData.agence} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manageableAgencies.map((a) => (
                      <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rôle Système *</Label>
                <Select 
                  value={formData.global_role} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, global_role: v as GlobalRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities.canCreateRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {GLOBAL_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Poste occupé</Label>
              <Select 
                value={formData.role_agence} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, role_agence: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_AGENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserPlus className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur {selectedUser?.first_name} {selectedUser?.last_name} ne pourra plus se connecter.
              Cette action est réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deactivateUserMutation.mutate(selectedUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un nouveau mot de passe temporaire sera généré et envoyé par email à {selectedUser?.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
            >
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
