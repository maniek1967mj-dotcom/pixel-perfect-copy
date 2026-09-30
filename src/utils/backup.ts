import type { Company, Contact } from "@/types/crm";
import type { Deal } from "@/data/dealStore";
import type { Order } from "@/data/orderStore";

const C_KEY = "crm.companies.v4";
const P_KEY = "crm.contacts.v4";
const D_KEY = "crm.deals.v2";
const IMPORTED_KEY = "crm.importedLeads.v2";
const O_KEY = "crm.orders.v1";
const LOG_KEY = "crm.importedLeadLog.v2";
const A_KEY = "crm.activities.v1";

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
    orders: read<unknown>(O_KEY),
    importedLeads: read<string>(IMPORTED_KEY),
    importedLeadLog: read<unknown>(LOG_KEY),
    activities: read<unknown>(A_KEY),
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
        localStorage.setItem(O_KEY, JSON.stringify(Array.isArray(data.orders) ? data.orders : []));
        if (Array.isArray(data.importedLeads)) localStorage.setItem(IMPORTED_KEY, JSON.stringify(data.importedLeads));
        localStorage.setItem(A_KEY, JSON.stringify(Array.isArray(data.activities) ? data.activities : []));
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
    ["Nazwa", "NIP", "Branża", "Wielkość", "Park maszynowy", "Potencjał aplikacji"],
    companies.map((c) => [c.name, c.nip, c.industry, c.size, c.machine_park, (c.app_potential ?? []).join(", ")]),
  );
  const dealsCsv = toCsv(
    ["Nazwa szansy", "Firma", "Etap", "Wartość", "Waluta", "Produkt", "Planowane zamknięcie"],
    deals.map((d) => [d.title, companyName(d.company_id), d.stage, d.value, d.currency, d.app_type, d.expected_close_date]),
  );
  download(`crm-firmy-${new Date().toISOString().slice(0, 10)}.csv`, companiesCsv, "text/csv;charset=utf-8");
  download(`crm-szanse-${new Date().toISOString().slice(0, 10)}.csv`, dealsCsv, "text/csv;charset=utf-8");
};

export const exportOrdersCsv = (orders: Order[]) => {
  const csv = toCsv(
    ["Numer Zlecenia", "Klient", "Nazwa Szansy", "Wartość Sprzedaży", "Waluta", "Koszt Realizacji", "Marża (PLN/CZK/EUR)", "Marża (%)", "Status", "Data Zamówienia", "Data Dostawy"],
    orders.map((o) => {
      const m = o.sellValue - (o.costValue || 0);
      const pct = o.sellValue > 0 ? (m / o.sellValue) * 100 : 0;
      return [
        o.orderNumber,
        o.client,
        o.title,
        o.sellValue,
        o.currency,
        o.costValue || 0,
        m,
        pct.toFixed(1).replace(".", ","),
        o.status,
        o.orderDate,
        o.deliveryDate,
      ];
    }),
  );
  download(`crm-zamowienia-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
};
