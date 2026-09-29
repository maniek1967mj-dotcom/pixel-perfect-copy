import type { Company, Contact } from "@/types/crm";
import type { Deal } from "@/data/dealStore";

const C_KEY = "crm.companies.v4";
const P_KEY = "crm.contacts.v4";
const D_KEY = "crm.deals.v2";
const IMPORTED_KEY = "crm.importedLeads.v2";
const LOG_KEY = "crm.importedLeadLog.v2";

const read = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
};

const download = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportBackupJson = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    version: 1,
    companies: read<Company>(C_KEY),
    contacts: read<Contact>(P_KEY),
    deals: read<Deal>(D_KEY),
    importedLeads: read<string>(IMPORTED_KEY),
    importedLeadLog: read<unknown>(LOG_KEY),
  };
  download(`fabryka-smart-crm-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
};

export const importBackupJson = (file: File): Promise<{ companies: number; contacts: number; deals: number }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nie można odczytać pliku"));
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.companies) || !Array.isArray(data.contacts) || !Array.isArray(data.deals)) {
          throw new Error("Nieprawidłowy format pliku kopii zapasowej");
        }
        localStorage.setItem(C_KEY, JSON.stringify(data.companies));
        localStorage.setItem(P_KEY, JSON.stringify(data.contacts));
        localStorage.setItem(D_KEY, JSON.stringify(data.deals));
        if (Array.isArray(data.importedLeads)) localStorage.setItem(IMPORTED_KEY, JSON.stringify(data.importedLeads));
        if (Array.isArray(data.importedLeadLog)) localStorage.setItem(LOG_KEY, JSON.stringify(data.importedLeadLog));
        resolve({ companies: data.companies.length, contacts: data.contacts.length, deals: data.deals.length });
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Nieprawidłowy plik JSON"));
      }
    };
    reader.readAsText(file);
  });

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers: string[], rows: unknown[][]) =>
  "﻿" + [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n");

export const exportCsv = () => {
  const companies = read<Company>(C_KEY);
  const deals = read<Deal>(D_KEY);
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "";

  const companiesCsv = toCsv(
    ["Nazwa", "Branża", "Wielkość", "Strona WWW", "Miasto", "Notatki"],
    companies.map((c) => [c.name, c.industry, c.size, c.website, c.city, c.notes]),
  );
  const dealsCsv = toCsv(
    ["Nazwa szansy", "Firma", "Etap", "Wartość", "Waluta", "Produkt", "Planowane zamknięcie"],
    deals.map((d) => [d.title, companyName(d.companyId), d.stage, d.value, d.currency, d.product, d.expectedClose]),
  );
  download(`crm-firmy-${new Date().toISOString().slice(0, 10)}.csv`, companiesCsv, "text/csv;charset=utf-8");
  download(`crm-szanse-${new Date().toISOString().slice(0, 10)}.csv`, dealsCsv, "text/csv;charset=utf-8");
};
