import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// AllMySMS API configuration
const ALLMYSMS_API_URL = "https://api.allmysms.com/http/9.0/";
const ALLMYSMS_LOGIN = Deno.env.get('ALLMYSMS_LOGIN');
const ALLMYSMS_API_KEY = Deno.env.get('ALLMYSMS_API_KEY');
const ALLMYSMS_SUPPORT_PHONES = Deno.env.get('ALLMYSMS_SUPPORT_PHONES');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  ticketId: string;
  userName: string;
  lastQuestion: string;
  appUrl: string;
  category?: string;
  source?: string;
  agencySlug?: string;
  service?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify the user is authenticated and has admin or support role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's token to verify authentication
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { ticketId, userName, lastQuestion, appUrl, category, source, agencySlug, service }: NotificationRequest = await req.json();

    // Déterminer les rôles cibles en fonction du service
    let targetRoles = ['admin']; // Admin toujours notifié

    switch (service) {
      case 'apogee':
        targetRoles.push('support');
        break;
      case 'helpconfort':
      case 'apporteurs':
      case 'conseil':
        targetRoles.push('franchiseur');
        break;
      default: // 'autre' ou non défini
        targetRoles.push('support', 'franchiseur');
    }

    console.log(`Routing ticket to roles: ${targetRoles.join(', ')} based on service: ${service || 'autre'}`);

    // Récupérer les utilisateurs avec les rôles cibles
    const { data: supportUserRoles, error: usersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', targetRoles);

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

    // Récupérer les préférences de notifications des utilisateurs support
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, email_notifications_enabled')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Filtrer uniquement les utilisateurs qui ont activé les notifications email
    const usersWithNotificationsEnabled = profiles?.filter(p => p.email_notifications_enabled !== false) || [];
    
    if (usersWithNotificationsEnabled.length === 0) {
      console.log('No support users with email notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No support users with notifications enabled to notify' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supportEmails = usersWithNotificationsEnabled
      .map(p => p.email)
      .filter(email => email) as string[];

    if (supportEmails.length === 0) {
      console.log('No support emails found with notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No support emails with notifications enabled' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Sending notification to ${supportEmails.length} support users (with notifications enabled)`);

    // Déterminer le badge de source
    const sourceBadges = {
      chat: '💬 CHAT',
      portal: '🎫 PORTAIL',
      system: '🤖 SYSTÈME',
    };
    const sourceBadge = sourceBadges[source as keyof typeof sourceBadges] || '🎫 TICKET';

    // Déterminer le badge de catégorie
    const categoryLabels = {
      bug: '🐛 Bug',
      improvement: '💡 Amélioration',
      blocking: '🚫 Blocage',
      question: '❓ Question',
      other: '📝 Autre',
    };
    const categoryLabel = category ? categoryLabels[category as keyof typeof categoryLabels] : '';

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
            <p>Un utilisateur a créé un nouveau ticket support.</p>
            
            <div class="ticket-info">
              <p><strong>Utilisateur :</strong> ${userName}</p>
              <p><strong>Ticket :</strong> #${ticketId.substring(0, 8)}</p>
              <p><strong>Source :</strong> ${sourceBadge}</p>
              ${categoryLabel ? `<p><strong>Catégorie :</strong> ${categoryLabel}</p>` : ''}
              ${agencySlug ? `<p><strong>Agence :</strong> ${agencySlug}</p>` : ''}
              <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            
            <p><strong>Sujet / Dernière question :</strong></p>
            <div class="question-box">
              "${lastQuestion}"
            </div>
            
            <p style="text-align: center;">
              <a href="${appUrl}/admin/tickets" class="button">
                👉 Gérer les Tickets
              </a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Note :</strong> Accédez à la console de gestion des tickets pour voir tous les détails et répondre.
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
      from: 'HelpConfort Services <support@helpconfort.services>',
      to: supportEmails,
      subject: `🚨 Nouveau ticket ${sourceBadge} #${ticketId.substring(0, 8)} - ${userName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Notification emails sent successfully:', data);

    // Envoyer les SMS aux supports via AllMySMS
    let smsSent = 0;
    if (ALLMYSMS_LOGIN && ALLMYSMS_API_KEY && ALLMYSMS_SUPPORT_PHONES) {
      try {
        const supportPhones = ALLMYSMS_SUPPORT_PHONES.split(',').map(p => p.trim());
        const smsMessage = `🚨 Nouveau ticket ${sourceBadge} de ${userName}${agencySlug ? ` (${agencySlug})` : ''}: "${lastQuestion.substring(0, 80)}${lastQuestion.length > 80 ? '...' : ''}"\n\nRépondre: ${appUrl}/admin/tickets`;
        
        console.log(`Sending SMS to ${supportPhones.length} support phone(s)`);
        
        // Envoyer un SMS à chaque numéro de support
        const smsPromises = supportPhones.map(async (phone) => {
          const params = new URLSearchParams({
            login: ALLMYSMS_LOGIN!,
            apiKey: ALLMYSMS_API_KEY!,
            smsData: JSON.stringify({
              DATA: {
                MESSAGE: smsMessage,
                TPOA: "Helpogee",
                SMS: [{
                  MOBILEPHONE: phone
                }]
              }
            })
          });

          const response = await fetch(`${ALLMYSMS_API_URL}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            console.error(`Failed to send SMS to ${phone}:`, await response.text());
            return false;
          }

          const result = await response.json();
          console.log(`SMS sent to ${phone}:`, result);
          return true;
        });

        const results = await Promise.all(smsPromises);
        smsSent = results.filter(r => r === true).length;
        console.log(`${smsSent}/${supportPhones.length} SMS notifications sent successfully`);
      } catch (smsError) {
        console.error('Error sending SMS notifications:', smsError);
        // Continue même si les SMS échouent
      }
    } else {
      console.log('AllMySMS not configured, skipping SMS notifications');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: supportEmails.length,
        smsSent,
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
