/**
 * Page publique accessible via QR code
 * Affiche les infos d'un véhicule ou outil/EPI sans nécessiter d'authentification
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock, Car, Package } from 'lucide-react';

interface QrAssetResponse {
  success: boolean;
  error?: string;
  type?: 'vehicle' | 'tool';
  asset?: {
    id: string;
    name: string;
    registration?: string;
    brand?: string;
    model?: string;
    status: string;
    category?: string;
    serial_number?: string;
    ct_due_at?: string;
    next_revision_at?: string;
    next_tires_change_at?: string;
  };
  upcomingEvents?: Array<{
    id: string;
    label: string;
    status: string;
    scheduled_at?: string | null;
  }>;
  lastCompletedEvent?: {
    id: string;
    label: string;
    status: string;
    completed_at?: string | null;
  } | null;
}

export default function QrAssetPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QrAssetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchAssetInfo = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/qr-asset?token=${encodeURIComponent(token)}`,
          { method: 'GET' }
        );
        const json = (await res.json()) as QrAssetResponse;
        setData(json);
      } catch (e) {
        // Pas de logError car page publique sans auth - log simple pour debug
        setData({ success: false, error: 'NETWORK_ERROR' });
      } finally {
        setLoading(false);
      }
    };

    fetchAssetInfo();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Récupération des informations...</CardTitle>
            <CardDescription>Merci de patienter quelques secondes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-6 w-1/2" />
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="mb-2 h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.success || !data.type || !data.asset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>QR non reconnu</CardTitle>
            <CardDescription>
              Impossible de retrouver l'actif associé à ce QR. Contactez votre agence si le
              problème persiste.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>{data?.error || 'Actif introuvable.'}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { type, asset, upcomingEvents = [], lastCompletedEvent } = data;

  const isVehicle = type === 'vehicle';
  const Icon = isVehicle ? Car : Package;

  const statusLabel = (() => {
    const status = asset.status as string;
    switch (status) {
      case 'active':
      case 'in_service':
        return 'En service';
      case 'repair':
        return 'En réparation';
      case 'out_of_service':
      case 'inactive':
        return 'Hors service';
      case 'sold':
        return 'Vendu';
      case 'lost':
        return 'Perdu';
      default:
        return status;
    }
  })();

  const statusVariant: 'default' | 'outline' | 'secondary' = ['active', 'in_service'].includes(asset.status)
    ? 'default'
    : ['repair'].includes(asset.status)
    ? 'outline'
    : 'secondary';

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {asset.name}
                <Badge variant={statusVariant} className="text-xs">
                  {statusLabel}
                </Badge>
              </CardTitle>
              <CardDescription>
                {isVehicle
                  ? asset.registration || 'Véhicule de flotte'
                  : asset.category || 'Matériel / EPI'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Infos principales */}
          <div className="rounded-md border p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {isVehicle && (
                <>
                  <InfoRow label="Immatriculation" value={asset.registration || '—'} />
                  <InfoRow
                    label="Marque / Modèle"
                    value={[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}
                  />
                  <InfoRow label="CT à faire avant" value={formatDate(asset.ct_due_at)} />
                  <InfoRow
                    label="Prochaine révision"
                    value={formatDate(asset.next_revision_at)}
                  />
                </>
              )}
              {!isVehicle && (
                <>
                  <InfoRow label="Catégorie" value={asset.category || '—'} />
                  <InfoRow label="N° de série" value={asset.serial_number || '—'} />
                </>
              )}
            </div>
          </div>

          {/* Prochains contrôles */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Contrôles à venir</span>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun contrôle planifié trouvé pour cet actif.
              </p>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
                  >
                    <span>{ev.label}</span>
                    <span className="font-medium">{formatDate(ev.scheduled_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dernier contrôle réalisé */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">Dernier contrôle réalisé</span>
            </div>
            {lastCompletedEvent ? (
              <div className="rounded-md border px-2 py-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>{lastCompletedEvent.label}</span>
                  <span className="font-medium">
                    {formatDate(lastCompletedEvent.completed_at)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucun contrôle complété trouvé pour cet actif.
              </p>
            )}
          </div>

          {/* CTA future (connecté) */}
          <div className="pt-2 text-center text-xs text-muted-foreground">
            Pour toute anomalie, contactez votre agence ou signalez-la via votre espace interne.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
