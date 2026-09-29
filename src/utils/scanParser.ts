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
}

type Field = "company_name" | "location" | "industry" | "signal_fact" | "hypothesis_pain" | "contact_person" | "fit_score" | "source_url" | "app";

// Header keywords (lowercase, no diacritics) -> field. Order matters: first match wins.
const HEADER_MAP: [RegExp, Field][] = [
  [/hipotez|bol|problem|pain/, "hypothesis_pain"],
  [/fakt|sygnal|signal|zdarzenie/, "signal_fact"],
  [/firma|spolka|company|nazwa/, "company_name"],
  [/lokaliz|miasto|location|siedziba/, "location"],
  [/branz|sektor|industry/, "industry"],
  [/kontakt|namiar|osoba|decydent|contact/, "contact_person"],
  [/fit|dopasow|sila|ocena|score|scoring/, "fit_score"],
  [/link|zrodl|url|source/, "source_url"],
  [/aplikac|produkt|app|oferta/, "app"],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
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
  if (/tabela\s*b|fabryka\s*smart/.test(h)) return "FABRYKA_SMART";
  if (/tabela\s*a|mariusz|interim/.test(h)) return "MARIUSZ_INTERIM";
  return null;
}

function suggestApp(table: SourceTable, hint: string): SuggestedApp {
  const h = norm(hint);
  if (/crm/.test(h)) return "CRM";
  if (/interim/.test(h)) return "Interim Mariusz";
  if (/fabryka|smart/.test(h)) return "Fabryka Smart";
  return table === "FABRYKA_SMART" ? "Fabryka Smart" : "Interim Mariusz";
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
    const name = rec.company_name?.replace(URL_RE, "").trim();
    if (!name) continue;
    const src: SourceTable = table ?? "FABRYKA_SMART";
    const srcUrl = rec.source_url?.match(URL_RE)?.[0] ?? url;
    const contact = rec.contact_person?.replace(URL_RE, "").trim();
    out.push({
      key: `${src}:${norm(name)}`,
      source_table: src,
      company_name: name,
      location: rec.location ?? "",
      industry: rec.industry ?? "",
      signal_fact: (rec.signal_fact ?? "").replace(URL_RE, "").trim(),
      hypothesis_pain: rec.hypothesis_pain ?? "",
      ...(contact ? { contact_person: contact } : {}),
      ...(rec.fit_score ? { fit_score: rec.fit_score } : {}),
      ...(srcUrl ? { source_url: srcUrl } : {}),
      suggested_app: suggestApp(src, rec.app ?? ""),
    });
  }
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
