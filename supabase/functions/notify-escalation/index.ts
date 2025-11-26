import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://helpconfort.services";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EscalationRequest {
  ticket_id: string;
  ticket_subject: string;
  ticket_service: string;
  from_level?: number;
  to_level?: number;
  from_role?: string;
  to_role?: string;
  escalated_by_name: string;
  escalated_to_id: string;
  escalated_to_name: string;
  reason: string;
}

const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'N1 - Aide de base';
    case 2: return 'N2 - Technique';
    case 3: return 'N3 - Développeur';
    default: return `Niveau ${level}`;
  }
};

const getHelpConfortRoleLabel = (role: string) => {
  switch (role) {
    case 'animateur_reseau': return 'Animateur Réseau';
    case 'directeur_reseau': return 'Directeur Réseau';
    case 'dg': return 'Directeur Général';
    default: return role;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      ticket_id,
      ticket_subject,
      ticket_service,
      from_level,
      to_level,
      from_role,
      to_role,
      escalated_by_name,
      escalated_to_id,
      escalated_to_name,
      reason,
    }: EscalationRequest = await req.json();

    console.log("Processing escalation notification for ticket:", ticket_id);

    // Get the target user's email
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, email_notifications_enabled")
      .eq("id", escalated_to_id)
      .single();

    if (profileError || !targetProfile) {
      console.error("Error fetching target profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email notifications are enabled
    if (!targetProfile.email_notifications_enabled) {
      console.log("Email notifications disabled for user:", escalated_to_id);
      return new Response(
        JSON.stringify({ message: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetProfile.email) {
      console.error("No email for target user:", escalated_to_id);
      return new Response(
        JSON.stringify({ error: "Target user has no email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare escalation level/role labels
    let fromLabel = '';
    let toLabel = '';
    
    if (ticket_service === 'HelpConfort') {
      fromLabel = from_role ? getHelpConfortRoleLabel(from_role) : 'Animateur Réseau';
      toLabel = to_role ? getHelpConfortRoleLabel(to_role) : 'Directeur Réseau';
    } else {
      fromLabel = from_level ? getSupportLevelLabel(from_level) : 'N1';
      toLabel = to_level ? getSupportLevelLabel(to_level) : 'N2';
    }

    const ticketUrl = `${appUrl}/admin/support`;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "HelpConfort Services <support@helpconfort.services>",
      to: [targetProfile.email],
      subject: `🔔 Ticket escaladé vers vous - ${ticket_subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; border-bottom: 3px solid #f97316; padding-bottom: 10px;">
            Nouveau ticket escaladé
          </h1>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1e40af;">📋 ${ticket_subject}</h2>
            <p><strong>Service :</strong> ${ticket_service}</p>
            <p><strong>Escaladé par :</strong> ${escalated_by_name}</p>
            <p><strong>Assigné à :</strong> ${escalated_to_name}</p>
          </div>

          <div style="background-color: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0;">
            <p style="margin: 0;"><strong>📊 Escalade :</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 16px;">
              ${fromLabel} → ${toLabel}
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💬 Motif :</strong></p>
            <p style="margin: 10px 0 0 0;">${reason}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${ticketUrl}" 
               style="background: linear-gradient(to right, #2563eb, #1e40af); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;">
              Voir le ticket
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            HelpConfort Services • Système de support technique<br/>
            Ce ticket nécessite votre attention
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully to:", targetProfile.email, emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-escalation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
