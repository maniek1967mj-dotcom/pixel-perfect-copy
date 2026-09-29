import type { Company, Contact } from "@/types/crm";

const ts = "2026-09-01T08:00:00Z";

export const companies: Company[] = [
  { id: "c1", name: "Metal-Tech Sp. z o.o.", nip: "6342871509", industry: "Obróbka metali", size: "50-249", machine_park: "2x CNC Mazak, 1x Laser Bystronic", app_potential: ["Fabryka Smart"], created_at: ts, updated_at: ts },
  { id: "c2", name: "PlastForm S.A.", nip: "5213987654", industry: "Przetwórstwo tworzyw", size: "250+", machine_park: "6x Wtryskarka Engel, 2x Robot KUKA", app_potential: ["Fabryka Smart", "CRM"], created_at: ts, updated_at: ts },
  { id: "c3", name: "DataBridge Consulting Sp. z o.o.", nip: "7792345610", industry: "Konsulting IT", size: "10-49", app_potential: ["CRM", "Inne"], created_at: ts, updated_at: ts },
];

export const contacts: Contact[] = [
  { id: "p1", company_id: "c1", first_name: "Tomasz", last_name: "Kowalczyk", role: "Dyrektor Produkcji", is_decision_maker: true, email: "t.kowalczyk@metal-tech.pl", phone: "+48 601 234 567", created_at: ts, updated_at: ts },
  { id: "p2", company_id: "c2", first_name: "Anna", last_name: "Wiśniewska", role: "Kierownik Utrzymania Ruchu", is_decision_maker: false, email: "a.wisniewska@plastform.pl", phone: "+48 602 345 678", created_at: ts, updated_at: ts },
  { id: "p3", company_id: "c3", first_name: "Piotr", last_name: "Nowak", role: "Prezes Zarządu", is_decision_maker: true, email: "p.nowak@databridge.pl", phone: "+48 603 456 789", created_at: ts, updated_at: ts },
];
