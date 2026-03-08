/**
 * Onglet Alertes - Vue consolidée des alertes de maintenance
 */

import { useState } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import {
  useMaintenanceAlerts,
  useAcknowledgeAlert,
  useCloseAlert,
} from '@/hooks/maintenance/useMaintenanceAlerts';
import type {
  MaintenanceAlertsFilters,
  AlertSeverity,
  AlertStatus,
  MaintenanceAlert,
  MaintenanceTargetType,
} from '@/types/maintenance';
import { ALERT_SEVERITIES, ALERT_STATUSES } from '@/types/maintenance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertTriangle, Bell, CheckCircle, Clock, Car, HardHat } from 'lucide-react';

export function AlertsTab() {
  const { user } = useAuthCore();
  const [filters, setFilters] = useState<MaintenanceAlertsFilters>({
    severity: undefined,
    status: 'open',
    targetType: undefined,
  });

  const { data: alerts = [], isLoading } = useMaintenanceAlerts(undefined, filters);
  const acknowledgeAlert = useAcknowledgeAlert();
  const closeAlert = useCloseAlert();

  const handleSeverityChange = (value: AlertSeverity | 'all') => {
    setFilters((prev) => ({
      ...prev,
      severity: value === 'all' ? undefined : value,
    }));
  };

  const handleStatusChange = (value: AlertStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status: value === 'all' ? undefined : value,
    }));
  };

  const handleTargetTypeChange = (value: MaintenanceTargetType | 'all') => {
    setFilters((prev) => ({
      ...prev,
      targetType: value === 'all' ? undefined : value,
    }));
  };

  const handleAcknowledge = async (alertId: string) => {
    if (!user?.id) return;
    try {
      await acknowledgeAlert.mutateAsync({ alertId, collaboratorId: user.id });
      toast.success('Alerte accusée');
    } catch {
      toast.error('Erreur lors de l\'accusé de réception');
    }
  };

  const handleClose = async (alertId: string) => {
    if (!user?.id) return;
    try {
      await closeAlert.mutateAsync({ alertId, collaboratorId: user.id });
      toast.success('Alerte clôturée');
    } catch {
      toast.error('Erreur lors de la clôture');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes de maintenance
          </CardTitle>
          <CardDescription>
            Échéances et retards CT, contrôles matériel et EPI
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            defaultValue="open"
            onValueChange={(v) => handleStatusChange(v as AlertStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {ALERT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="all"
            onValueChange={(v) => handleSeverityChange(v as AlertSeverity | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Gravité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {ALERT_SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="all"
            onValueChange={(v) => handleTargetTypeChange(v as MaintenanceTargetType | 'all')}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="vehicle">Véhicules</SelectItem>
              <SelectItem value="tool">Matériel & EPI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AlertsSkeleton />
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aucune alerte pour ces filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                onClose={() => handleClose(alert.id)}
                isAcknowledging={acknowledgeAlert.isPending}
                isClosing={closeAlert.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

interface AlertRowProps {
  alert: MaintenanceAlert;
  onAcknowledge: () => void;
  onClose: () => void;
  isAcknowledging: boolean;
  isClosing: boolean;
}

function AlertRow({ alert, onAcknowledge, onClose, isAcknowledging, isClosing }: AlertRowProps) {
  const ev = alert.maintenance_event;
  const scheduledLabel = ev?.scheduled_at
    ? new Date(ev.scheduled_at).toLocaleDateString('fr-FR')
    : '—';

  const isVehicle = ev?.target_type === 'vehicle';
  const TargetIcon = isVehicle ? Car : HardHat;

  const targetLabel = isVehicle
    ? ev?.vehicle
      ? `${ev.vehicle.name}${ev.vehicle.registration ? ` (${ev.vehicle.registration})` : ''}`
      : 'Véhicule'
    : ev?.tool
      ? ev.tool.label
      : 'Matériel / EPI';

  const severityConfig = {
    critical: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Critique' },
    warning: { variant: 'default' as const, icon: Clock, label: 'Attention' },
    info: { variant: 'outline' as const, icon: Bell, label: 'Info' },
  };
  const sev = severityConfig[alert.severity] || severityConfig.info;
  const SeverityIcon = sev.icon;

  const statusLabels: Record<AlertStatus, string> = {
    open: 'Ouverte',
    acknowledged: 'Accusée',
    closed: 'Clôturée',
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <TargetIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sev.variant} className="gap-1">
              <SeverityIcon className="h-3 w-3" />
              {sev.label}
            </Badge>
            <span className="font-medium">{ev?.label || 'Événement de maintenance'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Cible : <span className="font-medium text-foreground">{targetLabel}</span>
            </span>
            <span>
              Échéance : <span className="font-medium text-foreground">{scheduledLabel}</span>
            </span>
            <span>
              Statut : <span className="font-medium text-foreground">{statusLabels[alert.status]}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {alert.status === 'open' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onAcknowledge}
              disabled={isAcknowledging}
            >
              Accuser réception
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isClosing}
            >
              Clôturer
            </Button>
          </>
        )}
        {alert.status === 'acknowledged' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isClosing}
          >
            Clôturer
          </Button>
        )}
      </div>
    </div>
  );
}
