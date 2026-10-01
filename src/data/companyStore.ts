import { useCallback, useEffect, useState } from "react";
import type { AppPotential, Company, Contact } from "@/types/crm";

const C_KEY = "crm.companies.v4";
const P_KEY = "crm.contacts.v4";
const now = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const seedCompanies: Company[] = [];


const seedContacts: Contact[] = [];

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export const readCompanies = () => load(C_KEY, seedCompanies);
export const readContacts = () => load(P_KEY, seedContacts);
export const writeCompanies = (v: Company[]) => localStorage.setItem(C_KEY, JSON.stringify(v));
export const writeContacts = (v: Contact[]) => localStorage.setItem(P_KEY, JSON.stringify(v));

export const SIZES = ["1-10 osób", "11-50 osób", "51-200 osób", "200+ osób"];
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
    if (id) { saveCompanies(companies.map((c) => (c.id === id ? { ...c, ...data, updated_at: now() } : c))); return id; }
    const nid = uid();
    saveCompanies([{ ...data, id: nid, created_at: now(), updated_at: now() }, ...companies]);
    return nid;
  };
  const deleteCompany = (id: string) => {
    saveCompanies(companies.filter((c) => c.id !== id));
    saveContacts(contacts.filter((c) => c.company_id !== id));
  };
  const addContact = (data: Omit<Contact, "id" | "created_at" | "updated_at">) => {
    const nid = uid();
    saveContacts([...contacts, { ...data, id: nid, created_at: now(), updated_at: now() }]);
    return nid;
  };

  const updateContact = (id: string, data: Partial<Omit<Contact, "id" | "created_at">>) =>
    saveContacts(contacts.map((c) => (c.id === id ? { ...c, ...data, updated_at: now() } : c)));
  const deleteContact = (id: string) => saveContacts(contacts.filter((c) => c.id !== id));

  return { ready, companies, contacts, upsertCompany, deleteCompany, addContact, updateContact, deleteContact };
}
