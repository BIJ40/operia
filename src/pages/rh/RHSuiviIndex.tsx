/**
 * Page principale du module Suivi RH
 * Accessible N2+ uniquement
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Columns3, 
  User,
  Shield,
  Award,
  Car,
  ChevronRight,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import { useRHCollaborators, useRHTablePrefs, useUpdateRHTablePrefs } from '@/hooks/useRHSuivi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = [
  'nom', 'prenom', 'type', 'statut', 'date_entree', 'email', 'statut_epi'
];

// All available columns
const ALL_COLUMNS = [
  { id: 'nom', label: 'Nom', category: 'essentiel' },
  { id: 'prenom', label: 'Prénom', category: 'essentiel' },
  { id: 'type', label: 'Métier/Fonction', category: 'essentiel' },
  { id: 'statut', label: 'Statut', category: 'essentiel' },
  { id: 'date_entree', label: 'Date entrée', category: 'essentiel' },
  { id: 'date_sortie', label: 'Date sortie', category: 'essentiel' },
  { id: 'email', label: 'Email pro', category: 'rh' },
  { id: 'phone', label: 'Téléphone', category: 'rh' },
  { id: 'statut_epi', label: 'Statut EPI', category: 'securite' },
  { id: 'date_renouvellement', label: 'Renouvellement EPI', category: 'securite' },
  { id: 'habilitation_elec', label: 'Hab. électrique', category: 'competences' },
  { id: 'vehicule', label: 'Véhicule', category: 'parc' },
  { id: 'carte_carburant', label: 'Carte carburant', category: 'parc' },
];

function getCollaboratorStatus(c: RHCollaborator): 'active' | 'inactive' | 'exited' {
  if (c.leaving_date) {
    const leaveDate = new Date(c.leaving_date);
    if (leaveDate <= new Date()) return 'exited';
  }
  return 'active';
}

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'exited' }) {
  const variants = {
    active: { label: 'Actif', variant: 'default' as const, icon: UserCheck },
    inactive: { label: 'Inactif', variant: 'secondary' as const, icon: Clock },
    exited: { label: 'Sorti', variant: 'outline' as const, icon: UserX },
  };
  const { label, variant, icon: Icon } = variants[status];
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function EpiStatusBadge({ status }: { status: 'OK' | 'TO_RENEW' | 'MISSING' | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>;
  
  const variants = {
    OK: { label: 'OK', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    TO_RENEW: { label: 'À renouveler', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    MISSING: { label: 'Manquant', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const { label, className } = variants[status];
  
  return <Badge className={className}>{label}</Badge>;
}

export default function RHSuiviIndex() {
  const navigate = useNavigate();
  const { data: collaborators, isLoading } = useRHCollaborators();
  const { data: tablePrefs } = useRHTablePrefs();
  const updatePrefs = useUpdateRHTablePrefs();
  
  const [search, setSearch] = useState('');
  
  // Determine visible columns
  const visibleColumns = useMemo(() => {
    if (tablePrefs?.hidden_columns?.length) {
      return ALL_COLUMNS.filter(col => !tablePrefs.hidden_columns.includes(col.id));
    }
    return ALL_COLUMNS.filter(col => DEFAULT_VISIBLE_COLUMNS.includes(col.id));
  }, [tablePrefs]);
  
  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    if (!collaborators) return [];
    if (!search.trim()) return collaborators;
    
    const searchLower = search.toLowerCase();
    return collaborators.filter(c => 
      c.first_name?.toLowerCase().includes(searchLower) ||
      c.last_name?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.type?.toLowerCase().includes(searchLower)
    );
  }, [collaborators, search]);
  
  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const currentHidden = tablePrefs?.hidden_columns || 
      ALL_COLUMNS.filter(c => !DEFAULT_VISIBLE_COLUMNS.includes(c.id)).map(c => c.id);
    
    const newHidden = currentHidden.includes(columnId)
      ? currentHidden.filter(id => id !== columnId)
      : [...currentHidden, columnId];
    
    updatePrefs.mutate({ hidden_columns: newHidden });
  };
  
  // Get cell value
  const getCellValue = (collaborator: RHCollaborator, columnId: string) => {
    switch (columnId) {
      case 'nom':
        return collaborator.last_name || '-';
      case 'prenom':
        return collaborator.first_name || '-';
      case 'type':
        return collaborator.type || '-';
      case 'statut':
        return <StatusBadge status={getCollaboratorStatus(collaborator)} />;
      case 'date_entree':
        return collaborator.hiring_date 
          ? format(new Date(collaborator.hiring_date), 'dd/MM/yyyy', { locale: fr })
          : '-';
      case 'date_sortie':
        return collaborator.leaving_date 
          ? format(new Date(collaborator.leaving_date), 'dd/MM/yyyy', { locale: fr })
          : '-';
      case 'email':
        return collaborator.email || '-';
      case 'phone':
        return collaborator.phone || '-';
      case 'statut_epi':
        return <EpiStatusBadge status={collaborator.epi_profile?.statut_epi || null} />;
      case 'date_renouvellement':
        return collaborator.epi_profile?.date_renouvellement 
          ? format(new Date(collaborator.epi_profile.date_renouvellement), 'dd/MM/yyyy', { locale: fr })
          : '-';
      case 'habilitation_elec':
        return collaborator.competencies?.habilitation_electrique_statut || '-';
      case 'vehicule':
        return collaborator.assets?.vehicule_attribue || '-';
      case 'carte_carburant':
        return collaborator.assets?.carte_carburant ? '✓' : '-';
      default:
        return '-';
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!collaborators) return { total: 0, active: 0, epiToRenew: 0 };
    return {
      total: collaborators.length,
      active: collaborators.filter(c => getCollaboratorStatus(c) === 'active').length,
      epiToRenew: collaborators.filter(c => c.epi_profile?.statut_epi === 'TO_RENEW').length,
    };
  }, [collaborators]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Suivi RH"
        subtitle="Gestion des collaborateurs et équipements"
        backTo="/hc-agency"
        backLabel="Mon Agence"
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Collaborateurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Shield className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.epiToRenew}</p>
              <p className="text-sm text-muted-foreground">EPI à renouveler</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Columns */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un collaborateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Colonnes
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Colonnes visibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.some(c => c.id === col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map(col => (
                    <TableHead key={col.id}>{col.label}</TableHead>
                  ))}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollaborators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                      {search ? 'Aucun collaborateur trouvé' : 'Aucun collaborateur'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCollaborators.map(collaborator => (
                    <TableRow 
                      key={collaborator.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/rh/suivi/${collaborator.id}`)}
                    >
                      {visibleColumns.map(col => (
                        <TableCell key={col.id}>
                          {getCellValue(collaborator, col.id)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
