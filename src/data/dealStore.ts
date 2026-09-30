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

export type Currency = "PLN" | "CZK" | "EUR";
export const CURRENCIES: Currency[] = ["PLN", "CZK", "EUR"];
export type Country = "PL" | "CZ" | "SK";
export const COUNTRIES: { id: Country; label: string; flag: string; currency: Currency }[] = [
  { id: "PL", label: "Polska", flag: "🇵🇱", currency: "PLN" },
  { id: "CZ", label: "Czechy", flag: "🇨🇿", currency: "CZK" },
  { id: "SK", label: "Słowacja", flag: "🇸🇰", currency: "EUR" },
];
export const flagOf = (c?: Country) => COUNTRIES.find((x) => x.id === (c ?? "PL"))?.flag ?? "🇵🇱";
export type TimeWindow = "0-7 days" | "8-14 days" | "15-30 days";
export const TIME_WINDOWS: { id: TimeWindow; label: string }[] = [
  { id: "0-7 days", label: "0-7 dni" }, { id: "8-14 days", label: "8-14 dni" }, { id: "15-30 days", label: "15-30 dni" },
];
export type Priority = "A" | "B" | "C" | "WATCH";
export const PRIORITIES: Priority[] = ["A", "B", "C", "WATCH"];
export type SuggestedOffer = "AUDYT" | "OPTYMALIZACJA" | "AUTOMATYZACJA" | "FABRYKA SMART" | "INTERIM" | "HYBRYDA";
export const OFFERS: SuggestedOffer[] = ["AUDYT", "OPTYMALIZACJA", "AUTOMATYZACJA", "FABRYKA SMART", "INTERIM", "HYBRYDA"];
export interface Scoring { t: number; p: number; f: number; a: number }

export interface Deal {
  id: string;
  title: string;
  company_id: string;
  contact_id?: string;
  stage: Stage;
  value: number;
  currency: Currency;
  app_type: DealAppType;
  expected_close_date: string;
  notes?: string;
  created_at: string;
  // AI Opportunity Hunter
  fact?: string;
  trigger?: string;
  hypothesis?: string;
  verificationQuestion?: string;
  firstAction?: string;
  scoring?: Scoring;
  timeWindow?: TimeWindow;
  priority?: Priority;
  suggestedOffer?: SuggestedOffer;
  followUpDate?: string;
  // CEE
  country?: Country;
  region?: string;
  languageNote?: string;
  remoteFirst?: boolean;
}

/** Fixed rates used only to show pipeline totals in PLN. */
export const EUR_TO_PLN = 4.3;
export const CZK_TO_PLN = 0.17;
export const toPLN = (d: Deal) => (d.currency === "EUR" ? d.value * EUR_TO_PLN : d.currency === "CZK" ? d.value * CZK_TO_PLN : d.value);
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
    if (id) { save(deals.map((d) => (d.id === id ? { ...d, ...data } : d))); return id; }
    const nid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    save([...deals, { ...data, id: nid, created_at: now() }]);
    return nid;
  };
  const move = (id: string, stage: Stage) => save(deals.map((d) => (d.id === id ? { ...d, stage } : d)));
  const remove = (id: string) => save(deals.filter((d) => d.id !== id));
  return { ready, deals, upsert, move, remove };
}
