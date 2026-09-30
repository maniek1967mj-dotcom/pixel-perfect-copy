import { readCompanies, readContacts, writeCompanies, writeContacts, uid } from "@/data/companyStore";
import { readDeals, writeDeals, type DealAppType } from "@/data/dealStore";
import type { AppPotential } from "@/types/crm";
import type { ParsedLead } from "./scanParser";

const IMPORTED_KEY = "crm.importedLeads.v2";
const LOG_KEY = "crm.importedLeadLog.v2";
export type ImportedLead = ParsedLead & { imported_at: string };
export function readLeadLog(): ImportedLead[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as ImportedLead[]; } catch { return []; }
}

export function readImported(): string[] {
  try { return JSON.parse(localStorage.getItem(IMPORTED_KEY) ?? "[]") as string[]; } catch { return []; }
}

const ESTIMATE: Record<ParsedLead["suggested_app"], number> = { "Fabryka Smart": 120000, "Interim Mariusz": 120000, CRM: 35000 };

/** Saves a lead as company (add or update by name), optional contact and a new deal in "Sygnał". */
export function importLead(l: ParsedLead) {
  const now = new Date().toISOString();
  const potential: AppPotential = l.suggested_app === "Fabryka Smart" ? "Fabryka Smart" : l.suggested_app === "CRM" ? "CRM" : "Inne";
  const dealType: DealAppType = potential === "Fabryka Smart" ? "Fabryka Smart" : potential === "CRM" ? "CRM" : "Inne";

  const companies = readCompanies();
  let company = companies.find((c) => c.name.trim().toLowerCase() === l.company_name.trim().toLowerCase());
  const note = [l.location && `Lokalizacja: ${l.location}`, `Sygnał: ${l.signal_fact}`].filter(Boolean).join(" · ");
  if (company) {
    company = {
      ...company,
      industry: company.industry || l.industry,
      country: company.country ?? l.country ?? "PL",
      region: company.region || l.region || "",
      app_potential: company.app_potential.includes(potential) ? company.app_potential : [...company.app_potential, potential],
      updated_at: now,
    };
    writeCompanies(companies.map((c) => (c.id === company!.id ? company! : c)));
  } else {
    company = { id: uid(), name: l.company_name, nip: "", industry: l.industry, size: "", machine_park: "", app_potential: [potential], country: l.country ?? "PL", ...(l.region ? { region: l.region } : {}), created_at: now, updated_at: now };
    writeCompanies([company, ...companies]);
  }

  let contactId: string | undefined;
  if (l.contact_person) {
    const contacts = readContacts();
    const [first, ...rest] = l.contact_person.split(/\s+/);
    const existing = contacts.find((c) => c.company_id === company!.id && `${c.first_name} ${c.last_name}`.toLowerCase() === l.contact_person!.toLowerCase());
    if (existing) {
      contactId = existing.id;
      if ((l.email && !existing.email) || (l.phone && !existing.phone))
        writeContacts(contacts.map((c) => (c.id === existing.id ? { ...c, email: c.email || l.email || "", phone: c.phone || l.phone || "", updated_at: now } : c)));
    }
    else {
      contactId = uid();
      writeContacts([...contacts, { id: contactId, company_id: company.id, first_name: first ?? "", last_name: rest.join(" "), role: "Namiar ze skanera", is_decision_maker: false, email: l.email ?? "", phone: l.phone ?? "", created_at: now, updated_at: now }]);
    }
  }

  const close = new Date(); close.setDate(close.getDate() + 45);
  const follow = new Date(); follow.setDate(follow.getDate() + (l.priority === "A" ? 1 : l.priority === "B" ? 3 : 7));
  const country = l.country ?? "PL";
  const currency = l.currency ?? (country === "CZ" ? "CZK" : country === "SK" ? "EUR" : "PLN");
  const timeWindow = l.time_window ?? (l.priority === "A" ? "0-7 days" : l.priority === "B" ? "8-14 days" : l.priority === "C" ? "15-30 days" : undefined);
  const baseValue = currency === "CZK" ? Math.round(ESTIMATE[l.suggested_app] / 0.17 / 1000) * 1000 : currency === "EUR" ? Math.round(ESTIMATE[l.suggested_app] / 4.3 / 1000) * 1000 : ESTIMATE[l.suggested_app];
  const deals = readDeals();
  writeDeals([
    ...deals,
    {
      id: uid(),
      title: `${l.suggested_app} – ${l.company_name}`,
      company_id: company.id,
      ...(contactId ? { contact_id: contactId } : {}),
      stage: "sygnal",
      value: l.value ?? baseValue,
      currency,
      app_type: dealType,
      expected_close_date: close.toISOString().slice(0, 10),
      notes: [note, l.hypothesis_pain && `Hipoteza bólu: ${l.hypothesis_pain}`, l.fit_score && `Dopasowanie: ${l.fit_score}`, l.source_url && `Źródło: ${l.source_url}`].filter(Boolean).join("\n"),
      created_at: now,
      fact: l.signal_fact,
      ...(l.trigger ? { trigger: l.trigger } : {}),
      ...(l.hypothesis_pain ? { hypothesis: l.hypothesis_pain } : {}),
      ...(l.verification_question ? { verificationQuestion: l.verification_question } : {}),
      ...(l.first_action ? { firstAction: l.first_action } : {}),
      ...(l.scoring ? { scoring: l.scoring } : {}),
      ...(timeWindow ? { timeWindow } : {}),
      ...(l.priority ? { priority: l.priority } : {}),
      ...(l.offer ? { suggestedOffer: l.offer } : {}),
      followUpDate: follow.toISOString().slice(0, 10),
      country,
      ...(l.region ? { region: l.region } : {}),
      ...(l.language_note ? { languageNote: l.language_note } : {}),
      remoteFirst: l.remote_first ?? country !== "PL",
    },
  ]);

  const log = readLeadLog().filter((x) => x.key !== l.key);
  localStorage.setItem(LOG_KEY, JSON.stringify([...log, { ...l, imported_at: now }]));
  const imported = readImported();
  if (!imported.includes(l.key)) localStorage.setItem(IMPORTED_KEY, JSON.stringify([...imported, l.key]));
}
