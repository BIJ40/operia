import { GlobalRole, getAllRolesSorted } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS } from '@/types/modules';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface UserFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  agencyFilter: string;
  setAgencyFilter: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  moduleFilter: string;
  setModuleFilter: (value: string) => void;
  showDeactivated: boolean;
  setShowDeactivated: (value: boolean) => void;
  agencies: Agency[];
  canCreateUsers: boolean;
  onCreateUser: () => void;
  onCreateRequest?: () => void;
  showRequestButton?: boolean;
  totalUsers: number;
  filteredCount: number;
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

export function UserFilters({
  searchQuery,
  setSearchQuery,
  agencyFilter,
  setAgencyFilter,
  roleFilter,
  setRoleFilter,
  moduleFilter,
  setModuleFilter,
  showDeactivated,
  setShowDeactivated,
  agencies,
  canCreateUsers,
  onCreateUser,
  onCreateRequest,
  showRequestButton,
  currentPage,
  setCurrentPage,
  totalPages,
}: UserFiltersProps) {
  const showActions = Boolean(showRequestButton && onCreateRequest) || canCreateUsers;

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          {showRequestButton && onCreateRequest && (
            <Button variant="outline" onClick={onCreateRequest}>
              <UserPlus className="w-4 h-4 mr-2" />
              Demander création
            </Button>
          )}
          {canCreateUsers && (
            <Button onClick={onCreateUser}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger><SelectValue placeholder="Toutes agences" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Toutes agences</SelectItem>
            <SelectItem value="none">Sans agence</SelectItem>
            {agencies.map(a => <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger><SelectValue placeholder="Tous rôles" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous rôles</SelectItem>
            {getAllRolesSorted().map(role => (
              <SelectItem key={role} value={role}>{VISIBLE_ROLE_LABELS[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger><SelectValue placeholder="Tous modules" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous modules</SelectItem>
            {MODULE_DEFINITIONS.map(m => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="showDeactivated" checked={showDeactivated} onCheckedChange={setShowDeactivated} />
          <Label htmlFor="showDeactivated" className="text-sm cursor-pointer">Inclure désactivés</Label>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
