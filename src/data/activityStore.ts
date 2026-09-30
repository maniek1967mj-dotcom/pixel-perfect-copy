import { useCallback, useEffect, useState } from "react";

export type ActivityType = "call" | "audit" | "meeting";
export type CallOutcome = "audyt" | "ponowny" | "oferta" | "odrzucony" | "nie_odbiera";
export const OUTCOMES: { id: CallOutcome; label: string; emoji: string }[] = [
  { id: "audyt", label: "Sukces / Umawiam Audyt Gemba", emoji: "✅" },
  { id: "ponowny", label: "Ponowny kontakt", emoji: "🔁" },
  { id: "oferta", label: "Oferta wysłana", emoji: "📨" },
  { id: "odrzucony", label: "Nie zainteresowany / Zły profil", emoji: "⛔" },
  { id: "nie_odbiera", label: "Nie odbiera", emoji: "📵" },
];
export const outcomeLabel = (o?: CallOutcome) => OUTCOMES.find((x) => x.id === o);

export interface Activity {
  id: string;
  type: ActivityType;
  deal_id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  note?: string;
  outcome?: CallOutcome;
  wasScheduled?: boolean;
  created_at: string;
}

export const ACTIVITIES_KEY = "crm.activities.v1";
const EVENT = "crm-activities-changed";

export function readActivities(): Activity[] {
  try { return JSON.parse(localStorage.getItem(ACTIVITIES_KEY) ?? "[]") as Activity[]; } catch { return []; }
}
function write(v: Activity[]) {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(v));
  window.dispatchEvent(new Event(EVENT));
}

export function useActivityStore() {
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => {
    const load = () => setActivities(readActivities());
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, []);
  const add = useCallback((a: Omit<Activity, "id" | "created_at">) => {
    write([{ ...a, id: Math.random().toString(36).slice(2) + Date.now().toString(36), created_at: new Date().toISOString() }, ...readActivities()]);
  }, []);
  const update = useCallback((id: string, data: Partial<Activity>) => write(readActivities().map((a) => (a.id === id ? { ...a, ...data } : a))), []);
  const remove = useCallback((id: string) => write(readActivities().filter((a) => a.id !== id)), []);
  return { activities, add, update, remove };
}
