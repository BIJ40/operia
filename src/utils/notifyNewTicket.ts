/**
 * Notify recipients when a new ticket is created.
 * Fire-and-forget: errors are logged but never block the caller.
 */
import { supabase } from "@/integrations/supabase/client";

interface NotifyTicketParams {
  ticket_id: string;
  ticket_number: number;
  subject: string;
  description?: string;
  heat_priority?: number;
  module?: string;
  created_from?: string;
  initiator_name?: string;
  initiator_email?: string;
}

export async function notifyNewTicket(params: NotifyTicketParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-new-ticket", {
      body: params,
    });
    if (error) {
      console.warn("[notifyNewTicket] Edge function error:", error);
    }
  } catch (err) {
    console.warn("[notifyNewTicket] Failed to send notification:", err);
  }
}
