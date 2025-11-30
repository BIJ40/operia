/**
 * Dialog pour N3+ de soumettre une demande de création d'utilisateur
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCreationRequests, type CreateRequestInput } from '@/hooks/use-user-creation-requests';
import { DEFAULT_MODULES_BY_ROLE, getDefaultModulesForGlobalRole } from '@/config/modulesByRole';
import { MODULE_DEFINITIONS, EnabledModules, ModuleKey, ModuleOptionsState, ModuleDefinition } from '@/types/modules';
import { GlobalRole, GLOBAL_ROLE_LABELS, getRoleLevel } from '@/types/globalRoles';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateUserRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_AGENCE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'externe', label: 'Externe' },
];

// N3 peut créer N1 (franchisee_user) ou N2 (franchisee_admin)
const ALLOWED_TARGET_ROLES: GlobalRole[] = ['base_user', 'franchisee_user', 'franchisee_admin'];

export function CreateUserRequestDialog({ open, onOpenChange }: CreateUserRequestDialogProps) {
  const { user, globalRole, agence: currentUserAgency } = useAuth();
  const { createRequest, isCreating } = useUserCreationRequests();
  const currentUserLevel = getRoleLevel(globalRole);

  // Form state
  const [formData, setFormData] = useState({
    agency_id: '',
    first_name: '',
    last_name: '',
    email: '',
    role_agence: 'assistante',
    target_global_role: 'franchisee_user' as GlobalRole,
    notes: '',
  });
  const [enabledModules, setEnabledModules] = useState<EnabledModules>({});

  // Fetch agencies (either assigned or own agency)
  const { data: agencies = [] } = useQuery({
    queryKey: ['user-agencies-for-request', user?.id],
    queryFn: async () => {
      // Get assigned agencies for N3+
      const { data: assignments } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id')
        .eq('user_id', user?.id || '');

      const assignedIds = (assignments || []).map(a => a.agency_id);

      // Also get own agency
      if (currentUserAgency) {
        const { data: ownAgency } = await supabase
          .from('apogee_agencies')
          .select('id')
          .eq('slug', currentUserAgency)
          .single();
        
        if (ownAgency && !assignedIds.includes(ownAgency.id)) {
          assignedIds.push(ownAgency.id);
        }
      }

      if (assignedIds.length === 0) {
        return [];
      }

      const { data: agenciesData, error } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug')
        .in('id', assignedIds)
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return agenciesData || [];
    },
    enabled: open && !!user?.id,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const defaultModules = getDefaultModulesForGlobalRole('franchisee_user');
      setFormData({
        agency_id: agencies[0]?.id || '',
        first_name: '',
        last_name: '',
        email: '',
        role_agence: 'assistante',
        target_global_role: 'franchisee_user',
        notes: '',
      });
      setEnabledModules(defaultModules);
    }
  }, [open, agencies]);

  // Update modules when target role changes
  useEffect(() => {
    const defaultModules = getDefaultModulesForGlobalRole(formData.target_global_role);
    setEnabledModules(defaultModules);
  }, [formData.target_global_role]);

  // Get max allowed modules based on N3's own level
  const getMaxModulesForTargetRole = (targetRole: GlobalRole): EnabledModules => {
    // N3 can only give modules up to what the target role should have
    // AND not exceeding what they themselves have access to
    const targetRoleModules = DEFAULT_MODULES_BY_ROLE[targetRole] || {};
    const n3Modules = DEFAULT_MODULES_BY_ROLE['franchisor_user'] || {};

    const maxModules: EnabledModules = {};
    
    for (const moduleKey of Object.keys(targetRoleModules) as ModuleKey[]) {
      const targetModule = targetRoleModules[moduleKey];
      const n3Module = n3Modules[moduleKey];
      if (!n3Module) continue; // N3 doesn't have this module, can't grant it

      const targetState = targetModule as ModuleOptionsState;
      const n3State = n3Module as ModuleOptionsState;

      // Module is enabled only if both target role and N3 have it
      const maxState: ModuleOptionsState = {
        enabled: targetState.enabled && n3State.enabled,
        options: {},
      };

      // For options, only allow what both have
      if (targetState.options && n3State.options) {
        for (const optKey of Object.keys(targetState.options)) {
          const targetOptVal = targetState.options[optKey];
          const n3OptVal = n3State.options[optKey];
          maxState.options![optKey] = 
            typeof targetOptVal === 'boolean' && typeof n3OptVal === 'boolean'
              ? targetOptVal && n3OptVal
              : false;
        }
      }

      maxModules[moduleKey] = maxState;
    }

    return maxModules;
  };

  const handleSubmit = () => {
    if (!formData.agency_id || !formData.first_name || !formData.last_name || !formData.email) {
      return;
    }

    const input: CreateRequestInput = {
      agency_id: formData.agency_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      role_agence: formData.role_agence,
      target_global_role: formData.target_global_role,
      enabled_modules: enabledModules,
      notes: formData.notes || undefined,
    };

    createRequest(input, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const toggleModule = (moduleKey: ModuleKey, enabled: boolean) => {
    const maxModules = getMaxModulesForTargetRole(formData.target_global_role);
    const maxModule = maxModules[moduleKey] as ModuleOptionsState | undefined;
    
    if (enabled && (!maxModule || !maxModule.enabled)) {
      return; // Can't enable if not allowed
    }

    setEnabledModules(prev => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] as ModuleOptionsState || { options: {} }),
        enabled,
      },
    }));
  };

  const toggleModuleOption = (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    const maxModules = getMaxModulesForTargetRole(formData.target_global_role);
    const maxModule = maxModules[moduleKey] as ModuleOptionsState | undefined;
    
    if (enabled && (!maxModule?.options || !maxModule.options[optionKey])) {
      return; // Can't enable if not allowed
    }

    setEnabledModules(prev => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] as ModuleOptionsState || { enabled: false, options: {} }),
        options: {
          ...((prev[moduleKey] as ModuleOptionsState)?.options || {}),
          [optionKey]: enabled,
        },
      },
    }));
  };

  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    const state = enabledModules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const isOptionEnabled = (moduleKey: ModuleKey, optionKey: string): boolean => {
    const state = enabledModules[moduleKey];
    if (typeof state === 'object' && state.options) {
      return state.options[optionKey] === true;
    }
    return false;
  };

  const maxModules = getMaxModulesForTargetRole(formData.target_global_role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Demander la création d'un utilisateur
          </DialogTitle>
          <DialogDescription>
            Cette demande sera soumise pour validation par un administrateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agency */}
          <div className="space-y-2">
            <Label>Agence *</Label>
            <Select
              value={formData.agency_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, agency_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Nom"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemple.com"
            />
          </div>

          {/* Role agence */}
          <div className="space-y-2">
            <Label>Poste occupé</Label>
            <Select
              value={formData.role_agence}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role_agence: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_AGENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Global role */}
          <div className="space-y-2">
            <Label>Niveau d'accès</Label>
            <Select
              value={formData.target_global_role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_global_role: value as GlobalRole }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TARGET_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modules */}
          <div className="space-y-2">
            <Label>Modules activés</Label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous ne pouvez activer que les modules autorisés pour le niveau {GLOBAL_ROLE_LABELS[formData.target_global_role]}.
              </AlertDescription>
            </Alert>
            
            <Accordion type="multiple" className="w-full">
              {MODULE_DEFINITIONS.map((moduleDef: ModuleDefinition) => {
                const moduleKey = moduleDef.key;
                const maxModule = maxModules[moduleKey] as ModuleOptionsState | undefined;
                const canEnableModule = maxModule?.enabled === true;
                const moduleEnabled = isModuleEnabled(moduleKey);

                return (
                  <AccordionItem key={moduleKey} value={moduleKey}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={moduleEnabled}
                          onCheckedChange={(checked) => toggleModule(moduleKey, checked)}
                          disabled={!canEnableModule}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={!canEnableModule ? 'text-muted-foreground' : ''}>
                          {moduleDef.label}
                        </span>
                        {!canEnableModule && (
                          <span className="text-xs text-muted-foreground">(non disponible)</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-10 space-y-2">
                        {moduleDef.options.map((optDef) => {
                          const canEnableOption = maxModule?.options?.[optDef.key] === true;
                          const optionEnabled = isOptionEnabled(moduleKey, optDef.key);
                          
                          return (
                            <div key={optDef.key} className="flex items-center gap-2">
                              <Switch
                                checked={optionEnabled}
                                onCheckedChange={(checked) => toggleModuleOption(moduleKey, optDef.key, checked)}
                                disabled={!canEnableOption || !moduleEnabled}
                              />
                              <span className={!canEnableOption ? 'text-muted-foreground text-sm' : 'text-sm'}>
                                {optDef.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires pour l'administrateur..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !formData.agency_id || !formData.first_name || !formData.last_name || !formData.email}
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Soumettre la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
