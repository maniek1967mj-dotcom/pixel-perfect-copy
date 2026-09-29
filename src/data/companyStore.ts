import { useCallback, useEffect, useState } from "react";
import type { AppPotential, Company, Contact } from "@/types/crm";

const C_KEY = "crm.companies.v2";
const P_KEY = "crm.contacts.v2";
const now = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const seedCompanies: Company[] = [
  { id: "c1", name: "Metal-Tech Sp. z o.o.", nip: "8940001122", industry: "Obróbka Skrawaniem CNC", size: "50-100 osób", machine_park: "3x CNC Mazak VTC-800, 2x Laser Bystronic ByStar 10kW, Roboty KUKA", app_potential: ["Fabryka Smart", "CRM"], created_at: now(), updated_at: now() },
  { id: "c2", name: "Agro-Machinery Group", nip: "7712223344", industry: "Maszyny Rolnicze", size: "100-250 osób", machine_park: "Linia spawalnicza Panasonic, Giętarki Trumpf, Malarnia proszkowa", app_potential: ["Fabryka Smart"], created_at: now(), updated_at: now() },
  { id: "c3", name: "Smak & Tradycja Sp. j.", nip: "5219988776", industry: "Gastronomia / Sieć Restauracji", size: "20-50 osób", machine_park: "Brak parku maszynowego (Sieć 8 lokali)", app_potential: ["Asystent Restauracji"], created_at: now(), updated_at: now() },
  { id: "c4", name: "Automatyka Przemysłowa Janeczek", nip: "6114433221", industry: "Integracja Systemów B2B", size: "10-20 osób", machine_park: "Warsztat montażowy szaf sterowniczych", app_potential: ["CRM", "Inne"], created_at: now(), updated_at: now() },
];

const ct = (id: string, company_id: string, first_name: string, last_name: string, role: string, dm: boolean, email: string, phone: string): Contact => ({ id, company_id, first_name, last_name, role, is_decision_maker: dm, email, phone, created_at: now(), updated_at: now() });

const seedContacts: Contact[] = [
  ct("p1", "c1", "Andrzej", "Kowalski", "Prezes Zarządu", true, "a.kowalski@metal-tech.pl", "+48 600 100 200"),
  ct("p2", "c1", "Katarzyna", "Nowak", "Kierownik Produkcji", false, "k.nowak@metal-tech.pl", "+48 600 100 201"),
  ct("p3", "c2", "Tomasz", "Wiśniewski", "Dyrektor Operacyjny", true, "t.wisniewski@agro-mg.pl", "+48 601 200 300"),
  ct("p4", "c2", "Marta", "Zielińska", "Główny Technolog", false, "m.zielinska@agro-mg.pl", "+48 601 200 301"),
  ct("p5", "c3", "Piotr", "Lewandowski", "Właściciel", true, "piotr@smaktradycja.pl", "+48 602 300 400"),
  ct("p6", "c4", "Mariusz", "Janeczek", "Właściciel", true, "mariusz@janeczek-automatyka.pl", "+48 603 400 500"),
];

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export const ALL_POTENTIALS: AppPotential[] = ["Fabryka Smart", "Asystent Restauracji", "CRM", "Inne"];

export function useCompanyStore() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCompanies(load(C_KEY, seedCompanies));
    setContacts(load(P_KEY, seedContacts));
    setReady(true);
  }, []);

  const saveCompanies = useCallback((next: Company[]) => {
    setCompanies(next);
    localStorage.setItem(C_KEY, JSON.stringify(next));
  }, []);
  const saveContacts = useCallback((next: Contact[]) => {
    setContacts(next);
    localStorage.setItem(P_KEY, JSON.stringify(next));
  }, []);

  const upsertCompany = (data: Omit<Company, "id" | "created_at" | "updated_at">, id?: string) => {
    if (id) saveCompanies(companies.map((c) => (c.id === id ? { ...c, ...data, updated_at: now() } : c)));
    else saveCompanies([{ ...data, id: uid(), created_at: now(), updated_at: now() }, ...companies]);
  };
  const deleteCompany = (id: string) => {
    saveCompanies(companies.filter((c) => c.id !== id));
    saveContacts(contacts.filter((c) => c.company_id !== id));
  };
  const addContact = (data: Omit<Contact, "id" | "created_at" | "updated_at">) =>
    saveContacts([...contacts, { ...data, id: uid(), created_at: now(), updated_at: now() }]);

  return { ready, companies, contacts, upsertCompany, deleteCompany, addContact };
}
