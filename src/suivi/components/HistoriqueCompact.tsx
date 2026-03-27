import React from 'react';
import { 
  Calendar, FileText, Phone, PhoneCall, PhoneIncoming,
  ClipboardCheck, CheckCircle2, Package, Wrench, FileCheck,
  DollarSign, User, Clock
} from 'lucide-react';
import { SuiviEvent } from '@/lib/dataProcessing/suiviDataProcessor';

interface HistoriqueCompactProps {
  events: SuiviEvent[];
}

export const HistoriqueCompact: React.FC<HistoriqueCompactProps> = ({ events }) => {
  const formatDateTime = (event: SuiviEvent) => {
    return event.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getEventIcon = (type: SuiviEvent['type'], label: string) => {
    const iconClass = "h-4 w-4";
    if (label.includes('Dossier créé')) return <FileText className={iconClass} />;
    if (label.includes('Appel reçu')) return <PhoneIncoming className={iconClass} />;
    if (label.includes('sans réponse')) return <Phone className={iconClass} />;
    if (label.includes('Rappel')) return <PhoneCall className={iconClass} />;
    if (label.includes('RDV pris') || label.includes('RDV planifié')) return <Calendar className={iconClass} />;
    if (label.includes('Relevé technique') || label.includes('RT')) return <ClipboardCheck className={iconClass} />;
    if (label.includes('Devis créé') || label.includes('Devis généré')) return <FileText className={iconClass} />;
    if (label.includes('Devis envoyé')) return <FileCheck className={iconClass} />;
    if (label.includes('Devis validé') || label.includes('accepté')) return <CheckCircle2 className={iconClass} />;
    if (label.includes('Fournitures') || label.includes('commande')) return <Package className={iconClass} />;
    if (label.includes('Travaux') || label.includes('TVX')) return <Wrench className={iconClass} />;
    if (label.includes('Facture')) return <DollarSign className={iconClass} />;
    if (label.includes('Intervention')) return <Clock className={iconClass} />;
    switch (type) {
      case 'creation': return <FileText className={iconClass} />;
      case 'contact': return <PhoneCall className={iconClass} />;
      case 'appointment': return <Calendar className={iconClass} />;
      case 'rt': return <ClipboardCheck className={iconClass} />;
      case 'quote': return <FileCheck className={iconClass} />;
      case 'supplies': return <Package className={iconClass} />;
      case 'work': return <Wrench className={iconClass} />;
      case 'invoice': return <DollarSign className={iconClass} />;
      default: return <User className={iconClass} />;
    }
  };

  const getEventTypeColor = (type: SuiviEvent['type']) => {
    switch (type) {
      case 'creation':
        return 'border-primary bg-accent/40';
      case 'contact':
        return 'border-primary-light bg-primary-light/8';
      case 'appointment':
      case 'rt':
      case 'work':
        return 'border-primary bg-accent/40';
      case 'quote':
        return 'border-primary-light bg-primary-light/8';
      case 'supplies':
        return 'border-primary-dark bg-primary-dark/8';
      case 'invoice':
        return 'border-primary bg-accent/40';
      default:
        return 'border-muted-foreground bg-muted/30';
    }
  };

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 text-lg mb-2">
        <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
          <Calendar className="h-3 w-3 text-primary" />
        </div>
        <span className="font-display font-semibold text-foreground">Historique détaillé</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Toutes les actions effectuées sur votre dossier
      </p>
      
      <div className="space-y-1.5">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`border-l-[3px] pl-2 py-1.5 hover:bg-accent/30 rounded-r transition-colors ${getEventTypeColor(event.type)}`}
          >
            <div className="flex gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {getEventIcon(event.type, event.label)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground leading-tight">{event.label}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span>{formatDateTime(event)}</span>
                  {event.userFirstName && event.userFirstName.toLowerCase() !== 'utilisateur' && event.type !== 'appointment' && event.type !== 'work' && event.type !== 'rt' && (
                    <>
                      <span>par</span>
                      <span className="font-medium text-foreground uppercase">{event.userFirstName}</span>
                    </>
                  )}
                  {event.plannedBy && event.plannedBy.toLowerCase() !== 'utilisateur' && (
                    <>
                      <span>par</span>
                      <span className="font-medium text-foreground uppercase">{event.plannedBy}</span>
                    </>
                  )}
                </div>
                {event.technicianNames && event.technicianNames.length > 0 && (
                  <p className="text-xs text-primary font-medium mt-1">👷 {event.technicianNames.join(', ')}</p>
                )}
                {event.description && (
                  <p className="text-xs text-muted-foreground italic mt-1">{event.description}</p>
                )}
                {event.details?.timeSlot && (
                  <p className="text-xs text-muted-foreground mt-1">🕐 {event.details.timeSlot}</p>
                )}
                {event.details?.amount && (
                  <p className="text-xs font-semibold text-foreground mt-1">💰 {event.details.amount}€ TTC</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun événement enregistré pour le moment</p>
        )}
      </div>
      
      {events.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border">
          {events.length} événement{events.length > 1 ? 's' : ''} au total
        </p>
      )}
    </div>
  );
};
