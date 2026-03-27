/**
 * Liste des collaborateurs groupée par organigramme
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Users, Wrench, Headphones, Briefcase, Building2, HardHat } from 'lucide-react';
import { Collaborator, COLLABORATOR_TYPES, CollaboratorType } from '@/types/collaborator';
import { CollaboratorCard } from './CollaboratorCard';

interface CollaboratorListProps {
  collaborators: Collaborator[];
  isLoading: boolean;
  canManage: boolean;
  onCreateClick: () => void;
}

// Catégories organigramme
type OrgCategory = 'direction' | 'administratif' | 'terrain';

const ORG_CATEGORIES: Record<OrgCategory, { 
  label: string; 
  icon: typeof Users; 
  types: CollaboratorType[];
  color: string;
  bgColor: string;
}> = {
  direction: { 
    label: 'Direction', 
    icon: Building2, 
    types: ['DIRIGEANT'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  administratif: { 
    label: 'Administratif', 
    icon: Headphones, 
    types: ['ADMINISTRATIF'],
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  terrain: { 
    label: 'Terrain', 
    icon: HardHat, 
    types: ['TECHNICIEN', 'COMMERCIAL', 'AUTRE'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
};

const ORG_ORDER: OrgCategory[] = ['direction', 'administratif', 'terrain'];

export function CollaboratorList({
  collaborators,
  isLoading,
  canManage,
  onCreateClick,
}: CollaboratorListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(true);

  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.first_name?.toLowerCase().includes(searchLower) ||
        c.last_name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.role?.toLowerCase().includes(searchLower);

      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const isActive = !c.leaving_date;
      const matchesActive = showInactive || isActive;

      return matchesSearch && matchesType && matchesActive;
    });
  }, [collaborators, searchQuery, typeFilter, showInactive]);

  // Group by org category
  const groupedCollaborators = useMemo(() => {
    const groups: Record<OrgCategory, Collaborator[]> = {
      direction: [],
      administratif: [],
      terrain: [],
    };

    filteredCollaborators.forEach((c) => {
      const type = c.type as CollaboratorType;
      for (const [category, config] of Object.entries(ORG_CATEGORIES)) {
        if (config.types.includes(type)) {
          groups[category as OrgCategory].push(c);
          break;
        }
      }
    });

    // Sort each group by name
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    return groups;
  }, [filteredCollaborators]);

  // Stats
  const stats = useMemo(() => {
    const active = collaborators.filter(c => !c.leaving_date);
    return {
      total: active.length,
      direction: active.filter(c => c.type === 'DIRIGEANT').length,
      administratif: active.filter(c => c.type === 'ADMINISTRATIF').length,
      terrain: active.filter(c => ['TECHNICIEN', 'COMMERCIAL', 'AUTRE'].includes(c.type)).length,
    };
  }, [collaborators]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats compacts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        {ORG_ORDER.map((category) => {
          const config = ORG_CATEGORIES[category];
          const Icon = config.icon;
          return (
            <div key={category} className="bg-card border rounded-lg p-3 flex items-center gap-3">
              <div className={`p-2 ${config.bgColor} rounded-lg`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{stats[category]}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous les types</SelectItem>
            {COLLABORATOR_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
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
          <Label htmlFor="show-inactive" className="text-xs">
            Partis
          </Label>
        </div>

        {canManage && (
          <Button onClick={onCreateClick} size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        )}
      </div>

      {/* Results count */}
      <Badge variant="outline" className="text-xs">
        {filteredCollaborators.length} collaborateur{filteredCollaborators.length > 1 ? 's' : ''}
      </Badge>

      {/* Grouped list by organigramme */}
      {filteredCollaborators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun collaborateur trouvé</p>
          {canManage && (
            <Button variant="outline" className="mt-4" onClick={onCreateClick}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un collaborateur
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {ORG_ORDER.map((category) => {
            const config = ORG_CATEGORIES[category];
            const Icon = config.icon;
            const group = groupedCollaborators[category];
            
            if (group.length === 0) return null;

            return (
              <div key={category}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 ${config.bgColor} rounded-lg`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{config.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {group.length}
                  </Badge>
                </div>

                {/* Grid of cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.map((collaborator) => (
                    <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
