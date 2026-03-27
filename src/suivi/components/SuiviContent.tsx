import React, { useMemo } from 'react';
import { DossierSummary } from './DossierSummary';
import { ImprovedNextAppointment } from './ImprovedNextAppointment';
import { HistoriqueAccordion } from './HistoriqueAccordion';
import { ScrollIndicator } from './ScrollIndicator';
import { GoogleReviewsBanner } from './GoogleReviewsBanner';
import { SuiviDataProcessor } from '@/suivi/lib/dataProcessing/suiviDataProcessor';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAgencyContext } from '@/suivi/contexts/AgencyContext';

export interface SuiviContentProps {
  project: any;
  clients: any[];
  devis: any[];
  users: any[];
  factures: any[];
  interventions: any[];
  creneaux: any[];
  agencySlug?: string;
  verifiedPostalCode?: string;
}

export function SuiviContent({
  project,
  clients,
  devis,
  users,
  factures,
  interventions,
  creneaux,
  agencySlug,
  verifiedPostalCode
}: SuiviContentProps) {
  const { agency } = useAgencyContext();
  const client = clients.find((c: any) => c.id === project.clientId);

  if (!client) return null;

  const projectInterventions = interventions.filter((i: any) => i.projectId === project.id);
  const projectDevis = devis.filter((d: any) => d.projectId === project.id);
  const projectFactures = factures.filter((f: any) => f.projectId === project.id);

  const processor = useMemo(() => 
    new SuiviDataProcessor(project, projectInterventions, creneaux, projectDevis, projectFactures, client, users, clients),
    [project, projectInterventions, creneaux, projectDevis, projectFactures, client, users, clients]
  );

  const summary = processor.getSummary();
  const nextAppointment = processor.getNextAppointment();
  const events = processor.getEvents();
  const nextAppointmentDuration = nextAppointment ? processor.getNextAppointmentDuration() : undefined;

  const handleLogout = () => {
    // Clear all verification keys from localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('suivi_verified_'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Reload the page to show verification dialog
    window.location.reload();
  };
  
  // Check if project state is "invoiced" for Google Reviews banner
  const isInvoiced = project.state === 'invoiced';
  const showGoogleReviews = isInvoiced && agency.google_reviews_url;
  
  return (
    <div className="container max-w-6xl py-4 md:py-10 px-3 md:px-4 space-y-4 md:space-y-8">
      {nextAppointment && (
        <ImprovedNextAppointment 
          appointment={nextAppointment} 
          duration={nextAppointmentDuration}
          refDossier={project.ref}
          clientFirstName={client.firstname || client.prenom || ''}
          clientLastName={client.name || client.nom || client.lastname || ''}
          agencySlug={agencySlug}
          verifiedPostalCode={verifiedPostalCode}
        />
      )}
      
      {/* Google Reviews Banner - Only shown when project is invoiced */}
      {showGoogleReviews && (
        <GoogleReviewsBanner googleReviewsUrl={agency.google_reviews_url!} />
      )}
      
      <DossierSummary 
        summary={summary} 
        agencySlug={agencySlug} 
        verifiedPostalCode={verifiedPostalCode} 
        stripeEnabled={agency.stripe_enabled}
      />
      <HistoriqueAccordion events={events} />
      
      <div className="flex justify-center pt-4 pb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          QUITTER
        </Button>
      </div>
      
      <ScrollIndicator />
    </div>
  );
}
