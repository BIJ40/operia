/**
 * Test d'intégration : flux complet Centre d'aide
 * 
 * Scénarios couverts :
 * 1. Création ticket IA résolu → SUPPORT_RESOLU
 * 2. Création ticket IA escaladé → IA_ESCALADE
 * 3. Envoi réponse support sur le ticket
 * 4. Vérification réception côté user
 * 5. Réponse user et vérification
 * 6. Marquage comme lu
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "https://qvrankgpfltadxegeiky.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI";

// Test user credentials (from seeder)
const TEST_N5_EMAIL = "test-n5@helpconfort.test";
const TEST_N5_PASSWORD = "Test1234!";

// State shared between sequential tests
// deno-lint-ignore no-explicit-any
let supabase: any;
let userId: string;
const createdTicketIds: string[] = [];

// ─── Auth: login as test user ───────────────────────────────────
Deno.test("Setup: authenticate as test-n5", async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_N5_EMAIL,
    password: TEST_N5_PASSWORD,
  });

  assertExists(data.user, `Login failed: ${error?.message}`);
  userId = data.user.id;
  assert(userId.length > 0, "userId should be set");
});

// ─── S1: Ticket IA résolu → SUPPORT_RESOLU ──────────────────────
Deno.test("S1: Create ticket with status SUPPORT_RESOLU (AI resolved)", async () => {
  const { data, error } = await supabase
    .from("apogee_tickets")
    .insert({
      element_concerne: "[TEST-AUTO] [APOGÉE] [QUESTION] Comment exporter un devis ?",
      description: "📋 Domaine : Apogée\n📝 Type : Question\n💬 Question : Comment exporter ?\n🤖 Réponse IA : Allez dans Devis > Exporter\n📊 Résultat : Résolu par l'IA",
      kanban_status: "SUPPORT_RESOLU",
      created_from: "support",
      created_by_user_id: userId,
      support_initiator_user_id: userId,
      heat_priority: 3,
      reported_by: "AGENCE",
      is_urgent_support: false,
      initiator_profile: { first_name: "Test", last_name: "N5", email: TEST_N5_EMAIL, agence: "test" },
    })
    .select("id, ticket_number, kanban_status, reported_by, created_from")
    .single();

  assertExists(data, `Ticket creation failed: ${error?.message}`);
  createdTicketIds.push(data.id);

  assertEquals(data.kanban_status, "SUPPORT_RESOLU");
  assertEquals(data.reported_by, "AGENCE");
  assertEquals(data.created_from, "support");
  assert(data.ticket_number > 0, "ticket_number should be auto-generated");
});

// ─── S2: Ticket IA escaladé → IA_ESCALADE ──────────────────────
Deno.test("S2: Create ticket with status IA_ESCALADE (user still blocked)", async () => {
  const { data, error } = await supabase
    .from("apogee_tickets")
    .insert({
      element_concerne: "[TEST-AUTO] [APOGÉE] [BUG] Planning écran blanc",
      description: "📋 Domaine : Apogée\n📝 Type : Bug\n💬 Question : Le planning ne charge plus\n🤖 Réponse IA : Videz le cache\n📊 Résultat : Toujours bloqué",
      kanban_status: "IA_ESCALADE",
      created_from: "support",
      created_by_user_id: userId,
      support_initiator_user_id: userId,
      heat_priority: 10,
      reported_by: "AGENCE",
      is_urgent_support: true,
      impact_tags: ["BUG"],
      initiator_profile: { first_name: "Test", last_name: "N5", email: TEST_N5_EMAIL, agence: "test" },
    })
    .select("id, ticket_number, kanban_status, heat_priority, is_urgent_support")
    .single();

  assertExists(data, `Ticket creation failed: ${error?.message}`);
  createdTicketIds.push(data.id);

  assertEquals(data.kanban_status, "IA_ESCALADE");
  assertEquals(data.heat_priority, 10);
  assertEquals(data.is_urgent_support, true);
});

// ─── S3: Support voit le ticket escaladé ────────────────────────
Deno.test("S3: Escalated ticket is visible in query", async () => {
  const escalatedId = createdTicketIds[1];
  assertExists(escalatedId, "S2 ticket must exist first");

  const { data, error } = await supabase
    .from("apogee_tickets")
    .select("id, kanban_status, element_concerne, support_initiator_user_id")
    .eq("id", escalatedId)
    .single();

  assertExists(data, `Query failed: ${error?.message}`);
  assertEquals(data.kanban_status, "IA_ESCALADE");
  assertEquals(data.support_initiator_user_id, userId);
});

// ─── S4: Support envoie une réponse ─────────────────────────────
Deno.test("S4: Support sends a response on escalated ticket", async () => {
  const ticketId = createdTicketIds[1];
  assertExists(ticketId, "Escalated ticket must exist");

  const { data, error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .insert({
      ticket_id: ticketId,
      sender_user_id: userId,
      is_from_support: true,
      message: "[TEST-AUTO] Bonjour, nous avons identifié le problème. Pouvez-vous vider le cache ?",
    })
    .select("id, ticket_id, is_from_support, message")
    .single();

  assertExists(data, `Exchange creation failed: ${error?.message}`);
  assertEquals(data.is_from_support, true);
  assertEquals(data.ticket_id, ticketId);
  assert(data.message.length > 0);
});

// ─── S5: User voit la réponse support (non lue) ────────────────
Deno.test("S5: User can see support response (unread)", async () => {
  const ticketId = createdTicketIds[1];

  const { data: exchanges, error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  assertExists(exchanges, `Query failed: ${error?.message}`);
  assert(exchanges.length >= 1, "Should have at least 1 exchange");

  const supportMsg = exchanges.find((e: any) => e.is_from_support === true);
  assertExists(supportMsg, "Support message should exist");
  assertEquals(supportMsg.read_at, null, "Message should be unread");
});

// ─── S6: User répond au support ─────────────────────────────────
Deno.test("S6: User sends a reply to support", async () => {
  const ticketId = createdTicketIds[1];

  const { data, error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .insert({
      ticket_id: ticketId,
      sender_user_id: userId,
      is_from_support: false,
      message: "[TEST-AUTO] J'ai vidé le cache, le problème persiste toujours.",
    })
    .select("id, is_from_support")
    .single();

  assertExists(data, `Reply creation failed: ${error?.message}`);
  assertEquals(data.is_from_support, false);
});

// ─── S7: Vérification du fil complet ────────────────────────────
Deno.test("S7: Full exchange thread is ordered correctly", async () => {
  const ticketId = createdTicketIds[1];

  const { data: exchanges, error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  assertExists(exchanges, `Query failed: ${error?.message}`);
  assertEquals(exchanges.length, 2, "Should have 2 exchanges (support + user)");

  assertEquals(exchanges[0].is_from_support, true, "First message from support");
  assertEquals(exchanges[1].is_from_support, false, "Second message from user");

  assert(
    new Date(exchanges[0].created_at) <= new Date(exchanges[1].created_at),
    "Messages should be in chronological order"
  );
});

// ─── S8: Marquage comme lu ──────────────────────────────────────
Deno.test("S8: Mark support messages as read", async () => {
  const ticketId = createdTicketIds[1];

  const { data: unread } = await supabase
    .from("apogee_ticket_support_exchanges")
    .select("id")
    .eq("ticket_id", ticketId)
    .eq("is_from_support", true)
    .is("read_at", null);

  assertExists(unread);
  assert(unread.length > 0, "Should have unread support messages");

  const unreadIds = unread.map((e: any) => e.id);

  const { error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .update({ read_at: new Date().toISOString() })
    .in("id", unreadIds);

  assertEquals(error, null, `Mark as read failed: ${error?.message}`);

  const { data: afterRead } = await supabase
    .from("apogee_ticket_support_exchanges")
    .select("id, read_at")
    .eq("ticket_id", ticketId)
    .eq("is_from_support", true);

  assertExists(afterRead);
  for (const msg of afterRead) {
    assertExists(msg.read_at, "All support messages should be marked as read");
  }
});

// ─── S9: Ticket résolu n'a pas d'échanges ──────────────────────
Deno.test("S9: Resolved ticket has no exchanges", async () => {
  const resolvedTicketId = createdTicketIds[0];

  const { data: exchanges, error } = await supabase
    .from("apogee_ticket_support_exchanges")
    .select("id")
    .eq("ticket_id", resolvedTicketId);

  assertExists(exchanges, `Query failed: ${error?.message}`);
  assertEquals(exchanges.length, 0, "Resolved ticket should have no exchanges");
});

// ─── Cleanup ────────────────────────────────────────────────────
Deno.test("Cleanup: remove test tickets and exchanges", async () => {
  for (const id of createdTicketIds) {
    await supabase.from("apogee_ticket_support_exchanges").delete().eq("ticket_id", id);
    await supabase.from("apogee_ticket_attachments").delete().eq("ticket_id", id);
    await supabase.from("apogee_ticket_comments").delete().eq("ticket_id", id);
    await supabase.from("apogee_ticket_history").delete().eq("ticket_id", id);
    await supabase.from("apogee_ticket_views").delete().eq("ticket_id", id);
    await supabase.from("apogee_tickets").delete().eq("id", id);
  }

  // Verify cleanup
  for (const id of createdTicketIds) {
    const { data } = await supabase
      .from("apogee_tickets")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    assertEquals(data, null, `Ticket ${id} should be deleted`);
  }

  // Sign out
  await supabase.auth.signOut();
});
