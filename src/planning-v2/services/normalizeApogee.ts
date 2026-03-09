/**
 * Planning V2 — Normalisation des données Apogée
 * Point d'entrée unique : transforme les 5 jeux bruts en modèle interne
 * Réutilise unwrapArray, isActiveUser de shared/planning/normalize
 */

import { unwrapArray, isActiveUser } from "@/shared/planning/normalize";
import { DEFAULT_TECH_COLOR, DURATION_FALLBACK, BLOCK_LABELS } from "../constants";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningUnscheduled,
  NormalizedPlanningData,
  BlockType,
  AppointmentPriority,
} from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function parseNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(',', '.').trim());
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Extrait les heures depuis le chiffrage d'une intervention
 * (postes[].items[].data.nbHeures/nbTechs avec fallback dFields)
 */
function extractChiffrageInfo(intervention: RawIntervention): { hours: number; passages: number } {
  const chiffrage = (intervention.data as any)?.chiffrage;
  if (!chiffrage?.postes || !Array.isArray(chiffrage.postes)) return { hours: 0, passages: 0 };

  let totalHeures = 0;
  let blocksCount = 0;
  for (const poste of chiffrage.postes) {
    for (const item of poste?.items || []) {
      if (!item?.IS_BLOCK || item?.slug !== 'chiffrage') continue;
      const data = item.data || {};
      let nbHeures = parseNum(data.nbHeures);

      if (nbHeures === 0) {
        for (const sub of data.subItems || []) {
          if (!sub?.IS_BLOCK || sub?.slug !== 'dfields') continue;
          for (const df of sub.data?.dFields || []) {
            const slug = String(df.EXPORT_generiqueSlug || '').toLowerCase();
            if (slug.includes("temps_total d'intervention") || slug.includes("temps_total_d'intervention") || slug.includes('temps_total')) {
              const val = parseNum(df.value);
              if (val > 0) { nbHeures = val; break; }
            }
          }
          if (nbHeures > 0) break;
        }
      }
      if (nbHeures > 0) {
        totalHeures += nbHeures;
        blocksCount++;
      }
    }
  }
  return { hours: totalHeures, passages: blocksCount };
}

function extractColor(u: Record<string, unknown>): string {
  const data = u.data as Record<string, unknown> | undefined;
  const bgcolor = data?.bgcolor as Record<string, string> | undefined;
  return (
    bgcolor?.hex ||
    (u.bgcolor as Record<string, string> | undefined)?.hex ||
    (data?.color as Record<string, string> | undefined)?.hex ||
    (u.color as Record<string, string> | undefined)?.hex ||
    DEFAULT_TECH_COLOR
  );
}

function buildInitials(firstname: string, name: string): string {
  const f = firstname.charAt(0).toUpperCase();
  const n = name.charAt(0).toUpperCase();
  return `${f}${n}` || "??";
}

function isTechnicienUser(u: Record<string, unknown>): boolean {
  const type = norm(u.type);
  const data = u.data as Record<string, unknown> | undefined;
  const universes = data?.universes;
  const hasUniverses = Array.isArray(universes) && universes.length > 0;
  return (
    u.isTechnicien === true ||
    type === "technicien" ||
    (type === "utilisateur" && hasUniverses)
  );
}

function safeDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function resolveInterventionType(raw: string | undefined): string {
  if (!raw) return "default";
  const n = norm(raw);
  if (n.includes("depan") || n.includes("dépan")) return "depannage";
  if (n.includes("travaux") || n === "tvx") return "travaux";
  if (n.includes("sav")) return "sav";
  if (n.includes("diagnostic") || n.includes("diag")) return "diagnostic";
  if (n === "rt" || n.includes("rdvtech") || n.includes("releve")) return "rt";
  if (n === "th") return "th";
  return raw;
}

function resolveBlockType(refType: string): BlockType {
  const n = norm(refType);
  if (n === "conge") return "conge";
  if (n === "absence") return "absence";
  if (n === "repos") return "repos";
  if (n === "rappel") return "rappel";
  if (n === "tache") return "tache";
  if (n === "formation") return "formation";
  if (n === "atelier") return "atelier";
  return "tache";
}

// ─── Raw types pour le mapping ──────────────────────────────────────────────

interface RawIntervention {
  id: number;
  projectId?: number;
  type?: string;
  type2?: string;
  state?: string;
  label?: string;
  data?: {
    visites?: Array<{
      pEventId?: number;
      date?: string;
      usersIds?: number[];
      type?: string;
      type2?: string;
      state?: string;
    }>;
    dureeEstimee?: number;
    priorite?: string;
    competences?: string[];
    motifAttente?: string;
  };
}

interface RawProject {
  id: number;
  ref?: string;
  clientId?: number;
  state?: string;
  label?: string;
  data?: {
    commanditaireId?: number;
    universes?: string[];
    pictosInterv?: string[];
    description?: string;
  };
}

interface RawClient {
  id: number;
  nom?: string;
  prenom?: string;
  ville?: string;
  city?: string;
  address?: string;
  adresse?: string;
  cp?: string;
  codePostal?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

interface RawPlanningCreneau {
  id: number;
  refType?: string;
  date?: string;
  duree?: number;
  usersIds?: number[];
  label?: string;
  title?: string;
  objet?: string;
}

// ─── Normalisation principale ───────────────────────────────────────────────

export function normalizeApogeeData(
  rawCreneaux: unknown,
  rawInterventions: unknown,
  rawProjects: unknown,
  rawClients: unknown,
  rawUsers: unknown
): NormalizedPlanningData {
  const creneaux = unwrapArray(rawCreneaux) as RawPlanningCreneau[];
  const interventions = unwrapArray(rawInterventions) as RawIntervention[];
  const projects = unwrapArray(rawProjects) as RawProject[];
  const clients = unwrapArray(rawClients) as RawClient[];
  const users = unwrapArray(rawUsers);

  // ── Maps de jointure ──
  const projectMap = new Map<number, RawProject>();
  projects.forEach((p) => projectMap.set(p.id, p));

  const clientMap = new Map<number, RawClient>();
  clients.forEach((c) => clientMap.set(c.id, c));

  // pEventId → intervention + visite
  const pEventToInterv = new Map<number, RawIntervention>();
  const pEventToVisite = new Map<number, { type?: string; type2?: string }>();
  for (const interv of interventions) {
    for (const v of interv.data?.visites ?? []) {
      if (v.pEventId) {
        pEventToInterv.set(v.pEventId, interv);
        pEventToVisite.set(v.pEventId, { type: v.type, type2: v.type2 });
      }
    }
  }

  // ── Techniciens ──
  const technicians = normalizeTechnicians(users);

  // ── Appointments + Blocks ──
  const appointments: PlanningAppointment[] = [];
  const blocks: PlanningBlock[] = [];

  for (const c of creneaux) {
    if (!c.date || !c.duree || !c.usersIds?.length) continue;
    const start = safeDate(c.date);
    if (!start) continue;
    const end = new Date(start.getTime() + c.duree * 60_000);

    if (c.refType === "visite-interv") {
      const interv = pEventToInterv.get(c.id);
      const visite = pEventToVisite.get(c.id);
      const project = interv?.projectId ? projectMap.get(interv.projectId) : undefined;
      const client = project?.clientId ? clientMap.get(project.clientId) : undefined;

      const rawType = visite?.type2 || visite?.type || interv?.type2 || interv?.type;
      const type = resolveInterventionType(rawType);
      const duration = c.duree || DURATION_FALLBACK[type] || DURATION_FALLBACK.default;

      let clientName = "Inconnu";
      if (client) {
        const p = (client.prenom || "").trim();
        const n = (client.nom || "").trim();
        clientName = `${p} ${n}`.trim() || "Inconnu";
      }

      // Resolve apporteur name from commanditaireId
      let apporteurName: string | null = null;
      const commanditaireId = project?.data?.commanditaireId;
      if (commanditaireId) {
        const apporteurClient = clientMap.get(commanditaireId);
        if (apporteurClient) {
          apporteurName = [apporteurClient.prenom, apporteurClient.nom].filter(Boolean).join(" ").trim() || null;
        }
      }

      appointments.push({
        id: `appt-${c.id}`,
        apogeeId: c.id,
        dossierId: interv?.projectId ?? null,
        clientId: project?.clientId ?? null,
        client: clientName,
        address: client?.address || client?.adresse || null,
        postalCode: client?.cp || client?.codePostal || null,
        city: client?.ville || client?.city || null,
        latitude: client?.latitude ?? client?.lat ?? null,
        longitude: client?.longitude ?? client?.lng ?? null,
        start,
        end,
        durationMinutes: duration,
        universe: project?.data?.universes?.[0] ?? null,
        type,
        priority: "normal" as AppointmentPriority,
        technicianIds: c.usersIds.map(Number),
        status: "planned",
        confirmed: true,
        isBinome: c.usersIds.length > 1,
        apporteur: apporteurName,
        requiredSkills: [],
        notes: null,
        projectRef: project?.ref ?? null,
        updatedAt: null,
        pictosInterv: (project?.data?.pictosInterv ?? []).map((p: any) => String(p)),
        description: project?.data?.description || project?.label || null,
        projectState: project?.state ?? null,
        interventionLabel: interv?.label ?? null,
      });
    } else {
      // Block (congé, tâche, absence, rappel…)
      const blockType = resolveBlockType(c.refType || "tache");
      for (const uid of c.usersIds) {
        blocks.push({
          id: `block-${c.id}-${uid}`,
          techId: uid,
          type: blockType,
          start,
          end,
          label: c.label || c.title || c.objet || BLOCK_LABELS[blockType] || c.refType || "Bloc",
          color: null,
          source: "apogee",
        });
      }
    }
  }

  // ── Unscheduled: projets à planifier (filtrage par STATE du PROJET, pas de l'intervention) ──
  // Logique alignée sur usePlanningData (planif IA) :
  //   - project.state === "new" → premier RDV à planifier
  //   - project.state === "to_planify_tvx" → travaux à planifier
  //     SAUF si le projet a déjà une intervention TVX planifiée

  // 1. Collecter les projectIds qui ont déjà une intervention TVX planifiée/validée
  const projectsWithPlannedTvx = new Set<number>();
  for (const interv of interventions) {
    const typeN = norm(interv.type2 || interv.type);
    const stateN = norm(interv.state);
    const isTvx = typeN.includes("travaux") || typeN.includes("tvx") || typeN.includes("work");
    const isPlanned = stateN.includes("planned") || stateN.includes("planifi") ||
      stateN.includes("validated") || stateN.includes("done") ||
      stateN.includes("in_progress") || stateN.includes("finished");
    if (isTvx && isPlanned && interv.projectId) {
      projectsWithPlannedTvx.add(interv.projectId);
    }
  }

  // 2. Identifier les projets planifiables
  const PLANIFIABLE_PROJECT_STATES = new Set(["new", "to_planify_tvx"]);
  const planifiableProjectIds = new Set<number>();
  for (const [pid, proj] of projectMap.entries()) {
    const stateN = norm(proj.state);
    if (!PLANIFIABLE_PROJECT_STATES.has(stateN)) continue;
    if (stateN === "to_planify_tvx" && projectsWithPlannedTvx.has(pid)) continue;
    planifiableProjectIds.add(pid);
  }

  // 3. Construire UNE entrée par projet planifiable (pas par intervention)
  const unscheduled: PlanningUnscheduled[] = [];

  for (const pid of planifiableProjectIds) {
    const project = projectMap.get(pid);
    if (!project) continue;
    const client = project.clientId ? clientMap.get(project.clientId) : undefined;

    let clientName = "Inconnu";
    if (client) {
      const p = (client.prenom || "").trim();
      const n = (client.nom || "").trim();
      clientName = `${p} ${n}`.trim() || "Inconnu";
    }

    // Aggregate info from project's interventions for duration/priority
    const projectIntervs = interventions.filter(i => i.projectId === pid);
    let estimatedDuration = DURATION_FALLBACK.default;
    let estimatedPassages: number | null = null;
    let priority: AppointmentPriority = "normal";
    let reason: PlanningUnscheduled["reason"] = "a_planifier";

    if (projectIntervs.length > 0) {
      const mainInterv = projectIntervs[0];
      const rawType = mainInterv.type2 || mainInterv.type;
      const type = resolveInterventionType(rawType);

      // Priorité durée : 1) chiffrage postes  2) project.nbHeures  3) dureeEstimee  4) fallback type
      let chiffrageH = 0;
      let chiffragePassages = 0;
      for (const itv of projectIntervs) {
        const info = extractChiffrageInfo(itv);
        chiffrageH += info.hours;
        chiffragePassages += info.passages;
      }

      if (chiffrageH > 0) {
        estimatedDuration = chiffrageH * 60; // heures → minutes
        estimatedPassages = chiffragePassages > 1 ? chiffragePassages : null;
      } else {
        const projData = project.data as Record<string, unknown> | undefined;
        const nbHeures = parseNum(projData?.nbHeures);
        if (nbHeures > 0) {
          estimatedDuration = nbHeures * 60;
        } else {
          estimatedDuration = mainInterv.data?.dureeEstimee || DURATION_FALLBACK[type] || DURATION_FALLBACK.default;
        }
      }

      const prioriteN = norm(mainInterv.data?.priorite);
      if (prioriteN === "urgent" || prioriteN === "urgente") priority = "urgent";
      else if (prioriteN === "haute" || prioriteN === "high") priority = "high";
      else if (prioriteN === "basse" || prioriteN === "low") priority = "low";

      const motif = norm(mainInterv.data?.motifAttente);
      if (prioriteN === "urgent" || prioriteN === "urgente") reason = "urgent";
      else if (motif.includes("client")) reason = "en_attente_client";
      else if (motif.includes("piece") || motif.includes("pièce")) reason = "en_attente_piece";
      else if (motif.includes("devis")) reason = "en_attente_devis";
    }

    unscheduled.push({
      id: `unsched-proj-${pid}`,
      apogeeId: pid,
      dossierId: pid,
      client: clientName,
      city: client?.ville || client?.city || null,
      universe: project.data?.universes?.[0] ?? null,
      priority,
      estimatedDuration,
      requiredSkills: [],
      reason,
      dueDate: null,
      status: project.state || "unknown",
      apporteur: null,
    });
  }

  return { technicians, appointments, blocks, unscheduled };
}

// ─── Normalisation techniciens ──────────────────────────────────────────────

function normalizeTechnicians(rawUsers: unknown[]): PlanningTechnician[] {
  return rawUsers
    .filter((u) => {
      const obj = u as Record<string, unknown>;
      return isTechnicienUser(obj) && isActiveUser(obj);
    })
    .map((u, index) => {
      const obj = u as Record<string, unknown>;
      const firstname = String(obj.firstname ?? "").trim();
      const name = String(obj.name ?? "").trim();
      const data = obj.data as Record<string, unknown> | undefined;
      const universes = (data?.universes as string[]) ?? [];

      return {
        id: Number(obj.id),
        apogeeId: Number(obj.id),
        name: `${firstname} ${name}`.trim() || `Tech #${obj.id}`,
        initials: buildInitials(firstname, name),
        color: extractColor(obj),
        skills: [],
        univers: universes,
        workStart: "07:00",
        workEnd: "18:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        active: true,
        homeSector: null,
        latitude: null,
        longitude: null,
        maxDailyMinutes: 420,
        maxRouteMinutes: 120,
        order: index,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
