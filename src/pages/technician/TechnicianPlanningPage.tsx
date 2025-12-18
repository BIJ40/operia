/**
 * Technician Planning Page
 * Shows today's appointments with offline support
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, RefreshCw, WifiOff, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTechnicianTodayPlanning } from '@/hooks/useTechnicianPlanning';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Allowed appointment types for technician view
const ALLOWED_APPOINTMENT_TYPES = ['rt', 'depannage', 'travaux', 'releve_technique'];

// Type label mapping
const TYPE_LABELS: Record<string, string> = {
  rt: 'Relevé Technique',
  releve_technique: 'Relevé Technique',
  depannage: 'Dépannage',
  travaux: 'Travaux',
};

// Type color mapping
const TYPE_COLORS: Record<string, string> = {
  rt: 'bg-blue-100 text-blue-800',
  releve_technique: 'bg-blue-100 text-blue-800',
  depannage: 'bg-orange-100 text-orange-800',
  travaux: 'bg-green-100 text-green-800',
};

export default function TechnicianPlanningPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const { appointments, isLoading, isFromCache, refetch, lastFetchedAt } = useTechnicianTodayPlanning();

  // Filter to allowed types only
  const filteredAppointments = appointments.filter((apt) =>
    ALLOWED_APPOINTMENT_TYPES.includes(apt.type?.toLowerCase() || '')
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleAppointmentClick = (appointmentId: string) => {
    navigate(`/t/rdv/${appointmentId}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold capitalize">{dateStr}</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAppointments.length} rendez-vous
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading || !isOnline}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Cache indicator */}
      {isFromCache && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <WifiOff className="h-4 w-4" />
          <span>
            Données en cache
            {lastFetchedAt && (
              <span className="text-xs ml-1">
                ({new Date(lastFetchedAt).toLocaleTimeString()})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredAppointments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Aucun rendez-vous</h3>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas de rendez-vous prévu pour aujourd'hui.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Appointments list */}
      {!isLoading && filteredAppointments.length > 0 && (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAppointmentClick(appointment.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Type badge */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        TYPE_COLORS[appointment.type?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {TYPE_LABELS[appointment.type?.toLowerCase() || ''] || appointment.type}
                    </Badge>

                    {/* Time */}
                    {(appointment.time_start || appointment.time_end) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {appointment.time_start}
                          {appointment.time_end && ` - ${appointment.time_end}`}
                        </span>
                      </div>
                    )}

                    {/* Client */}
                    {appointment.client_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{appointment.client_name}</span>
                      </div>
                    )}

                    {/* Address */}
                    {(appointment.address || appointment.city) && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          {[appointment.address, appointment.postal_code, appointment.city]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {appointment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {appointment.description}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
