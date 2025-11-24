import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  ticketId: string;
  userPseudo: string;
  lastQuestion: string;
  appUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticketId, userPseudo, lastQuestion, appUrl }: NotificationRequest = await req.json();

    // Récupérer tous les utilisateurs avec le rôle "support" ou "admin"
    const { data: supportUserRoles, error: usersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'support']);

    if (usersError) throw usersError;

    if (!supportUserRoles || supportUserRoles.length === 0) {
      console.log('No support users found');
      return new Response(
        JSON.stringify({ message: 'No support users to notify' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer les user IDs
    const userIds = supportUserRoles.map(ur => ur.user_id);

    // Récupérer les emails des utilisateurs support depuis auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const supportEmails = authUsers.users
      .filter(user => userIds.includes(user.id))
      .map(user => user.email)
      .filter(email => email) as string[];

    if (supportEmails.length === 0) {
      console.log('No support emails found');
      return new Response(
        JSON.stringify({ message: 'No support emails to notify' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Sending notification to ${supportEmails.length} support users`);

    // Envoyer l'email avec un template HTML personnalisé
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .badge {
              display: inline-block;
              background: #ef4444;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              margin-top: 10px;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .ticket-info {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .ticket-info p {
              margin: 10px 0;
            }
            .ticket-info strong {
              color: #667eea;
            }
            .question-box {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              border-radius: 6px;
              margin: 15px 0;
              font-style: italic;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background: #5568d3;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚨 Nouvelle Demande Support</h1>
            <span class="badge">URGENT</span>
          </div>
          
          <div class="content">
            <p>Bonjour,</p>
            <p>Un utilisateur a demandé à parler à un conseiller.</p>
            
            <div class="ticket-info">
              <p><strong>Utilisateur :</strong> ${userPseudo}</p>
              <p><strong>Ticket :</strong> #${ticketId.substring(0, 8)}</p>
              <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            
            <p><strong>Dernière question :</strong></p>
            <div class="question-box">
              "${lastQuestion}"
            </div>
            
            <p style="text-align: center;">
              <a href="${appUrl}/admin/support?ticket=${ticketId}" class="button">
                👉 Répondre Maintenant
              </a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Note :</strong> Le premier à prendre en charge ce ticket sera assigné automatiquement.
            </p>
          </div>
          
          <div class="footer">
            <p>Helpogée Support System</p>
            <p>Cet email a été envoyé automatiquement. Ne pas répondre.</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Helpogée Support <onboarding@resend.dev>',
      to: supportEmails,
      subject: `🚨 Nouveau ticket support #${ticketId.substring(0, 8)} - ${userPseudo}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Notification emails sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: supportEmails.length,
        emailIds: data 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in notify-support-ticket function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
