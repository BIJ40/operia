/**
 * AgencyFeaturesAdminView — Vue d'administration réelle des features agence
 * Permet aux N4+ de gérer les packs et features par agence.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencySubscription } from '@/hooks/access-rights/useAgencySubscription';
import {
  useAgencyFeaturesForAgency,
  useActivateRelationsPack,
  useDeactivateRelationsPack,
  useUpsertAgencyFeature,
  useUpdateFeatureMetadata,
} from '@/hooks/access-rights/useAgencyFeaturesAdmin';
import { AGENCY_FEATURES, RELATIONS_PACK_FEATURES, type AgencyFeatureStatus, type AgencyFeatureBillingMode } from '@/config/agencyFeatures';
import { getPlanLabel } from '@/config/planTiers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Crown, Rocket, Check, X, Power, PowerOff,
  Loader2, Search, Sparkles, Package, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// ─── Agency selector ───────────────────────────────────────────
function useAdminAgencies() {
  return useQuery({
    queryKey: ['admin-agencies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug')
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── Extension packs ───────────────────────────────────────────
const EXTENSION_PACKS = [
  { key: null, label: 'Aucune', extra: 0 },
  { key: 'plus_1', label: '+1 espace', extra: 1 },
  { key: 'pack_5', label: 'Pack 5 espaces', extra: 5 },
  { key: 'pack_10', label: 'Pack 10 espaces', extra: 10 },
] as const;

// ─── Main Component ────────────────────────────────────────────
export default function AgencyFeaturesAdminView() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { data: agencies, isLoading: loadingAgencies } = useAdminAgencies();

  const filtered = (agencies || []).filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Gestion des features agence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Activez et gérez les packs et options pour chaque agence
        </p>
      </div>

      {/* Agency selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une agence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedAgencyId || ''}
              onValueChange={(v) => setSelectedAgencyId(v || null)}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {loadingAgencies ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  filtered.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedAgencyId ? (
        <EmptyState />
      ) : (
        <AgencyDetail agencyId={selectedAgencyId} agencies={agencies || []} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Building2 className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground font-medium">
          Sélectionnez une agence pour gérer son abonnement et ses options
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Agency Detail ─────────────────────────────────────────────
function AgencyDetail({
  agencyId,
  agencies,
}: {
  agencyId: string;
  agencies: { id: string; label: string; slug: string }[];
}) {
  const agency = agencies.find(a => a.id === agencyId);
  const { data: subscription, isLoading: loadingSub } = useAgencySubscription(agencyId);
  const { data: features, isLoading: loadingFeatures } = useAgencyFeaturesForAgency(agencyId);

  const activatePack = useActivateRelationsPack();
  const deactivatePack = useDeactivateRelationsPack();

  const isLoading = loadingSub || loadingFeatures;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierKey = subscription?.tier_key ?? 'NONE';
  const featureMap = new Map((features || []).map(f => [f.feature_key, f]));
  const relationFeatures = RELATIONS_PACK_FEATURES.map(k => featureMap.get(k)).filter(Boolean);
  const hasRelationsActive = relationFeatures.some(f => f!.status === 'active' || f!.status === 'trial');

  return (
    <div className="space-y-6">
      {/* Bloc B — État actuel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            {agency?.label ?? 'Agence'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Plan principal" value={getPlanLabel(tierKey)} />
            <InfoItem
              label="Pack Relations"
              value={hasRelationsActive ? 'Actif' : 'Inactif'}
              variant={hasRelationsActive ? 'success' : 'muted'}
            />
            <InfoItem
              label="Features actives"
              value={`${relationFeatures.filter(f => f!.status === 'active').length} / ${RELATIONS_PACK_FEATURES.length}`}
            />
            {(() => {
              const portal = featureMap.get('apporteur_portal');
              const meta = (portal?.metadata || {}) as Record<string, unknown>;
              const included = (meta.included_spaces as number) ?? 0;
              const extra = (meta.extra_spaces as number) ?? 0;
              return (
                <InfoItem
                  label="Espaces apporteurs"
                  value={portal ? `${included + extra} (${included} inclus + ${extra} ext.)` : '—'}
                />
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Bloc C — Pack Relations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Pack Relations
            </CardTitle>
            {hasRelationsActive ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => deactivatePack.mutate(agencyId)}
                disabled={deactivatePack.isPending}
              >
                {deactivatePack.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
                Désactiver le pack
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => activatePack.mutate(agencyId)}
                disabled={activatePack.isPending}
              >
                {activatePack.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                Activer le pack Relations
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {hasRelationsActive
              ? 'Le pack est actif. Vous pouvez désactiver toutes les features Relations d\'un coup.'
              : 'Activez le pack pour donner accès au Suivi Client, Portail et Échanges Apporteurs.'
            }
          </p>
        </CardHeader>
      </Card>

      {/* Bloc D — Extensions */}
      {hasRelationsActive && (
        <ExtensionManager agencyId={agencyId} featureMap={featureMap} />
      )}

      {/* Bloc E — Gestion fine */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gestion fine des features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {RELATIONS_PACK_FEATURES.map((key) => (
            <FeatureRow
              key={key}
              featureKey={key}
              agencyId={agencyId}
              feature={featureMap.get(key) || null}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Info Item ──────────────────────────────────────────────────
function InfoItem({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'muted' }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${
        variant === 'success' ? 'text-green-600' : variant === 'muted' ? 'text-muted-foreground' : 'text-foreground'
      }`}>
        {value}
      </p>
    </div>
  );
}

// ─── Extension Manager ─────────────────────────────────────────
function ExtensionManager({
  agencyId,
  featureMap,
}: {
  agencyId: string;
  featureMap: Map<string, any>;
}) {
  const updateMeta = useUpdateFeatureMetadata();
  const portal = featureMap.get('apporteur_portal');
  const meta = (portal?.metadata || {}) as Record<string, unknown>;
  const currentPack = (meta.extension_pack as string) ?? null;
  const included = (meta.included_spaces as number) ?? 5;
  const extra = (meta.extra_spaces as number) ?? 0;

  const handleExtensionChange = (packKey: string) => {
    const pack = EXTENSION_PACKS.find(p => (p.key ?? '') === (packKey === '' ? '' : packKey));
    if (!pack) return;

    updateMeta.mutate({
      agencyId,
      featureKey: 'apporteur_portal',
      metadata: {
        ...meta,
        included_spaces: included,
        extra_spaces: pack.extra,
        extension_pack: pack.key,
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Extensions espaces apporteurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Inclus</p>
            <p className="text-lg font-bold text-foreground">{included}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Extension</p>
            <p className="text-lg font-bold text-primary">+{extra}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Capacité totale</p>
            <p className="text-lg font-bold text-foreground">{included + extra}</p>
          </div>

          <div className="ml-auto">
            <Select
              value={currentPack ?? ''}
              onValueChange={handleExtensionChange}
              disabled={updateMeta.isPending}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Extension" />
              </SelectTrigger>
              <SelectContent>
                {EXTENSION_PACKS.map((p) => (
                  <SelectItem key={p.key ?? 'none'} value={p.key ?? ''}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature Row ───────────────────────────────────────────────
function FeatureRow({
  featureKey,
  agencyId,
  feature,
}: {
  featureKey: string;
  agencyId: string;
  feature: any | null;
}) {
  const def = AGENCY_FEATURES[featureKey];
  const upsert = useUpsertAgencyFeature();
  if (!def) return null;

  const Icon = def.icon;
  const status: AgencyFeatureStatus = feature?.status ?? 'inactive';
  const billingMode: AgencyFeatureBillingMode = feature?.billing_mode ?? 'manual';
  const isActive = status === 'active' || status === 'trial';

  const handleToggle = () => {
    upsert.mutate({
      agencyId,
      featureKey,
      status: isActive ? 'inactive' : 'active',
      billingMode,
      metadata: feature?.metadata ?? {},
    });
  };

  const handleBillingChange = (mode: string) => {
    upsert.mutate({
      agencyId,
      featureKey,
      status,
      billingMode: mode as AgencyFeatureBillingMode,
      metadata: feature?.metadata ?? {},
    });
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{def.label}</p>
        <p className="text-xs text-muted-foreground truncate">{def.description}</p>
      </div>

      {/* Status badge */}
      <Badge variant={isActive ? 'default' : 'secondary'} className="gap-1 shrink-0">
        {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {status}
      </Badge>

      {/* Billing mode */}
      <Select value={billingMode} onValueChange={handleBillingChange} disabled={upsert.isPending}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manuel</SelectItem>
          <SelectItem value="included">Inclus</SelectItem>
          <SelectItem value="trial">Essai</SelectItem>
          <SelectItem value="complimentary">Offert</SelectItem>
        </SelectContent>
      </Select>

      {/* Toggle button */}
      <Button
        variant={isActive ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={upsert.isPending}
        className="shrink-0"
      >
        {upsert.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isActive ? (
          'Désactiver'
        ) : (
          'Activer'
        )}
      </Button>
    </div>
  );
}
