/**
 * Liste des collaborateurs avec filtres
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
import { Search, UserPlus, Users, Wrench, Headphones, Briefcase } from 'lucide-react';
import { Collaborator, COLLABORATOR_TYPES, CollaboratorType } from '@/types/collaborator';
import { CollaboratorCard } from './CollaboratorCard';

interface CollaboratorListProps {
  collaborators: Collaborator[];
  isLoading: boolean;
  canManage: boolean;
  onCreateClick: () => void;
}

export function CollaboratorList({
  collaborators,
  isLoading,
  canManage,
  onCreateClick,
}: CollaboratorListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.first_name?.toLowerCase().includes(searchLower) ||
        c.last_name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.role?.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType = typeFilter === 'all' || c.type === typeFilter;

      // Active filter
      const isActive = !c.leaving_date;
      const matchesActive = showInactive || isActive;

      return matchesSearch && matchesType && matchesActive;
    });
  }, [collaborators, searchQuery, typeFilter, showInactive]);

  // Stats by type
  const stats = useMemo(() => {
    const active = collaborators.filter(c => !c.leaving_date);
    return {
      total: active.length,
      techniciens: active.filter(c => c.type === 'TECHNICIEN').length,
      assistantes: active.filter(c => c.type === 'ASSISTANTE').length,
      autres: active.filter(c => !['TECHNICIEN', 'ASSISTANTE'].includes(c.type)).length,
    };
  }, [collaborators]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Collaborateurs</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.techniciens}</p>
            <p className="text-sm text-muted-foreground">Techniciens</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Headphones className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.assistantes}</p>
            <p className="text-sm text-muted-foreground">Assistantes</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Briefcase className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.autres}</p>
            <p className="text-sm text-muted-foreground">Autres</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un collaborateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les types" />
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
          <Label htmlFor="show-inactive" className="text-sm">
            Afficher les partis
          </Label>
        </div>

        {canManage && (
          <Button onClick={onCreateClick}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nouveau collaborateur
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {filteredCollaborators.length} résultat{filteredCollaborators.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* List */}
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
        <div className="grid gap-4">
          {filteredCollaborators.map((collaborator) => (
            <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
          ))}
        </div>
      )}
    </div>
  );
}
