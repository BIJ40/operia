import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// AllMySMS API configuration
const ALLMYSMS_API_URL = "https://api.allmysms.com/http/9.0/";
const ALLMYSMS_LOGIN = Deno.env.get('ALLMYSMS_LOGIN');
const ALLMYSMS_API_KEY = Deno.env.get('ALLMYSMS_API_KEY');
const ALLMYSMS_SUPPORT_PHONES = Deno.env.get('ALLMYSMS_SUPPORT_PHONES');

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

interface NotificationSettings {
  sms_enabled: boolean;
  email_enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // Security: Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
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
      return withCors(req, new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Rate limit: 10 req/min per user
    const rateLimitKey = `notify-support-ticket:${user.id}`;
    const rateCheck = await checkRateLimit(rateLimitKey, { limit: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[NOTIFY-SUPPORT-TICKET] Rate limit exceeded for ${rateLimitKey}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    // Create admin client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch notification settings from database
    const { data: settingsData } = await supabase
      .from('app_notification_settings')
      .select('sms_enabled, email_enabled')
      .eq('id', 'default')
      .single();
    
    const notificationSettings: NotificationSettings = settingsData || { sms_enabled: true, email_enabled: true };
    console.log(`[NOTIFY-SUPPORT-TICKET] Settings: SMS=${notificationSettings.sms_enabled}, Email=${notificationSettings.email_enabled}`);

    // Early exit if both notifications are disabled
    if (!notificationSettings.sms_enabled && !notificationSettings.email_enabled) {
      console.log('[NOTIFY-SUPPORT-TICKET] All notifications disabled');
      return withCors(req, new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled', emailsSent: 0, smsSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { ticketId, userName, lastQuestion, appUrl, category, source, agencySlug, service }: NotificationRequest = await req.json();

    console.log(`Processing ticket notification for service: ${service || 'autre'}`);

    // V2: Get support users based on global_role and enabled_modules
    // platform_admin (N5) and superadmin (N6) always receive notifications
    // Users with enabled_modules.support.enabled = true also receive notifications
    let supportEmails: string[] = [];
    
    // Only fetch profiles if email notifications are enabled
    if (notificationSettings.email_enabled) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, email_notifications_enabled, global_role, enabled_modules')
        .eq('is_active', true);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Don't throw - continue with SMS only
      } else {
        // Filter users who should receive support notifications:
        // 1. Must be a support agent (support.agent flag) OR admin (N5/N6)
        // 2. For admins: receive by default unless explicitly opted out (email_notifications_enabled === false)
        // 3. For agents: must have email_notifications_enabled = true (explicit opt-in)
        const supportAgents = profiles?.filter(p => {
          const isAdmin = p.global_role === 'platform_admin' || p.global_role === 'superadmin';
          const isSupportAgent = p.enabled_modules?.support?.agent === true;
          
          if (!isAdmin && !isSupportAgent) return false;
          
          // P1 FIX: Admins receive notifications by default (unless explicitly disabled)
          // Agents must explicitly enable notifications
          if (isAdmin) {
            return p.email_notifications_enabled !== false;
          } else {
            return p.email_notifications_enabled === true;
          }
        }) || [];

        console.log(`Found ${supportAgents.length} support agents for email notifications`);
        supportEmails = supportAgents.map(p => p.email).filter(email => email) as string[];
      }
    }

    // IMPORTANT: SMS uses ALLMYSMS_SUPPORT_PHONES env variable, NOT database agents
    // So we should NOT early-exit if no email agents are found - SMS can still work
    const hasSmsConfig = notificationSettings.sms_enabled && ALLMYSMS_LOGIN && ALLMYSMS_API_KEY && ALLMYSMS_SUPPORT_PHONES;
    const hasEmailRecipients = notificationSettings.email_enabled && supportEmails.length > 0;

    if (!hasSmsConfig && !hasEmailRecipients) {
      console.log('No notification channels available: no emails and SMS not configured');
      return withCors(req, new Response(
        JSON.stringify({ message: 'No notification channels available' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    console.log(`Notification channels: Email=${hasEmailRecipients ? supportEmails.length : 0}, SMS=${hasSmsConfig ? 'configured' : 'not configured'}`);

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

    // Service label
    const serviceLabels: Record<string, string> = {
      apogee: 'Apogée',
      helpconfort: 'HelpConfort',
      apporteurs: 'Apporteurs',
      conseil: 'Conseil',
      autre: 'Autre',
    };
    const serviceLabel = service ? serviceLabels[service] || service : '';

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
              ${serviceLabel ? `<p><strong>Service :</strong> ${serviceLabel}</p>` : ''}
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

    let emailsSent = 0;
    let emailData = null;
    let emailError: Error | null = null;
    
    // Send emails only if email notifications are enabled AND we have recipients
    if (hasEmailRecipients) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'HelpConfort Services <support@helpconfort.services>',
          to: supportEmails,
          subject: `🚨 Nouveau ticket ${sourceBadge} #${ticketId.substring(0, 8)} - ${userName}`,
          html: emailHtml,
        });

        if (error) {
          console.error('[NOTIFY-SUPPORT-TICKET] Email send error:', error);
          emailError = new Error(error.message || 'Email send failed');
        } else {
          console.log('[NOTIFY-SUPPORT-TICKET] Email sent successfully:', data);
          emailsSent = supportEmails.length;
          emailData = data;
        }
      } catch (err) {
        console.error('[NOTIFY-SUPPORT-TICKET] Email exception:', err);
        emailError = err instanceof Error ? err : new Error('Unknown email error');
      }
    } else {
      console.log('[NOTIFY-SUPPORT-TICKET] Email skipped: disabled or no recipients');
    }

    // Envoyer les SMS aux supports via AllMySMS
    let smsSent = 0;
    let smsError: Error | null = null;
    
    if (notificationSettings.sms_enabled && ALLMYSMS_LOGIN && ALLMYSMS_API_KEY && ALLMYSMS_SUPPORT_PHONES) {
      try {
        const supportPhones = ALLMYSMS_SUPPORT_PHONES.split(',').map(p => p.trim());
        const smsMessage = `🚨 Nouveau ticket ${sourceBadge} de ${userName}${agencySlug ? ` (${agencySlug})` : ''}: "${lastQuestion.substring(0, 80)}${lastQuestion.length > 80 ? '...' : ''}"`;
        
        console.log(`[NOTIFY-SUPPORT-TICKET] Sending SMS to ${supportPhones.length} phone(s)`);
        
        // Envoyer un SMS à chaque numéro de support avec timeout
        const smsPromises = supportPhones.map(async (phone) => {
          const smsData = {
            DATA: {
              MESSAGE: smsMessage,
              TPOA: "Helpogee",
              SMS: [{
                MOBILEPHONE: phone
              }]
            }
          };

          const params = new URLSearchParams({
            login: ALLMYSMS_LOGIN!,
            apiKey: ALLMYSMS_API_KEY!,
            smsData: JSON.stringify(smsData),
            returnformat: 'json'
          });

          console.log(`[AllMySMS] Sending to ${phone.substring(0, 4)}***`);
          
          // Add timeout to SMS requests (10 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            const response = await fetch(`${ALLMYSMS_API_URL}sendSms?${params.toString()}`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            const responseText = await response.text();
            console.log(`[AllMySMS] Response for ${phone.substring(0, 4)}***:`, responseText);

            if (!response.ok) {
              console.error(`[AllMySMS] Failed to send SMS to ${phone}:`, responseText);
              return false;
            }

            try {
              const result = JSON.parse(responseText);
              return result.status === 100 || result.status === '100' || response.ok;
            } catch {
              return response.ok;
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.error(`[AllMySMS] Timeout sending SMS to ${phone}`);
            } else {
              console.error(`[AllMySMS] Error sending SMS to ${phone}:`, fetchError);
            }
            return false;
          }
        });

        const results = await Promise.all(smsPromises);
        smsSent = results.filter(r => r === true).length;
        console.log(`[NOTIFY-SUPPORT-TICKET] ${smsSent}/${supportPhones.length} SMS sent successfully`);
      } catch (err) {
        console.error('[NOTIFY-SUPPORT-TICKET] SMS batch error:', err);
        smsError = err instanceof Error ? err : new Error('Unknown SMS error');
      }
    } else if (!notificationSettings.sms_enabled) {
      console.log('[NOTIFY-SUPPORT-TICKET] SMS notifications disabled, skipping');
    } else {
      console.log('[NOTIFY-SUPPORT-TICKET] AllMySMS not configured, skipping SMS');
      console.log(`Config check: LOGIN=${!!ALLMYSMS_LOGIN}, KEY=${!!ALLMYSMS_API_KEY}, PHONES=${!!ALLMYSMS_SUPPORT_PHONES}`);
    }

    // Return partial success even if one channel failed
    const partialFailure = (emailError && !smsError) || (!emailError && smsError);
    const totalFailure = emailError && smsError && emailsSent === 0 && smsSent === 0;
    
    if (totalFailure) {
      console.error('[NOTIFY-SUPPORT-TICKET] All notification channels failed');
      return withCors(req, new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All notification channels failed',
          emailError: emailError?.message,
          smsError: smsError?.message,
          emailsSent: 0,
          smsSent: 0
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        partialFailure,
        emailsSent,
        smsSent,
        emailIds: emailData,
        warnings: [
          emailError ? `Email: ${emailError.message}` : null,
          smsError ? `SMS: ${smsError.message}` : null
        ].filter(Boolean)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    console.error('[NOTIFY-SUPPORT-TICKET] Critical error:', error);
    return withCors(req, new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        emailsSent: 0,
        smsSent: 0
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
