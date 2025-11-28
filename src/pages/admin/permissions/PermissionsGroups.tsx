import { useState } from 'react';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useCloneGroup, useGroupPermissions, useUpsertGroupPermission, useScopes } from '@/hooks/use-permissions-admin';
import { Group, PERMISSION_LEVELS, SystemRole } from '@/services/permissionsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Copy, Trash2, Settings, ChevronRight, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPermissionHelpText, PermissionLevel } from '@/config/permissionsHelpTexts';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const SYSTEM_ROLES: { value: SystemRole; label: string }[] = [
  { value: 'visiteur', label: 'Visiteur' },
  { value: 'utilisateur', label: 'Utilisateur' },
  { value: 'support', label: 'Support' },
  { value: 'admin', label: 'Admin' },
];

export default function PermissionsGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: scopes, isLoading: scopesLoading } = useScopes();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const cloneGroup = useCloneGroup();
  const upsertGroupPermission = useUpsertGroupPermission();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [newGroupType, setNewGroupType] = useState<'franchise' | 'franchiseur'>('franchise');
  const [newGroupRoleLimit, setNewGroupRoleLimit] = useState<SystemRole>('utilisateur');
  const [cloneLabel, setCloneLabel] = useState('');
  const [isApplyingAll, setIsApplyingAll] = useState<number | null>(null);
  
  const { data: groupPermissions } = useGroupPermissions(selectedGroupId);
  
  const selectedGroup = groups?.find(g => g.id === selectedGroupId);
  
  const handleCreateGroup = () => {
    createGroup.mutate({
      label: newGroupLabel,
      type: newGroupType,
      system_role_limit: newGroupRoleLimit,
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewGroupLabel('');
      }
    });
  };
  
  const handleCloneGroup = () => {
    if (selectedGroupId) {
      cloneGroup.mutate({ id: selectedGroupId, newLabel: cloneLabel }, {
        onSuccess: () => {
          setIsCloneDialogOpen(false);
          setCloneLabel('');
        }
      });
    }
  };
  
  const handlePermissionChange = (scopeId: string, level: number) => {
    if (selectedGroupId) {
      upsertGroupPermission.mutate({ groupId: selectedGroupId, scopeId, level });
    }
  };
  
  const handleApplyLevelToAllScopes = async (level: number) => {
    if (!selectedGroupId || !scopes || isApplyingAll !== null) return;
    
    const levelLabel = PERMISSION_LEVELS.find(l => l.value === level)?.label || String(level);
    setIsApplyingAll(level);
    
    try {
      // Apply level to all scopes sequentially to avoid overwhelming the API
      const promises = scopes.map(scope => 
        upsertGroupPermission.mutateAsync({ groupId: selectedGroupId, scopeId: scope.id, level })
      );
      
      await Promise.all(promises);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['group-permissions', selectedGroupId] });
      await queryClient.invalidateQueries({ queryKey: ['all-group-permissions'] });
      
      toast({
        title: 'Permissions mises à jour',
        description: `Niveau "${levelLabel}" appliqué à tous les scopes pour le groupe ${selectedGroup?.label}.`,
      });
    } catch (error) {
      console.error('Error applying level to all scopes:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour des permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsApplyingAll(null);
    }
  };
  
  const getPermissionLevel = (scopeId: string): number => {
    const perm = groupPermissions?.find(p => p.scope_id === scopeId);
    return perm?.level ?? 0;
  };
  
  // Group scopes by area
  const scopesByArea = scopes?.reduce((acc, scope) => {
    const area = scope.area || 'Autre';
    if (!acc[area]) acc[area] = [];
    acc[area].push(scope);
    return acc;
  }, {} as Record<string, typeof scopes>);
  
  if (groupsLoading || scopesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 col-span-3" />
        </div>
      </div>
    );
  }
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Gestion des Groupes</h1>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-md p-4 text-left">
                <div className="space-y-3 text-xs">
                  <p className="font-semibold text-sm">Plafond par rôle système</p>
                  <div className="space-y-1">
                    <p><strong>visiteur</strong> → plafond 1 (Lecture max)</p>
                    <p><strong>utilisateur</strong> → plafond 2 (Écriture max)</p>
                    <p><strong>support</strong> → plafond 3 (Gestion max)</p>
                    <p><strong>admin</strong> → plafond 4 (Admin max)</p>
                  </div>
                  <p className="text-muted-foreground">
                    Calcul : <code className="bg-muted px-1 rounded">min(override, groupe, plafond_role)</code>
                  </p>
                  <div className="border-t pt-2">
                    <p className="font-semibold">Exemple Dirigeant :</p>
                    <p>Groupe = Admin (4), system_role = admin → niveau final = 4</p>
                    <p>Groupe = Admin (4), system_role = utilisateur → niveau final = 2</p>
                  </div>
                  <div className="border-t pt-2">
                    <p className="font-semibold">Exemple Assistante :</p>
                    <p>Guide Apogée (groupe=1) + plafond=2 → Lecture</p>
                    <p>Mes Demandes (groupe=2) + plafond=2 → Écriture</p>
                    <p>Admin Users (groupe=0) → Aucun accès</p>
                  </div>
                  <p className="text-muted-foreground italic">
                    Mettez les groupes au niveau max du poste. Pilotez la puissance réelle via system_role.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nouveau groupe</Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un groupe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom du groupe</Label>
                  <Input value={newGroupLabel} onChange={e => setNewGroupLabel(e.target.value)} placeholder="Ex: Commercial" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newGroupType} onValueChange={(v: 'franchise' | 'franchiseur') => setNewGroupType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="franchise">Franchise</SelectItem>
                      <SelectItem value="franchiseur">Franchiseur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plafond rôle système</Label>
                  <Select value={newGroupRoleLimit} onValueChange={(v: SystemRole) => setNewGroupRoleLimit(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYSTEM_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateGroup} disabled={!newGroupLabel}>Créer</Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Groups List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Groupes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {groups?.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedGroupId === group.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{group.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.type === 'franchise' ? 'F' : 'FR'}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </CardContent>
          </Card>
          
          {/* Permissions Matrix */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {selectedGroup ? `Permissions: ${selectedGroup.label}` : 'Sélectionnez un groupe'}
                </CardTitle>
                {selectedGroup && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Plafond: {SYSTEM_ROLES.find(r => r.value === selectedGroup.system_role_limit)?.label}
                    </Badge>
                    <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4 mr-1" /> Cloner
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cloner le groupe</DialogTitle>
                        </DialogHeader>
                        <div>
                          <Label>Nouveau nom</Label>
                          <Input value={cloneLabel} onChange={e => setCloneLabel(e.target.value)} placeholder={`${selectedGroup.label} (copie)`} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>Annuler</Button>
                          <Button onClick={handleCloneGroup} disabled={!cloneLabel}>Cloner</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le groupe ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Les utilisateurs de ce groupe perdront leurs permissions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            deleteGroup.mutate(selectedGroupId!);
                            setSelectedGroupId(null);
                          }}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedGroup ? (
                <div className="space-y-6">
                  {/* Apply to all buttons */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <span className="text-sm font-medium text-muted-foreground mr-2">Appliquer à tous :</span>
                    {PERMISSION_LEVELS.map(level => (
                      <Tooltip key={level.value}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyLevelToAllScopes(level.value)}
                            disabled={isApplyingAll !== null}
                            className={cn(
                              "text-xs min-w-[70px]",
                              isApplyingAll === level.value && "opacity-50"
                            )}
                          >
                            {isApplyingAll === level.value ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            {level.label}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Appliquer "{level.label}" à tous les scopes du groupe</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {isApplyingAll !== null && (
                      <span className="text-xs text-muted-foreground ml-2">Application en cours...</span>
                    )}
                  </div>
                  
                  {scopesByArea && Object.entries(scopesByArea).map(([area, areaScopes]) => (
                    <div key={area}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{area}</h3>
                      <div className="grid gap-2">
                        {areaScopes?.map(scope => (
                          <div key={scope.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{scope.label}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-xs">{scope.description || `Module ${scope.label}`}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex gap-1">
                              {PERMISSION_LEVELS.map(level => (
                                <Tooltip key={level.value}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handlePermissionChange(scope.id, level.value)}
                                      className={cn(
                                        "px-2 py-1 text-xs rounded transition-colors",
                                        getPermissionLevel(scope.id) === level.value
                                          ? level.color
                                          : "bg-background border hover:bg-muted"
                                      )}
                                    >
                                      {level.label}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-semibold text-xs mb-1">{scope.label} – {level.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {getPermissionHelpText(scope.slug, level.value as PermissionLevel)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Sélectionnez un groupe pour modifier ses permissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
