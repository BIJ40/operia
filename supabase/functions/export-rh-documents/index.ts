/**
 * P2-03: Export RH Documents (ZIP + CSV)
 * Permet l'export groupé de documents et données RH
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

interface ExportRequest {
  type: 'documents_zip' | 'collaborators_csv' | 'requests_csv';
  collaborator_id?: string;
  document_ids?: string[];
  agency_id?: string;
  filters?: {
    doc_type?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    const body: ExportRequest = await req.json();
    const { type, collaborator_id, document_ids, agency_id, filters } = body;

    // Get user profile for agency check
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return withCors(req, new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    const effectiveAgencyId = agency_id || profile.agency_id;

    // Export based on type
    switch (type) {
      case 'documents_zip': {
        // For now, return list of signed URLs (client will download individually)
        // Full ZIP generation would require more memory/processing
        if (!document_ids || document_ids.length === 0) {
          return withCors(req, new Response(JSON.stringify({ error: 'No documents specified' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }));
        }

        if (document_ids.length > 50) {
          return withCors(req, new Response(JSON.stringify({ error: 'Maximum 50 documents per export' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }));
        }

        // Fetch documents
        const { data: documents, error: docsError } = await supabaseClient
          .from('collaborator_documents')
          .select('id, title, file_name, file_path')
          .in('id', document_ids);

        if (docsError) throw docsError;

        // Generate signed URLs for each document
        const downloadUrls = await Promise.all(
          (documents || []).map(async (doc) => {
            const { data: signedUrl } = await supabaseClient.storage
              .from('collaborator-documents')
              .createSignedUrl(doc.file_path, 300); // 5 minutes
            return {
              id: doc.id,
              title: doc.title,
              file_name: doc.file_name,
              download_url: signedUrl?.signedUrl,
            };
          })
        );

        return withCors(req, new Response(JSON.stringify({ 
          type: 'documents_urls',
          data: downloadUrls,
          count: downloadUrls.length,
        }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      case 'collaborators_csv': {
        // Export collaborators list as CSV
        let query = supabaseClient
          .from('collaborators')
          .select(`
            id, first_name, last_name, email, phone, role,
            hiring_date, leaving_date, birth_date,
            address, postal_code, city, type
          `)
          .eq('agency_id', effectiveAgencyId);

        if (filters?.date_from) {
          query = query.gte('hiring_date', filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte('hiring_date', filters.date_to);
        }

        const { data: collaborators, error: collabError } = await query;
        if (collabError) throw collabError;

        // Convert to CSV
        const headers = [
          'ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Poste',
          'Date embauche', 'Date départ', 'Date naissance',
          'Adresse', 'Code postal', 'Ville', 'Type'
        ];
        
        const rows = (collaborators || []).map(c => [
          c.id,
          c.first_name || '',
          c.last_name || '',
          c.email || '',
          c.phone || '',
          c.role || '',
          c.hiring_date || '',
          c.leaving_date || '',
          c.birth_date || '',
          c.address || '',
          c.postal_code || '',
          c.city || '',
          c.type || '',
        ]);

        const csvContent = [
          headers.join(';'),
          ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        return withCors(req, new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="collaborateurs_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        }));
      }

      case 'requests_csv': {
        // Export document requests as CSV
        let query = supabaseClient
          .from('document_requests')
          .select(`
            id, request_type, description, status,
            requested_at, processed_at, response_note,
            collaborator:collaborators(first_name, last_name)
          `)
          .eq('agency_id', effectiveAgencyId);

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.date_from) {
          query = query.gte('requested_at', filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte('requested_at', filters.date_to);
        }

        const { data: requests, error: reqError } = await query.order('requested_at', { ascending: false });
        if (reqError) throw reqError;

        // Convert to CSV
        const headers = [
          'ID', 'Collaborateur', 'Type demande', 'Description',
          'Statut', 'Date demande', 'Date traitement', 'Note réponse'
        ];

        const statusLabels: Record<string, string> = {
          PENDING: 'En attente',
          IN_PROGRESS: 'En cours',
          COMPLETED: 'Traité',
          REJECTED: 'Refusé',
        };
        
        const rows = (requests || []).map((r: any) => [
          r.id,
          r.collaborator ? `${r.collaborator.first_name} ${r.collaborator.last_name}` : '',
          r.request_type || '',
          r.description || '',
          statusLabels[r.status] || r.status,
          r.requested_at ? new Date(r.requested_at).toLocaleDateString('fr-FR') : '',
          r.processed_at ? new Date(r.processed_at).toLocaleDateString('fr-FR') : '',
          r.response_note || '',
        ]);

        const csvContent = [
          headers.join(';'),
          ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        return withCors(req, new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="demandes_rh_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        }));
      }

      default:
        return withCors(req, new Response(JSON.stringify({ error: 'Invalid export type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }));
    }
  } catch (error: unknown) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return withCors(req, new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
  }
});
