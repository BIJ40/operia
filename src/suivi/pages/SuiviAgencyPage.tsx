import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { SuiviShell } from "@/suivi/components/SuiviShell";
import { SuiviLoadingState } from "@/suivi/components/SuiviLoadingState";
import { SuiviErrorState } from "@/suivi/components/SuiviErrorState";
import { useSecureProjectData } from "@/suivi/hooks/useSecureProjectData";
import { useVerificationState } from "@/suivi/hooks/useVerificationState";
import { CodePostalVerification } from "@/suivi/components/CodePostalVerification";
import { SuiviContent } from "@/suivi/components/SuiviContent";
import { useAgency } from "@/suivi/hooks/useAgency";
import { usePaymentCallback } from "@/suivi/hooks/usePaymentCallback";

/**
 * Suivi page with agency slug and hash-based secure access
 * Route: /:agencySlug/:ref/:hash
 */
const SuiviAgencyPage = () => {
  const { agencySlug, ref, hash } = useParams<{ agencySlug: string; ref: string; hash: string }>();
  const projectRef = ref?.toString().trim();
  const projectHash = hash?.toString().trim();
  const { isVerified, verifiedPostalCode, setVerifiedPostalCode } = useVerificationState();
  const { setAgencySlug, agency, isLoading: agencyLoading } = useAgency();
  
  // Handle payment callback from Stripe
  usePaymentCallback(projectRef, agencySlug);

  // Set agency slug when component mounts or slug changes
  useEffect(() => {
    if (agencySlug) {
      setAgencySlug(agencySlug);
    }
  }, [agencySlug, setAgencySlug]);

  // Only fetch data AFTER postal code is verified
  const { data, isLoading, error } = useSecureProjectData(
    projectRef, 
    agencySlug,
    verifiedPostalCode || undefined,
    projectHash
  );

  // Show loading while agency is being fetched
  if (agencyLoading) {
    return (
      <SuiviShell agency={agency}>
        <SuiviLoadingState />
      </SuiviShell>
    );
  }

  // If not verified, show verification dialog first (no data fetching)
  if (!isVerified && projectRef && projectHash) {
    return (
      <SuiviShell agency={agency}>
        <div className="container max-w-4xl py-10">
          <CodePostalVerification 
            refDossier={projectRef}
            agencySlug={agencySlug}
            hash={projectHash}
            onVerified={setVerifiedPostalCode}
          />
          <SuiviLoadingState />
        </div>
      </SuiviShell>
    );
  }

  if (isLoading) {
    return (
      <SuiviShell agency={agency}>
        <SuiviLoadingState />
      </SuiviShell>
    );
  }

  if (error && projectRef) {
    return (
      <SuiviShell agency={agency}>
        <SuiviErrorState projectRef={projectRef} />
      </SuiviShell>
    );
  }

  if (!data?.project) return null;

  return (
    <SuiviShell agency={agency}>
      <SuiviContent
        project={data.project}
        clients={data.client ? [data.client] : []}
        devis={data.devis}
        users={data.users}
        factures={data.factures}
        interventions={data.interventions}
        creneaux={data.creneaux}
        agencySlug={agencySlug}
        verifiedPostalCode={verifiedPostalCode || undefined}
      />
    </SuiviShell>
  );
};

export default SuiviAgencyPage;
