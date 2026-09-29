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
      app_potential: company.app_potential.includes(potential) ? company.app_potential : [...company.app_potential, potential],
      updated_at: now,
    };
    writeCompanies(companies.map((c) => (c.id === company!.id ? company! : c)));
  } else {
    company = { id: uid(), name: l.company_name, nip: "", industry: l.industry, size: "", machine_park: "", app_potential: [potential], created_at: now, updated_at: now };
    writeCompanies([company, ...companies]);
  }

  let contactId: string | undefined;
  if (l.contact_person) {
    const contacts = readContacts();
    const [first, ...rest] = l.contact_person.split(/\s+/);
    const existing = contacts.find((c) => c.company_id === company!.id && `${c.first_name} ${c.last_name}`.toLowerCase() === l.contact_person!.toLowerCase());
    if (existing) contactId = existing.id;
    else {
      contactId = uid();
      writeContacts([...contacts, { id: contactId, company_id: company.id, first_name: first ?? "", last_name: rest.join(" "), role: "Namiar ze skanera", is_decision_maker: false, email: "", phone: "", created_at: now, updated_at: now }]);
    }
  }

  const close = new Date(); close.setDate(close.getDate() + 45);
  const deals = readDeals();
  writeDeals([
    ...deals,
    {
      id: uid(),
      title: `${l.suggested_app} – ${l.company_name}`,
      company_id: company.id,
      ...(contactId ? { contact_id: contactId } : {}),
      stage: "sygnal",
      value: ESTIMATE[l.suggested_app],
      currency: "PLN",
      app_type: dealType,
      expected_close_date: close.toISOString().slice(0, 10),
      notes: [note, l.hypothesis_pain && `Hipoteza bólu: ${l.hypothesis_pain}`, l.fit_score && `Dopasowanie: ${l.fit_score}`, l.source_url && `Źródło: ${l.source_url}`].filter(Boolean).join("\n"),
      created_at: now,
    },
  ]);

  const log = readLeadLog().filter((x) => x.key !== l.key);
  localStorage.setItem(LOG_KEY, JSON.stringify([...log, { ...l, imported_at: now }]));
  const imported = readImported();
  if (!imported.includes(l.key)) localStorage.setItem(IMPORTED_KEY, JSON.stringify([...imported, l.key]));
}
