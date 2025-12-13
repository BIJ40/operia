import type { ApogeeUser, PlanningCreneau, PlanningEvent } from "@/shared/types/apogeePlanning";

const fullName = (u: ApogeeUser) =>
  `${(u.firstname ?? "").trim()} ${(u.name ?? "").trim()}`.trim() || `#${u.id}`;

export function buildUserMap(users: ApogeeUser[]) {
  const map = new Map<number, { label: string; color?: string; type?: string }>();
  for (const u of users ?? []) {
    map.set(u.id, {
      label: fullName(u),
      color: u.data?.bgcolor?.hex8 ?? u.data?.bgcolor?.hex ?? undefined,
      type: u.type ?? undefined,
    });
  }
  return map;
}

export function toEvents(creneaux: PlanningCreneau[], userMap: ReturnType<typeof buildUserMap>): PlanningEvent[] {
  const out: PlanningEvent[] = [];
  for (const c of creneaux ?? []) {
    const start = new Date(c.date);
    const end = new Date(start.getTime() + Number(c.duree) * 60_000);
    for (const uid of c.usersIds ?? []) {
      const u = userMap.get(uid);
      out.push({
        id: `${c.id}:${uid}`,
        refType: String(c.refType ?? ""),
        start,
        end,
        userId: uid,
        title: u?.label ?? `User #${uid}`,
        color: u?.color,
        creneauId: c.id,
        dureeMin: Number(c.duree),
      });
    }
  }
  return out;
}
