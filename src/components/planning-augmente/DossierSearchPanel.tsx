/**
 * DossierSearchPanel - Dossiers à planifier avec onglets 1er RDV / TRAVAUX
 * Affiche uniquement les dossiers à planifier, séparés par type de planification
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FolderOpen, Clock, Loader2, MapPin, User } from 'lucide-react';
import { type PlanningProject, searchProjects } from '@/hooks/usePlanningData';

interface DossierSearchPanelProps {
  planifiableProjects: PlanningProject[];
  allProjects: PlanningProject[];
  isLoading: boolean;
  selectedDossier: PlanningProject | null;
  onSelectDossier: (dossier: PlanningProject) => void;
}

// ============================================================================
// Classification des dossiers à planifier
// ============================================================================

/** 
 * "1er RDV" = dossiers nécessitant un premier passage (RT, diagnostic, dépannage)
 * States: a_planifier, planifie_rt (en attente), rt_fait → devis_a_faire
 */
const PREMIER_RDV_STATES = [
  'new',
];

/** 
 * "TRAVAUX" = dossiers dont le devis est accepté, à planifier en travaux
 * States: a_planifier_travaux, devis_accepte, devis_valide
 */
const TRAVAUX_STATES = [
  'to_planify_tvx',
];

function normalizeState(state: string): string {
  return (state || '').toLowerCase().replace(/[éè]/g, 'e').replace(/\s+/g, '_');
}

function matchesStates(state: string, targetStates: string[]): boolean {
  const norm = normalizeState(state);
  return targetStates.some(s => norm.includes(s));
}

// ============================================================================
// Sub-components
// ============================================================================

function DossierRow({ project, isSelected, onSelect }: { 
  project: PlanningProject; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
          : 'border-border hover:border-primary/30 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {project.ref}
        </span>
        <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
          {normalizeState(project.state).replace(/_/g, ' ')}
        </Badge>
      </div>
      {project.label && (
        <p className="text-xs text-foreground/80 truncate mb-1">{project.label}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {project.clientName && (
          <span className="flex items-center gap-1 truncate">
            <User className="w-3 h-3 shrink-0" />
            {project.clientName}
          </span>
        )}
        {project.ville && (
          <span className="flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3" />
            {project.ville}
          </span>
        )}
      </div>
      {project.data?.universes?.length ? (
        <div className="flex gap-1 mt-1.5">
          {project.data.universes.slice(0, 3).map((u, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              {u}
            </Badge>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function DossierList({
  projects,
  isLoading,
  searchQuery,
  selectedDossier,
  onSelectDossier,
  emptyLabel,
}: {
  projects: PlanningProject[];
  isLoading: boolean;
  searchQuery: string;
  selectedDossier: PlanningProject | null;
  onSelectDossier: (p: PlanningProject) => void;
  emptyLabel: string;
}) {
  const filtered = useMemo(
    () => searchProjects(projects, searchQuery),
    [projects, searchQuery]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {searchQuery ? 'Aucun résultat' : emptyLabel}
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-3">
        {filtered.map(p => (
          <DossierRow
            key={p.id}
            project={p}
            isSelected={selectedDossier?.id === p.id}
            onSelect={() => onSelectDossier(p)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// Main
// ============================================================================

export function DossierSearchPanel({
  planifiableProjects,
  isLoading,
  selectedDossier,
  onSelectDossier,
}: DossierSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('premier-rdv');

  // Séparer les dossiers en 2 catégories
  const premierRdvProjects = useMemo(
    () => planifiableProjects.filter(p => matchesStates(p.state, PREMIER_RDV_STATES)),
    [planifiableProjects]
  );

  const travauxProjects = useMemo(
    () => planifiableProjects.filter(p => matchesStates(p.state, TRAVAUX_STATES)),
    [planifiableProjects]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          À planifier
          {!isLoading && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {planifiableProjects.length}
            </Badge>
          )}
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Réf, client, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="premier-rdv" className="flex-1 text-xs">
              1er RDV ({premierRdvProjects.length})
            </TabsTrigger>
            <TabsTrigger value="travaux" className="flex-1 text-xs">
              Travaux ({travauxProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="premier-rdv" className="flex-1 mt-2 overflow-hidden">
            <DossierList
              projects={premierRdvProjects}
              isLoading={isLoading}
              searchQuery={searchQuery}
              selectedDossier={selectedDossier}
              onSelectDossier={onSelectDossier}
              emptyLabel="Aucun dossier 1er RDV à planifier"
            />
          </TabsContent>

          <TabsContent value="travaux" className="flex-1 mt-2 overflow-hidden">
            <DossierList
              projects={travauxProjects}
              isLoading={isLoading}
              searchQuery={searchQuery}
              selectedDossier={selectedDossier}
              onSelectDossier={onSelectDossier}
              emptyLabel="Aucun dossier travaux à planifier"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
