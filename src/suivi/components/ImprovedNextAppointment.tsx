import React from 'react';
import { Calendar, Clock, MapPin, User, Phone, CalendarCheck } from 'lucide-react';
import { NextAppointmentInfo } from '@/suivi/lib/dataProcessing/suiviDataProcessor';
import { EmpechementDialog } from './EmpechementDialog';

interface ImprovedNextAppointmentProps {
  appointment: NextAppointmentInfo;
  duration?: number;
  refDossier: string;
  clientFirstName: string;
  clientLastName: string;
  agencySlug?: string;
  verifiedPostalCode?: string;
}

export const ImprovedNextAppointment: React.FC<ImprovedNextAppointmentProps> = ({ 
  appointment, duration, refDossier, clientFirstName, clientLastName, agencySlug, verifiedPostalCode
}) => {
  const getTimeOfDay = () => {
    if (!appointment.timeSlot) return null;
    const startTime = appointment.timeSlot.split('-')[0].trim();
    const [hours] = startTime.split(':').map(Number);
    if (hours < 12) return "RDV dans la matinée";
    return "RDV dans l'après-midi";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minute${mins > 1 ? 's' : ''}`;
    if (mins === 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
    return `${hours} heure${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
  };

  const timeOfDay = getTimeOfDay();

  return (
    <div className="group rounded-xl bg-card border-0 shadow-card 
      transition-all duration-300 hover:shadow-card-hover p-4 md:p-6 overflow-hidden">
      <div className="flex items-center gap-2 md:gap-3 mb-4">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary 
          flex items-center justify-center shadow-sm">
          <CalendarCheck className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
        </div>
        <h2 className="text-lg md:text-2xl font-display font-bold text-foreground leading-tight">
          PROCHAIN RENDEZ-VOUS
        </h2>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {/* Date */}
          <div className="rounded-xl bg-accent/40 p-2 md:p-4 border border-primary/10
            transition-all duration-300 hover:bg-accent/60 hover:shadow-sm hover:-translate-y-0.5">
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/15 
                  flex items-center justify-center">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                </div>
                <span className="text-xs md:text-base font-display font-semibold text-primary leading-tight">
                  DATE
                </span>
              </div>
              <div className="ml-7 md:ml-10 space-y-0.5 md:space-y-1">
                <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight">
                  {appointment.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">
                  {appointment.date.getFullYear()}
                </p>
              </div>
            </div>
          </div>

          {/* Horaire */}
          <div className="rounded-xl bg-primary-light/10 p-2 md:p-4 border border-primary-light/15
            transition-all duration-300 hover:bg-primary-light/20 hover:shadow-sm hover:-translate-y-0.5">
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary-light/20 
                  flex items-center justify-center">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-primary-light flex-shrink-0" />
                </div>
                <span className="text-xs md:text-base font-display font-semibold text-primary-light leading-tight">
                  HORAIRE
                </span>
              </div>
              <div className="ml-7 md:ml-10 space-y-0.5 md:space-y-1">
                <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight">
                  {timeOfDay || 'À confirmer'}
                </p>
                {duration && (
                  <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">
                    Durée théorique: {formatDuration(duration)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Techniciens et adresse */}
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {appointment.technicianNames.length > 0 && (
            <div className="rounded-xl bg-accent/40 p-2 md:p-4 border border-primary/10
              transition-all duration-300 hover:bg-accent/60 hover:shadow-sm hover:-translate-y-0.5">
              <div className="space-y-1 md:space-y-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/15 
                    flex items-center justify-center">
                    <User className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="text-xs md:text-base font-display font-semibold text-primary leading-tight">
                    {appointment.technicianNames.length > 1 ? 'TECHNICIENS' : 'TECHNICIEN'}
                  </span>
                </div>
                <div className="ml-7 md:ml-10 space-y-0.5">
                  {appointment.technicianNames.map((name, idx) => (
                    <p key={idx} className="text-[10px] md:text-sm text-foreground font-medium leading-tight">{name}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {appointment.city && (
            <div className="rounded-xl bg-primary-light/10 p-2 md:p-4 border border-primary-light/15
              transition-all duration-300 hover:bg-primary-light/20 hover:shadow-sm hover:-translate-y-0.5">
              <div className="space-y-1 md:space-y-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary-light/20 
                    flex items-center justify-center">
                    <MapPin className="h-3 w-3 md:h-4 md:w-4 text-primary-light flex-shrink-0" />
                  </div>
                  <span className="text-xs md:text-base font-display font-semibold text-primary-light leading-tight">
                    LIEU
                  </span>
                </div>
                <div className="ml-7 md:ml-10 space-y-0.5">
                  <p className="text-[10px] md:text-sm text-foreground font-medium leading-tight break-words">{appointment.address}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{appointment.city}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 md:pt-3 p-2 md:p-3 bg-accent/50 rounded-xl border border-primary/10">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
              <Phone className="h-3 w-3 text-primary flex-shrink-0" />
            </div>
            <p className="text-xs md:text-sm text-foreground">
              {appointment.technicianNames.length > 0 
                ? `${appointment.technicianNames[0]} vous contactera avant son arrivée.`
                : 'Votre technicien vous contactera avant son arrivée.'}
            </p>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <EmpechementDialog 
            refDossier={refDossier} clientFirstName={clientFirstName} clientLastName={clientLastName}
            appointmentDate={appointment.date} agencySlug={agencySlug} verifiedPostalCode={verifiedPostalCode}
          />
        </div>
      </div>
    </div>
  );
};
