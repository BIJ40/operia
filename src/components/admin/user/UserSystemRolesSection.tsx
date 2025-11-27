import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserSystemRolesSectionProps {
  systemRoles: string[];
  onRolesChange: (roles: string[]) => void;
  isTeteDeReseau: boolean;
}

const SYSTEM_ROLES = [
  { value: 'support', label: 'Support', description: 'Accès console support' },
  { value: 'franchiseur', label: 'Franchiseur', description: 'Accès réseau multi-agences' },
  { value: 'admin', label: 'Administrateur', description: 'Accès complet' },
];

export function UserSystemRolesSection({ 
  systemRoles, 
  onRolesChange, 
  isTeteDeReseau 
}: UserSystemRolesSectionProps) {
  const handleToggleRole = (role: string) => {
    if (systemRoles.includes(role)) {
      onRolesChange(systemRoles.filter(r => r !== role));
    } else {
      onRolesChange([...systemRoles, role]);
    }
  };

  // Calculer le nombre de rôles actifs en tenant compte des auto-assignés pour Tête de réseau
  const getActiveRolesCount = () => {
    const baseRoles = systemRoles.filter(r => r !== 'user');
    if (isTeteDeReseau) {
      const autoRoles = ['support', 'franchiseur'];
      const combined = new Set([...baseRoles, ...autoRoles]);
      return combined.size;
    }
    return baseRoles.length;
  };
  const activeRolesCount = getActiveRolesCount();

  return (
    <Collapsible defaultOpen className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Rôles système</span>
          {activeRolesCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeRolesCount} actif{activeRolesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {isTeteDeReseau && (
          <div className="mb-3 p-2 bg-accent/10 rounded text-sm text-muted-foreground">
            ⚡ Support et Franchiseur auto-cochés pour "Tête de réseau"
          </div>
        )}
        <div className="space-y-3">
          {SYSTEM_ROLES.map((role) => (
            <div key={role.value} className="flex items-start space-x-3">
              <Checkbox
                id={`role-${role.value}`}
                checked={
                  isTeteDeReseau && (role.value === 'support' || role.value === 'franchiseur')
                    ? true
                    : systemRoles.includes(role.value)
                }
                onCheckedChange={() => handleToggleRole(role.value)}
                disabled={isTeteDeReseau && (role.value === 'support' || role.value === 'franchiseur')}
              />
              <div className="grid gap-1 leading-none">
                <Label
                  htmlFor={`role-${role.value}`}
                  className="cursor-pointer font-medium"
                >
                  {role.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
