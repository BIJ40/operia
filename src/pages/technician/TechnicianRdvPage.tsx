/**
 * Technician RDV Page
 * Displays appointment details and launches the flow wizard
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Play, MapPin, Clock, User, AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlowRunner } from '@/components/flow-runtime';
import { supabase } from '@/integrations/supabase/client';
import { getCachedPlanning, getCachedFlow, type TechnicianAppointment } from '@/lib/offline/db';
import type { FlowSchemaJson, QuestionBlock } from '@/lib/flow/flowTypes';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

type ViewMode = 'details' | 'flow';

export default function TechnicianRdvPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();

  // State
  const [rdv, setRdv] = useState<TechnicianAppointment | null>(null);
  const [flowSchema, setFlowSchema] = useState<FlowSchemaJson | null>(null);
  const [blocks, setBlocks] = useState<Map<string, QuestionBlock>>(new Map());
  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowVersion, setFlowVersion] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('details');

  // Load RDV and flow data
  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError('ID de RDV manquant');
        setIsLoading(false);
        return;
      }

      try {
        // Try to load RDV from cache first
        const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
        const cached = await getCachedPlanning(todayKey);
        let appointment = cached?.data.find((r) => r.id === id);

        // If not in today's cache, try other dates or fetch from server
        if (!appointment && isOnline) {
          // Fetch from server (simplified - would need actual API call)
          // For now, use mock data
          appointment = {
            id,
            project_id: parseInt(id) || 12345,
            date: new Date().toISOString().slice(0, 10),
            time_start: '09:00',
            time_end: '11:00',
            type: 'rt',
            status: 'planned',
            client_name: 'Client Test',
            address: '123 Rue de Test',
            city: 'Paris',
            postal_code: '75001',
            description: 'Relevé technique vitrage',
          };
        }

        if (!appointment) {
          setError('RDV non trouvé');
          setIsLoading(false);
          return;
        }

        setRdv(appointment);

        // Load flow schema
        await loadFlowForRdv(appointment);
      } catch (err) {
        console.error('Error loading RDV:', err);
        setError('Erreur lors du chargement du RDV');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, isOnline]);

  // Load appropriate flow based on RDV type
  async function loadFlowForRdv(rdv: TechnicianAppointment) {
    try {
      // Map RDV type to flow domain
      const domainMap: Record<string, string> = {
        rt: 'rt',
        depannage: 'bon_intervention',
        travaux: 'bon_intervention',
      };
      const domain = domainMap[rdv.type] || 'other';

      // Try cache first
      const cachedFlow = await getCachedFlow('default', 1);
      if (cachedFlow) {
        // Parse cached flow (would need proper conversion)
      }

      // Fetch from server if online
      if (isOnline) {
        // Get published flow for this domain
        const { data: schemas, error: schemaError } = await supabase
          .from('flow_schemas')
          .select('id, name')
          .eq('domain', domain)
          .limit(1);

        if (schemaError) throw schemaError;

        if (schemas && schemas.length > 0) {
          const schemaId = schemas[0].id;
          setFlowId(schemaId);

          // Get published version
          const { data: versions, error: versionError } = await supabase
            .from('flow_schema_versions')
            .select('version, json')
            .eq('schema_id', schemaId)
            .eq('is_published', true)
            .order('version', { ascending: false })
            .limit(1);

          if (versionError) throw versionError;

          if (versions && versions.length > 0) {
            const version = versions[0];
            setFlowVersion(version.version);
            setFlowSchema(version.json as unknown as FlowSchemaJson);

            // Load blocks referenced in the flow
            await loadBlocks(version.json as unknown as FlowSchemaJson);
          }
        }
      }
    } catch (err) {
      console.error('Error loading flow:', err);
      // Don't set error - flow is optional
    }
  }

  // Load question blocks
  async function loadBlocks(schema: FlowSchemaJson) {
    try {
      const blockIds = schema.nodes
        .filter((n) => n.blockId)
        .map((n) => n.blockId as string);

      if (blockIds.length === 0) return;

      const { data, error } = await supabase
        .from('flow_blocks')
        .select('*')
        .in('id', blockIds);

      if (error) throw error;

      const blocksMap = new Map<string, QuestionBlock>();
      data?.forEach((block) => {
        blocksMap.set(block.id, block as unknown as QuestionBlock);
      });
      setBlocks(blocksMap);
    } catch (err) {
      console.error('Error loading blocks:', err);
    }
  }

  // Handle flow completion
  const handleFlowComplete = () => {
    setViewMode('details');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/t')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au planning
        </Button>
      </div>
    );
  }

  // Flow view
  if (viewMode === 'flow' && flowSchema && flowId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setViewMode('details')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{rdv?.client_name}</h1>
              <p className="text-xs text-muted-foreground">{rdv?.type?.toUpperCase()}</p>
            </div>
          </div>
        </header>
        
        <FlowRunner
          flowSchema={flowSchema}
          blocks={blocks}
          rdvId={id!}
          flowId={flowId}
          flowVersion={flowVersion}
          onComplete={handleFlowComplete}
        />
      </div>
    );
  }

  // Details view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/80"
            onClick={() => navigate('/t')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{rdv?.client_name || 'RDV'}</h1>
            <p className="text-xs opacity-80">Dossier #{rdv?.project_id}</p>
          </div>
          {!isOnline && (
            <WifiOff className="h-5 w-5 text-amber-300" />
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* RDV Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Détails du RDV</CardTitle>
              <Badge variant={rdv?.type === 'rt' ? 'secondary' : 'default'}>
                {rdv?.type?.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Time */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {rdv?.time_start} - {rdv?.time_end || '?'}
              </span>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p>{rdv?.address}</p>
                <p className="text-sm text-muted-foreground">
                  {rdv?.postal_code} {rdv?.city}
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{rdv?.client_name}</span>
            </div>

            {/* Description */}
            {rdv?.description && (
              <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
                {rdv.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-2">
          {flowSchema ? (
            <Button className="w-full" size="lg" onClick={() => setViewMode('flow')}>
              <Play className="h-5 w-5 mr-2" />
              Démarrer le formulaire
            </Button>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun formulaire disponible pour ce type d'intervention
              </AlertDescription>
            </Alert>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <a href={`tel:${rdv?.client_name}`}>
                Appeler le client
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${rdv?.address} ${rdv?.postal_code} ${rdv?.city}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Itinéraire
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
