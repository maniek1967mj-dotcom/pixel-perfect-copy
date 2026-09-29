import { useCallback, useEffect, useState } from "react";

export type Stage = "sygnal" | "kontakt" | "audyt_gemba" | "propozycja" | "negocjacje" | "wygrana" | "przegrana";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "sygnal", label: "Sygnał" },
  { id: "kontakt", label: "Kontakt" },
  { id: "audyt_gemba", label: "Audyt Gemba" },
  { id: "propozycja", label: "Propozycja" },
  { id: "negocjacje", label: "Negocjacje" },
  { id: "wygrana", label: "Wdrożenie / Wygrana" },
  { id: "przegrana", label: "Przegrana" },
];
export type DealAppType = "Fabryka Smart" | "Asystent Restauracji" | "CRM" | "Inne";
export const DEAL_APP_TYPES: DealAppType[] = ["Fabryka Smart", "Asystent Restauracji", "CRM", "Inne"];

export interface Deal {
  id: string;
  title: string;
  company_id: string;
  contact_id?: string;
  stage: Stage;
  value: number;
  currency: "PLN" | "EUR";
  app_type: DealAppType;
  expected_close_date: string;
  notes?: string;
  created_at: string;
}

/** Fixed rate used only to show pipeline totals in PLN. */
export const EUR_TO_PLN = 4.3;
export const toPLN = (d: Deal) => (d.currency === "EUR" ? d.value * EUR_TO_PLN : d.value);
export const formatMoney = (v: number, cur = "PLN") =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(v)} ${cur}`;

const KEY = "crm.deals.v2";
const now = () => new Date().toISOString();
const seed: Deal[] = [];

export function readDeals(): Deal[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Deal[]; } catch { /* ignore */ }
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}
export const writeDeals = (v: Deal[]) => localStorage.setItem(KEY, JSON.stringify(v));

export function useDealStore() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDeals(JSON.parse(raw) as Deal[]);
      else { localStorage.setItem(KEY, JSON.stringify(seed)); setDeals(seed); }
    } catch { setDeals(seed); }
    setReady(true);
  }, []);
  const save = useCallback((next: Deal[]) => { setDeals(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const upsert = (data: Omit<Deal, "id" | "created_at">, id?: string) => {
    if (id) save(deals.map((d) => (d.id === id ? { ...d, ...data } : d)));
    else save([...deals, { ...data, id: Math.random().toString(36).slice(2) + Date.now().toString(36), created_at: now() }]);
  };
  const move = (id: string, stage: Stage) => save(deals.map((d) => (d.id === id ? { ...d, stage } : d)));
  const remove = (id: string) => save(deals.filter((d) => d.id !== id));
  return { ready, deals, upsert, move, remove };
}
