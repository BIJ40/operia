import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

interface LeaveDecisionRequest {
  leaveRequestId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leaveRequestId } = await req.json() as LeaveDecisionRequest;

    // Fetch leave request with collaborator and agency
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        collaborator:collaborators(
          id, first_name, last_name, role,
          agency:apogee_agencies(id, label, adresse, ville, code_postal, contact_email)
        ),
        validator:profiles!leave_requests_validated_by_fkey(first_name, last_name)
      `)
      .eq('id', leaveRequestId)
      .single();

    if (leaveError) throw leaveError;
    if (!leaveRequest) throw new Error('Demande introuvable');

    const collaborator = leaveRequest.collaborator;
    const agency = collaborator?.agency;
    const validator = leaveRequest.validator;

    // Type labels
    const TYPE_LABELS: Record<string, string> = {
      'CP': 'Congés Payés',
      'SANS_SOLDE': 'Congés Sans Solde',
      'EVENT': 'Événement Familial',
      'MALADIE': 'Maladie',
    };

    const EVENT_LABELS: Record<string, string> = {
      'MARIAGE': 'Mariage',
      'NAISSANCE': 'Naissance',
      'DECES': 'Décès',
    };

    const STATUS_LABELS: Record<string, string> = {
      'APPROVED': 'ACCEPTÉE',
      'REFUSED': 'REFUSÉE',
      'ACKNOWLEDGED': 'PRIS EN CONNAISSANCE',
      'CLOSED': 'CLÔTURÉE',
    };

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', month: 'long', year: 'numeric' 
      });
    };

    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    };

    // Generate PDF content as HTML (will be converted)
    const leaveType = TYPE_LABELS[leaveRequest.type] || leaveRequest.type;
    const eventSubtype = leaveRequest.event_subtype ? EVENT_LABELS[leaveRequest.event_subtype] : null;
    const statusLabel = STATUS_LABELS[leaveRequest.status] || leaveRequest.status;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .agency-info { font-size: 12px; color: #666; margin-top: 10px; }
    .title { font-size: 20px; font-weight: bold; text-align: center; margin: 30px 0; text-transform: uppercase; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    .row { display: flex; margin: 8px 0; }
    .label { width: 180px; color: #666; }
    .value { flex: 1; font-weight: 500; }
    .decision { margin: 30px 0; padding: 20px; background: ${leaveRequest.status === 'APPROVED' ? '#e8f5e9' : leaveRequest.status === 'REFUSED' ? '#ffebee' : '#e3f2fd'}; border-radius: 8px; }
    .decision-status { font-size: 18px; font-weight: bold; color: ${leaveRequest.status === 'APPROVED' ? '#2e7d32' : leaveRequest.status === 'REFUSED' ? '#c62828' : '#1565c0'}; }
    .comment { margin-top: 15px; padding: 10px; background: white; border-radius: 4px; font-style: italic; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
    .signature-area { margin-top: 30px; display: flex; justify-content: flex-end; }
    .signature-box { text-align: center; border: 1px dashed #ccc; padding: 20px 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">HelpConfort Services</div>
    <div class="agency-info">
      ${agency?.label || 'Agence'}<br>
      ${agency?.adresse || ''} ${agency?.code_postal || ''} ${agency?.ville || ''}<br>
      ${agency?.contact_email || ''}
    </div>
  </div>

  <div class="title">Décision relative à une demande d'absence</div>

  <div class="section">
    <div class="section-title">Informations du collaborateur</div>
    <div class="row"><span class="label">Nom / Prénom :</span><span class="value">${collaborator?.last_name || ''} ${collaborator?.first_name || ''}</span></div>
    <div class="row"><span class="label">Poste :</span><span class="value">${collaborator?.role || 'N/A'}</span></div>
    <div class="row"><span class="label">Agence :</span><span class="value">${agency?.label || 'N/A'}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Détails de la demande</div>
    <div class="row"><span class="label">Type d'absence :</span><span class="value">${leaveType}${eventSubtype ? ` - ${eventSubtype}` : ''}</span></div>
    <div class="row"><span class="label">Date de début :</span><span class="value">${formatDate(leaveRequest.start_date)}</span></div>
    ${leaveRequest.end_date ? `<div class="row"><span class="label">Date de fin :</span><span class="value">${formatDate(leaveRequest.end_date)}</span></div>` : ''}
    ${leaveRequest.days_count ? `<div class="row"><span class="label">Nombre de jours :</span><span class="value">${leaveRequest.days_count} jour${leaveRequest.days_count > 1 ? 's' : ''}</span></div>` : ''}
    <div class="row"><span class="label">Date de la demande :</span><span class="value">${formatDate(leaveRequest.created_at)}</span></div>
  </div>

  <div class="decision">
    <div class="decision-status">Décision : ${statusLabel}</div>
    ${leaveRequest.validated_at ? `<div style="margin-top: 10px; font-size: 14px;">Horodatage : ${formatDateTime(leaveRequest.validated_at)}</div>` : ''}
    ${validator ? `<div style="margin-top: 5px; font-size: 14px;">Validateur : ${validator.first_name} ${validator.last_name}</div>` : ''}
    ${leaveRequest.refusal_reason ? `<div class="comment"><strong>Motif du refus :</strong> ${leaveRequest.refusal_reason}</div>` : ''}
    ${leaveRequest.manager_comment ? `<div class="comment"><strong>Commentaire :</strong> ${leaveRequest.manager_comment}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Justificatif</div>
    <div class="row"><span class="label">Justificatif requis :</span><span class="value">${leaveRequest.requires_justification ? 'Oui' : 'Non'}</span></div>
    <div class="row"><span class="label">Justificatif fourni :</span><span class="value">${leaveRequest.justification_document_id ? 'Oui' : 'Non'}</span></div>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <div style="font-size: 12px; margin-bottom: 10px;">Tampon électronique</div>
      <div style="font-weight: bold;">${agency?.label || 'Agence'}</div>
      <div style="font-size: 11px; margin-top: 5px;">${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="footer">
    Document généré automatiquement via l'outil RH HelpConfort Services.<br>
    Ce document fait foi de la décision prise concernant la demande d'absence référencée.
  </div>
</body>
</html>
    `.trim();

    // Convert HTML to PDF using a simple approach (store as HTML for now, 
    // can be enhanced with puppeteer or similar later)
    const fileName = `decision_${leaveRequest.type.toLowerCase()}_${leaveRequest.id.slice(0, 8)}.html`;
    const filePath = `leave-decisions/${leaveRequest.agency_id}/${leaveRequest.collaborator_id}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('collaborator-documents')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Determine subfolder based on type
    const SUBFOLDER_MAP: Record<string, string> = {
      'CP': 'Congés payés',
      'SANS_SOLDE': 'Congés sans solde',
      'EVENT': 'Événements familiaux',
      'MALADIE': 'Maladie',
    };

    // Create document entry in collaborator_documents
    const docTitle = `Décision - ${leaveType}${eventSubtype ? ` (${eventSubtype})` : ''} - ${formatDate(leaveRequest.start_date)}`;
    
    const { data: docData, error: docError } = await supabase
      .from('collaborator_documents')
      .insert({
        collaborator_id: leaveRequest.collaborator_id,
        agency_id: leaveRequest.agency_id,
        doc_type: 'CONGES_ABSENCES',
        subfolder: SUBFOLDER_MAP[leaveRequest.type] || 'Autres',
        title: docTitle,
        file_name: fileName,
        file_path: filePath,
        file_type: 'text/html',
        visibility: 'EMPLOYEE_VISIBLE',
        leave_request_id: leaveRequest.id,
      })
      .select()
      .single();

    if (docError) throw docError;

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        documentId: docData.id,
        filePath,
        message: 'Document de décision généré et stocké dans le coffre-fort' 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    console.error('Error generating leave decision:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
