export type AppPotential = "Fabryka Smart" | "Asystent Restauracji" | "CRM" | "Inne" | "Brak";

export interface Company {
  id: string;
  name: string;
  nip: string;
  industry: string;
  size: string;
  machine_park?: string;
  app_potential: AppPotential[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  role: string;
  is_decision_maker: boolean;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}
