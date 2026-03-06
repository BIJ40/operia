/**
 * Planning V2 — Ligne "heure actuelle"
 */

import { useState, useEffect } from "react";
import { HOUR_START, HOUR_END, HOUR_HEIGHT_PX } from "../../constants";

interface CurrentTimeLineProps {
  selectedDate: Date;
}

export function CurrentTimeLine({ selectedDate }: CurrentTimeLineProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // N'afficher que si c'est aujourd'hui
  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  if (!isToday) return null;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (currentHour < HOUR_START || currentHour > HOUR_END) return null;

  const top = (currentHour - HOUR_START) * HOUR_HEIGHT_PX;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
        <div className="h-[1.5px] flex-1 bg-destructive" />
      </div>
    </div>
  );
}
