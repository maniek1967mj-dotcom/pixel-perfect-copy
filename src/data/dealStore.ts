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

const KEY = "crm.deals.v1";
const now = () => new Date().toISOString();
const seed: Deal[] = [
  { id: "d1", title: "Wdrożenie Fabryka Smart - Hala Główna", company_id: "c1", contact_id: "p1", stage: "audyt_gemba", value: 150000, currency: "PLN", app_type: "Fabryka Smart", expected_close_date: "2026-11-30", notes: "Audyt Gemba zaplanowany na hali CNC.", created_at: now() },
  { id: "d2", title: "Monitoring linii spawalniczej", company_id: "c2", contact_id: "p3", stage: "propozycja", value: 280000, currency: "PLN", app_type: "Fabryka Smart", expected_close_date: "2026-12-15", notes: "Oferta dla linii Panasonic + malarnia.", created_at: now() },
  { id: "d3", title: "Asystent Restauracji - 8 lokali", company_id: "c3", contact_id: "p5", stage: "negocjacje", value: 45000, currency: "PLN", app_type: "Asystent Restauracji", expected_close_date: "2026-10-31", created_at: now() },
  { id: "d4", title: "CRM dla działu integracji", company_id: "c4", contact_id: "p6", stage: "kontakt", value: 12000, currency: "EUR", app_type: "CRM", expected_close_date: "2027-01-20", created_at: now() },
];

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
