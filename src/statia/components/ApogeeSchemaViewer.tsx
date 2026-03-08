/**
 * STATiA-BY-BIJ - Viewer de schéma Apogée enrichi
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, Database, Link2, Key, Hash, Calendar, DollarSign, 
  Tag, ToggleLeft, FileText, ChevronDown, ChevronRight, Zap, Filter,
  Network, BookOpen, ArrowRight, Download, Building2, Globe, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadSchemaDoc } from '../schema/generateSchemaDoc';
import { 
  BUSINESS_CONCEPTS, 
  searchSchema, 
  getSchemaRelations,
  getAllEndpoints,
  APOGEE_AGENCY_ROUTING,
  buildAgencyBaseUrl
} from '../schema/apogeeSchemaV2';
import { ApogeeEndpointDefinition, ApogeeFieldDefinition, FieldRole, SemanticRole, SchemaSearchResult } from '../schema/types';

// ============================================
// ICÔNES PAR RÔLE DE CHAMP
// ============================================

const ROLE_ICONS: Record<FieldRole, typeof Key> = {
  id: Key,
  foreignId: Link2,
  amount: DollarSign,
  date: Calendar,
  datetime: Calendar,
  label: FileText,
  flag: ToggleLeft,
  state: Tag,
  category: Tag,
  reference: Hash,
  computed: Zap,
  metadata: Database,
};

const ROLE_COLORS: Record<FieldRole, string> = {
  id: 'bg-purple-100 text-purple-700 border-purple-300',
  foreignId: 'bg-blue-100 text-blue-700 border-blue-300',
  amount: 'bg-green-100 text-green-700 border-green-300',
  date: 'bg-orange-100 text-orange-700 border-orange-300',
  datetime: 'bg-orange-100 text-orange-700 border-orange-300',
  label: 'bg-gray-100 text-gray-700 border-gray-300',
  flag: 'bg-pink-100 text-pink-700 border-pink-300',
  state: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  category: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  reference: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  computed: 'bg-amber-100 text-amber-700 border-amber-300',
  metadata: 'bg-slate-100 text-slate-700 border-slate-300',
};

const SEMANTIC_BADGES: Record<SemanticRole, { label: string; className: string; icon: typeof Layers }> = {
  dimension: { label: 'DIM', className: 'bg-violet-100 text-violet-700', icon: Layers },
  measure: { label: 'MES', className: 'bg-emerald-100 text-emerald-700', icon: Zap },
  attribute: { label: 'ATT', className: 'bg-slate-100 text-slate-600', icon: FileText },
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function ApogeeSchemaViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'relations' | 'concepts'>('cards');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  const endpoints = getAllEndpoints();
  const searchResults = useMemo(() => 
    searchQuery.length >= 2 ? searchSchema(searchQuery) : [],
    [searchQuery]
  );

  const toggleEndpoint = (name: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et mode */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un champ, endpoint ou concept (technicien, totalHT, apporteur...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'relations' | 'concepts')} className="w-auto">
              <TabsList>
                <TabsTrigger value="cards" className="gap-2">
                  <Database className="h-4 w-4" />
                  Endpoints
                </TabsTrigger>
                <TabsTrigger value="relations" className="gap-2">
                  <Network className="h-4 w-4" />
                  Relations
                </TabsTrigger>
                <TabsTrigger value="concepts" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Concepts
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={downloadSchemaDoc} className="gap-2">
              <Download className="h-4 w-4" />
              Export .md
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <Card className="border-helpconfort-blue/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Résultats de recherche ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {searchResults.slice(0, 20).map((result, idx) => (
                  <SearchResultItem key={idx} result={result} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Card Agency Routing - Toujours visible */}
      <AgencyRoutingCard />

      {/* Contenu selon le mode */}
      {viewMode === 'cards' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.name}
              endpoint={endpoint}
              isExpanded={expandedEndpoints.has(endpoint.name)}
              onToggle={() => toggleEndpoint(endpoint.name)}
            />
          ))}
        </div>
      )}

      {viewMode === 'relations' && <RelationsView />}
      {viewMode === 'concepts' && <ConceptsView />}
    </div>
  );
}

// ============================================
// CARTE ENDPOINT
// ============================================

function EndpointCard({ 
  endpoint, 
  isExpanded, 
  onToggle 
}: { 
  endpoint: ApogeeEndpointDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const aggregableCount = endpoint.fields.filter(f => f.aggregable).length;
  const filterableCount = endpoint.fields.filter(f => f.filterable).length;

  return (
    <Card className="border-l-4 border-l-helpconfort-blue">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{endpoint.label}</CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {endpoint.id}
                </Badge>
              </div>
              <CardDescription className="mt-1">{endpoint.description}</CardDescription>
            </div>
            <CollapsibleTrigger className="p-1 hover:bg-muted rounded">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
          </div>
          
          {/* Stats rapides */}
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {endpoint.fields.length} champs
            </Badge>
            {aggregableCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                <Zap className="h-3 w-3 mr-1" />
                {aggregableCount} agrég.
              </Badge>
            )}
            {filterableCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                <Filter className="h-3 w-3 mr-1" />
                {filterableCount} filtres
              </Badge>
            )}
            {endpoint.joins.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Link2 className="h-3 w-3 mr-1" />
                {endpoint.joins.length} joins
              </Badge>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Liste des champs */}
            <div>
              <p className="text-sm font-medium mb-2">Champs</p>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {endpoint.fields.map((field) => (
                    <FieldItem key={field.name} field={field} />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Jointures */}
            {endpoint.joins.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Jointures</p>
                <div className="space-y-1">
                  {endpoint.joins.map((join, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                      <Link2 className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{join.localField}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{join.target}</Badge>
                      <span className="text-xs text-muted-foreground">({join.cardinality})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filtres disponibles */}
            {endpoint.filters.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Filtres disponibles</p>
                <div className="flex flex-wrap gap-1">
                  {endpoint.filters.map((filter) => (
                    <Badge key={filter.name} variant="outline" className="text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      {filter.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// ITEM CHAMP - Enrichi avec semantic role
// ============================================

function FieldItem({ field }: { field: ApogeeFieldDefinition }) {
  const Icon = ROLE_ICONS[field.role] || FileText;
  const colorClass = ROLE_COLORS[field.role] || ROLE_COLORS.label;
  const semanticInfo = field.semanticRole ? SEMANTIC_BADGES[field.semanticRole] : null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded text-sm">
        <div className={`p-1 rounded ${colorClass}`}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="font-mono font-medium">{field.name}</span>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
        {/* Semantic role badge */}
        {semanticInfo && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`text-[10px] px-1 ${semanticInfo.className}`}>
                {semanticInfo.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {field.semanticRole === 'dimension' && 'Dimension : utilisable pour groupBy'}
                {field.semanticRole === 'measure' && 'Mesure : utilisable pour sum/avg/min/max'}
                {field.semanticRole === 'attribute' && 'Attribut : information complémentaire'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        {field.aggregable && (
          <Tooltip>
            <TooltipTrigger>
              <Zap className="h-3 w-3 text-amber-500" />
            </TooltipTrigger>
            <TooltipContent>Agrégable (sum, avg...)</TooltipContent>
          </Tooltip>
        )}
        {field.path && (
          <span className="text-xs text-muted-foreground">({field.path})</span>
        )}
        {/* Keywords tooltip */}
        {field.keywords && field.keywords.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Tag className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Mots-clés: {field.keywords.join(', ')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]" title={field.description}>
          {field.description}
        </span>
      </div>
    </TooltipProvider>
  );
}

// ============================================
// CARD AGENCY ROUTING
// ============================================

function AgencyRoutingCard() {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base">Gestion Multi-Agences</CardTitle>
          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">Important</Badge>
        </div>
        <CardDescription>{APOGEE_AGENCY_ROUTING.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Template URL</span>
            </div>
            <code className="text-xs bg-background px-2 py-1 rounded block">
              {APOGEE_AGENCY_ROUTING.baseUrlTemplate}
            </code>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Clé API</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {APOGEE_AGENCY_ROUTING.apiKeyShared ? 'Unique et partagée' : 'Par agence'}
            </span>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Exemple</span>
            </div>
            <code className="text-xs bg-background px-2 py-1 rounded block">
              {buildAgencyBaseUrl('dax')}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// RÉSULTAT DE RECHERCHE
// ============================================

function SearchResultItem({ result }: { result: SchemaSearchResult }) {
  const Icon = result.type === 'endpoint' ? Database : result.type === 'field' ? FileText : Link2;

  return (
    <div className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{result.endpointLabel}</Badge>
          {result.fieldName && (
            <span className="font-mono text-sm font-medium">{result.fieldName}</span>
          )}
          {result.joinTarget && (
            <>
              <ArrowRight className="h-3 w-3" />
              <Badge variant="secondary">{result.joinTarget}</Badge>
            </>
          )}
        </div>
        {result.fieldDescription && (
          <p className="text-xs text-muted-foreground truncate">{result.fieldDescription}</p>
        )}
      </div>
      <Badge variant="secondary" className="text-xs">{result.type}</Badge>
    </div>
  );
}

// ============================================
// VUE RELATIONS (GRAPHE SIMPLIFIÉ)
// ============================================

function RelationsView() {
  const relations = getSchemaRelations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relations entre endpoints</CardTitle>
        <CardDescription>Vue d'ensemble des jointures possibles entre les sources de données</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Liste des relations */}
          <div>
            <p className="text-sm font-medium mb-3">Toutes les relations ({relations.length})</p>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {relations.map((rel, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                    <Badge variant="outline">{rel.source}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{rel.target}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto font-mono">{rel.label}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Schéma visuel simplifié */}
          <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10">
            <p className="text-sm font-medium mb-3">Schéma relationnel</p>
            <div className="relative">
              {/* Représentation simplifiée en texte */}
              <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
{`          ┌─────────────┐
          │   CLIENTS   │
          └─────┬───────┘
                │ clientId / commanditaireId
                ▼
          ┌─────────────┐
          │  PROJECTS   │◄────────┐
          └─────┬───────┘         │
                │ projectId       │ projectId
       ┌────────┼────────┐        │
       ▼        ▼        ▼        │
┌──────────┐ ┌─────────┐ ┌────────┴─┐
│INTERVENTIONS│ │ DEVIS │ │ FACTURES │
└──────┬───┘ └─────────┘ └──────────┘
       │ userId
       ▼
   ┌───────┐
   │ USERS │
   └───────┘`}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// VUE CONCEPTS MÉTIER
// ============================================

function ConceptsView() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Où trouver quoi ?</CardTitle>
          <CardDescription>
            Guide rapide pour localiser les données métier dans le schéma Apogée
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUSINESS_CONCEPTS.map((concept) => (
          <Card key={concept.id} className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                {concept.label}
              </CardTitle>
              <CardDescription>{concept.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {concept.locations.map((loc, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{loc.endpoint}</Badge>
                      <span className="font-mono text-xs">{loc.field}</span>
                      {loc.path && (
                        <span className="text-xs text-muted-foreground">({loc.path})</span>
                      )}
                    </div>
                    {loc.note && (
                      <p className="text-xs text-muted-foreground mt-1">{loc.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
