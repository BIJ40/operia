/**
 * Planning V2 — Axe horaire sticky (07:00 → 19:00)
 */

import { HOUR_START, HOUR_END, HOUR_HEIGHT_PX } from "../../constants";

export function TimeAxis() {
  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i
  );

  return (
    <>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute w-full flex items-start justify-center"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
        >
          <span className="text-[10px] font-medium text-muted-foreground mt-[-6px] select-none">
            {String(h).padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </>
  );
}
