import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  label: string;
  slug: string;
}

interface UserFranchiseurConfigSectionProps {
  franchiseurRole: string;
  onFranchiseurRoleChange: (role: string) => void;
  assignedAgencies: string[];
  onAssignedAgenciesChange: (agencies: string[]) => void;
}

const FRANCHISEUR_ROLES = [
  { value: 'animateur', label: 'Animateur réseau' },
  { value: 'directeur', label: 'Directeur réseau' },
  { value: 'dg', label: 'Directeur Général' },
];

export function UserFranchiseurConfigSection({
  franchiseurRole,
  onFranchiseurRoleChange,
  assignedAgencies,
  onAssignedAgenciesChange,
}: UserFranchiseurConfigSectionProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    const { data } = await supabase
      .from('apogee_agencies')
      .select('id, label, slug')
      .eq('is_active', true)
      .order('label');
    if (data) setAgencies(data);
  };

  const toggleAgency = (agencyId: string) => {
    if (assignedAgencies.includes(agencyId)) {
      onAssignedAgenciesChange(assignedAgencies.filter(id => id !== agencyId));
    } else {
      onAssignedAgenciesChange([...assignedAgencies, agencyId]);
    }
  };

  return (
    <Collapsible defaultOpen className="border rounded-lg border-purple-200 bg-purple-50/30">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-purple-50/50">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-500" />
          <span className="font-medium">Configuration Franchiseur</span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Rôle réseau</Label>
          <RadioGroup
            value={franchiseurRole}
            onValueChange={onFranchiseurRoleChange}
            className="flex flex-wrap gap-4"
          >
            {FRANCHISEUR_ROLES.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <RadioGroupItem value={role.value} id={`fr-role-${role.value}`} />
                <Label htmlFor={`fr-role-${role.value}`} className="cursor-pointer">
                  {role.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {franchiseurRole === 'animateur' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Agences assignées</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Par défaut, les animateurs voient toutes les agences. Sélectionnez pour restreindre.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
              {agencies.map((agency) => (
                <div
                  key={agency.id}
                  className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggleAgency(agency.id)}
                >
                  <Checkbox
                    checked={assignedAgencies.includes(agency.id)}
                    onCheckedChange={() => toggleAgency(agency.id)}
                  />
                  <span className="text-sm truncate">{agency.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
