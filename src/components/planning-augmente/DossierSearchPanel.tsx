/**
 * DossierSearchPanel - Recherche et sélection d'un dossier à planifier
 * Affiche les dossiers "à planifier" + barre de recherche libre
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const STATE_LABELS: Record<string, string> = {
  a_planifier: 'À planifier',
  a_planifier_travaux: 'À planifier TVX',
  devis_accepte: 'Devis accepté',
  devis_valide: 'Devis validé',
  planifie_rt: 'Planifié RT',
  rt_fait: 'RT fait',
  devis_a_faire: 'Devis à faire',
};

function getStateLabel(state: string): string {
  const normalized = (state || '').toLowerCase().replace(/[éè]/g, 'e').replace(/\s+/g, '_');
  return STATE_LABELS[normalized] || state || 'Inconnu';
}

function getStateBadgeVariant(state: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = (state || '').toLowerCase();
  if (normalized.includes('planifier')) return 'destructive';
  if (normalized.includes('devis')) return 'secondary';
  return 'outline';
}

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
          {project.ref} — {project.label || 'Sans libellé'}
        </span>
        <Badge variant={getStateBadgeVariant(project.state)} className="ml-2 text-[10px] shrink-0">
          {getStateLabel(project.state)}
        </Badge>
      </div>
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
        {project.date && (
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {new Date(project.date).toLocaleDateString('fr-FR')}
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

export function DossierSearchPanel({
  planifiableProjects,
  allProjects,
  isLoading,
  selectedDossier,
  onSelectDossier,
}: DossierSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('planifier');

  const filteredPlanifiable = useMemo(
    () => searchProjects(planifiableProjects, searchQuery),
    [planifiableProjects, searchQuery]
  );

  const filteredAll = useMemo(
    () => searchProjects(allProjects, searchQuery).slice(0, 50),
    [allProjects, searchQuery]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Dossiers
          {!isLoading && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {planifiableProjects.length} à planifier
            </Badge>
          )}
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par réf, client, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="planifier" className="flex-1 text-xs">
              À planifier ({filteredPlanifiable.length})
            </TabsTrigger>
            <TabsTrigger value="tous" className="flex-1 text-xs">
              Tous ({filteredAll.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planifier" className="flex-1 mt-2 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Chargement Apogée...</span>
              </div>
            ) : filteredPlanifiable.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? 'Aucun dossier trouvé' : 'Aucun dossier à planifier'}
              </p>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-3">
                  {filteredPlanifiable.map(p => (
                    <DossierRow
                      key={p.id}
                      project={p}
                      isSelected={selectedDossier?.id === p.id}
                      onSelect={() => onSelectDossier(p)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="tous" className="flex-1 mt-2 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAll.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat</p>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-3">
                  {filteredAll.map(p => (
                    <DossierRow
                      key={p.id}
                      project={p}
                      isSelected={selectedDossier?.id === p.id}
                      onSelect={() => onSelectDossier(p)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
