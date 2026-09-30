export type SourceTable = "MARIUSZ_INTERIM" | "FABRYKA_SMART";
export type SuggestedApp = "Fabryka Smart" | "Interim Mariusz" | "CRM";

export interface ParsedLead {
  key: string;
  source_table: SourceTable;
  company_name: string;
  location: string;
  industry: string;
  signal_fact: string;
  hypothesis_pain: string;
  contact_person?: string;
  fit_score?: string;
  source_url?: string;
  suggested_app: SuggestedApp;
  lead_type: "ZATRUDNIENIE / KONSULTING" | "APLIKACJA A1";
  suggested_offer: "INTERIM / KIEROWNIK / AUDYT" | "FABRYKA SMART A1";
  // AI Opportunity Hunter
  trigger?: string;
  verification_question?: string;
  first_action?: string;
  scoring?: { t: number; p: number; f: number; a: number };
  priority?: "A" | "B" | "C" | "WATCH";
  offer?: "AUDYT" | "OPTYMALIZACJA" | "AUTOMATYZACJA" | "FABRYKA SMART" | "INTERIM" | "HYBRYDA";
  time_window?: "0-7 days" | "8-14 days" | "15-30 days";
  country?: "PL" | "CZ" | "SK";
  currency?: "PLN" | "CZK" | "EUR";
  region?: string;
  language_note?: string;
  remote_first?: boolean;
  phone?: string;
  email?: string;
  value?: number;
}

type Field =
  | "company_name" | "location" | "industry" | "signal_fact" | "hypothesis_pain" | "contact_person" | "fit_score" | "source_url" | "app"
  | "trigger" | "question" | "first_action" | "t" | "p" | "f" | "a" | "tpfa" | "priority" | "offer" | "time_window"
  | "country" | "currency" | "region" | "language" | "remote" | "phone" | "email" | "value";

// Header keywords (lowercase, no diacritics) -> field. Order matters: first match wins.
const HEADER_MAP: [RegExp, Field][] = [
  [/^t\s*\/\s*p\s*\/\s*f\s*\/\s*a|^tpfa|scoring t/, "tpfa"],
  [/^t$|^t \(|timing/, "t"],
  [/^p$|^p \(|pain score/, "p"],
  [/^f$|^f \(|^fit$/, "f"],
  [/^a$|^a \(|access/, "a"],
  [/pytanie|haczyk|verification|question/, "question"],
  [/pierwsza akcja|first action|^akcja|next step/, "first_action"],
  [/trigger|wyzwalacz/, "trigger"],
  [/priorytet|priority/, "priority"],
  [/okno|time window|termin/, "time_window"],
  [/^kraj|country|panstwo/, "country"],
  [/currency|waluta/, "currency"],
  [/region|wojewodztwo|kraj \(region\)/, "region"],
  [/language|jezyk/, "language"],
  [/remote|zdaln/, "remote"],
  [/telefon|phone|tel\b/, "phone"],
  [/e-?mail/, "email"],
  [/wartosc|value|budzet/, "value"],
  [/^offer|oferta|suggested offer/, "offer"],
  [/hipotez|bol|problem|pain/, "hypothesis_pain"],
  [/rekomendacja|fakt|sygnal|signal|zdarzenie/, "signal_fact"],
  [/firma|podmiot|spolka|company|nazwa/, "company_name"],
  [/lokaliz|miasto|location|siedziba/, "location"],
  [/^rola|zlecenie|branz|sektor|industry/, "industry"],
  [/kontakt|namiar|osoba|decydent|contact/, "contact_person"],
  [/fit|dopasow|sila|ocena|score|scoring/, "fit_score"],
  [/link|zrodl|url|source/, "source_url"],
  [/aplikac|produkt|app|oferta/, "app"],
];

const norm = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
const stripMd = (s: string) => s.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2").trim();
const URL_RE = /https?:\/\/[^\s)|<>\]]+/;
const EMPTY = /^(-|—|–|brak|n\/a|b\/d|\?)?$/i;

function splitRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

function detectTable(heading: string): SourceTable | null {
  const h = norm(heading);
  if (/tabela\s*b|fabryka\s*smart|sygnaly\s*sprzedazowe/.test(h)) return "FABRYKA_SMART";
  if (/tabela\s*a|mariusz|interim|leady\s*operacyjne|rekrutacyjn/.test(h)) return "MARIUSZ_INTERIM";
  return null;
}

/** Detects the table kind from its header cells when no section heading was seen. */
function detectTableFromHeaders(cells: string[]): SourceTable | null {
  const h = norm(cells.join(" "));
  if (/dopasowana\s*aplikac/.test(h)) return "FABRYKA_SMART";
  if (/rola|zlecenie/.test(h)) return "MARIUSZ_INTERIM";
  return null;
}

function suggestApp(table: SourceTable, hint: string): SuggestedApp {
  const h = norm(hint);
  if (/crm/.test(h)) return "CRM";
  if (/interim/.test(h)) return "Interim Mariusz";
  if (/fabryka|smart|audyt|optymaliz|automatyz|hybryd/.test(h)) return "Fabryka Smart";
  return table === "FABRYKA_SMART" ? "Fabryka Smart" : "Interim Mariusz";
}

const OFFERS = ["AUDYT", "OPTYMALIZACJA", "AUTOMATYZACJA", "FABRYKA SMART", "INTERIM", "HYBRYDA"] as const;
const num05 = (v?: string) => { const n = parseInt(v ?? "", 10); return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : undefined; };

function hunterFields(rec: Partial<Record<Field, string>>): Partial<ParsedLead> {
  const out: Partial<ParsedLead> = {};
  const n = (v?: string) => norm(v ?? "");
  if (rec.trigger) out.trigger = rec.trigger;
  if (rec.question) out.verification_question = rec.question;
  if (rec.first_action) out.first_action = rec.first_action;
  let [t, p, f, a] = [num05(rec.t), num05(rec.p), num05(rec.f), num05(rec.a)];
  if (rec.tpfa) {
    const m = rec.tpfa.match(/\d/g);
    if (m && m.length >= 4) [t, p, f, a] = m.slice(0, 4).map((x) => num05(x));
  }
  if ([t, p, f, a].some((x) => x !== undefined)) out.scoring = { t: t ?? 0, p: p ?? 0, f: f ?? 0, a: a ?? 0 };
  const pr = n(rec.priority).toUpperCase();
  if (/WATCH/.test(pr)) out.priority = "WATCH";
  else { const m = pr.match(/\b([ABC])\b/) ?? pr.match(/^([ABC])/); if (m) out.priority = m[1] as "A" | "B" | "C"; }
  const offer = n(rec.offer).toUpperCase();
  const o = OFFERS.find((x) => offer.includes(x));
  if (o) out.offer = o;
  const tw = n(rec.time_window);
  if (/0\s*-\s*7/.test(tw)) out.time_window = "0-7 days";
  else if (/8\s*-\s*14/.test(tw)) out.time_window = "8-14 days";
  else if (/15\s*-\s*30/.test(tw)) out.time_window = "15-30 days";
  const c = n(rec.country);
  if (/\bcz|czech|czesk|cesk/.test(c)) out.country = "CZ";
  else if (/\bsk|slovak|slowac/.test(c)) out.country = "SK";
  else if (/\bpl|pol/.test(c)) out.country = "PL";
  const cur = n(rec.currency).toUpperCase();
  if (/CZK|KC/.test(cur)) out.currency = "CZK"; else if (/EUR|€/.test(cur)) out.currency = "EUR"; else if (/PLN|ZL/.test(cur)) out.currency = "PLN";
  if (rec.region) out.region = rec.region;
  if (rec.language) out.language_note = rec.language;
  if (rec.remote) out.remote_first = /tak|yes|true|remote|zdal|1/.test(n(rec.remote));
  const phone = rec.phone?.match(/\+?[\d][\d\s-]{6,}\d/)?.[0];
  if (phone) out.phone = phone.trim();
  const email = (rec.email ?? "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  if (email) out.email = email;
  if (rec.value) { const v = Number(rec.value.replace(/[^\d,.]/g, "").replace(/\s/g, "").replace(",", ".")); if (v > 0) out.value = v; }
  return out;
}

function buildLead(rec: Partial<Record<Field, string>>, table: SourceTable | null, url?: string): ParsedLead | null {
  const name = rec.company_name?.replace(URL_RE, "").trim();
  if (!name) return null;
  const src: SourceTable = table ?? (/interim/i.test(rec.offer ?? "") ? "MARIUSZ_INTERIM" : "FABRYKA_SMART");
  const srcUrl = rec.source_url?.match(URL_RE)?.[0] ?? url;
  const contact = rec.contact_person?.replace(URL_RE, "").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/, "").trim();
  const h = hunterFields(rec);
  return {
    key: `${src}:${norm(name)}`,
    source_table: src,
    company_name: name,
    location: rec.location ?? rec.region ?? "",
    industry: rec.industry ?? "",
    signal_fact: (rec.signal_fact ?? "").replace(URL_RE, "").trim(),
    hypothesis_pain: rec.hypothesis_pain ?? "",
    ...(contact ? { contact_person: contact } : {}),
    ...(rec.fit_score ? { fit_score: rec.fit_score } : {}),
    ...(srcUrl ? { source_url: srcUrl } : {}),
    suggested_app: suggestApp(src, `${rec.app ?? ""} ${rec.offer ?? ""}`),
    lead_type: src === "FABRYKA_SMART" ? "APLIKACJA A1" : "ZATRUDNIENIE / KONSULTING",
    suggested_offer: src === "FABRYKA_SMART" ? "FABRYKA SMART A1" : "INTERIM / KIEROWNIK / AUDYT",
    ...h,
  };
}

/** Parses "KEY: value" blocks (AI Hunter format). A block starts at a heading or a FIRMA line. */
function parseBlocks(lines: string[]): ParsedLead[] {
  const out: ParsedLead[] = [];
  let rec: Partial<Record<Field, string>> = {};
  let table: SourceTable | null = null;
  const flush = () => { const l = buildLead(rec, table); if (l) out.push(l); rec = {}; };
  for (const line of lines) {
    const t = stripMd(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")).trim();
    if (!t || t.startsWith("|")) continue;
    const heading = /^#{1,6}\s+/.test(line.trim());
    const kv = t.match(/^([A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż /()&.-]{1,40}?)\s*[:–=]\s*(.+)$/);
    if (heading) {
      const htext = t.replace(/^#+\s*/, "");
      const d = detectTable(htext);
      if (Object.keys(rec).length) flush();
      if (d) table = d;
      const nm = htext.replace(/^\d+[.)]\s*/, "").replace(/^(lead|firma|company)\s*[:#-]?\s*/i, "").trim();
      if (!d && nm && !kv) rec.company_name = nm;
      else if (kv) { /* fallthrough to kv handling below */ } else continue;
      if (!kv) continue;
    }
    if (!kv) continue;
    const key = norm(kv[1]!.trim());
    const f = /^(firma|company|nazwa|spolka)/.test(key) ? "company_name" : HEADER_MAP.find(([re]) => re.test(key))?.[1];
    if (!f) continue;
    if (f === "company_name" && rec.company_name && Object.keys(rec).length > 1) flush();
    const v = kv[2]!.trim();
    if (!EMPTY.test(v) && !rec[f]) rec[f] = v;
  }
  flush();
  return out;
}

/** Parses a morning scan report (Markdown tables under "Tabela A" / "Tabela B" headings). */
export function parseScanReport(raw: string): ParsedLead[] {
  const lines = raw.split(/\r?\n/);
  const out: ParsedLead[] = [];
  let table: SourceTable | null = null;
  let headers: (Field | null)[] | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) {
      headers = null;
      const detected = t ? detectTable(t) : null;
      if (detected) table = detected;
      continue;
    }
    const cells = splitRow(t);
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
    if (!headers) {
      headers = cells.map((c) => HEADER_MAP.find(([re]) => re.test(norm(stripMd(c))))?.[1] ?? null);
      if (!table) table = detectTable(cells.join(" "));
      continue;
    }
    const rec: Partial<Record<Field, string>> = {};
    let url: string | undefined;
    cells.forEach((c, i) => {
      const m = c.match(URL_RE);
      if (m && !url) url = m[0];
      const f = headers?.[i];
      const v = stripMd(c);
      if (f && !EMPTY.test(v) && !rec[f]) rec[f] = v;
    });
    const lead = buildLead(rec, table, url);
    if (lead) out.push(lead);
  }
  const seen = new Set(out.map((l) => l.key));
  for (const l of parseBlocks(lines)) if (!seen.has(l.key)) { seen.add(l.key); out.push(l); }
  return out;
}

export function coldMessage(l: ParsedLead): string {
  const greet = l.contact_person ? `Dzień dobry Pani/Panie ${l.contact_person.split(" ").slice(-1)[0]},` : "Dzień dobry,";
  const offer =
    l.suggested_app === "Interim Mariusz"
      ? "Jako manager interim wchodzę w takie sytuacje na 3–6 miesięcy: stabilizuję proces, porządkuję zespół i zostawiam działający system."
      : l.suggested_app === "CRM"
        ? "Pomagamy firmom B2B uporządkować lejek sprzedaży i relacje z klientami w prostym CRM dopasowanym do procesu."
        : "Fabryka Smart to lekki system do zbierania danych z maszyn i hali (OEE, przestoje, braki) – wdrażany etapami, bez wymiany parku maszynowego.";
  return [
    `Temat: ${l.company_name} – ${l.hypothesis_pain ? l.hypothesis_pain.split(/[.;]/)[0] : "pytanie o proces"}`,
    "",
    greet,
    "",
    `zauważyłem, że ${l.signal_fact ? l.signal_fact.charAt(0).toLowerCase() + l.signal_fact.slice(1).replace(/\.$/, "") : `w ${l.company_name} dzieje się sporo zmian`}.`,
    "",
    `Z doświadczenia w podobnych zakładach${l.industry ? ` (${l.industry})` : ""} wiem, że w takiej sytuacji często pojawia się problem: ${l.hypothesis_pain || "brak bieżącej widoczności procesu"}.`,
    "",
    offer,
    "",
    "Czy to jest dziś temat po Państwa stronie? Jeśli tak, proponuję 20 minut rozmowy w przyszłym tygodniu.",
    "",
    "Pozdrawiam,",
    "Mariusz Janeczek",
  ].join("\n");
}
