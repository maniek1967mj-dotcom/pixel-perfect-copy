import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Copy, Database, Plus, ScanSearch, Target, TrendingUp, Trophy, Wallet } from "lucide-react";
import { useDealStore, STAGES, toPLN, formatMoney, type Deal } from "@/data/dealStore";
import { readLeadLog, type ImportedLead } from "@/utils/leadImport";
import { coldMessage, parseScanReport } from "@/utils/scanParser";
import { SAMPLE_REPORT } from "@/utils/sampleReport";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Centrum Akcji — B2B CRM" },
      { name: "description", content: "Pulpit B2B: wartość lejka, top leady dnia, podział portfela i eksport SQL." },
      { property: "og:title", content: "Centrum Akcji — B2B CRM" },
      { property: "og:description", content: "Pulpit B2B: wartość lejka, top leady dnia, podział portfela i eksport SQL." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const SQL = `-- B2B CRM: migracja Supabase (PostgreSQL)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nip text,
  industry text,
  company_size text,
  machine_park text,
  app_potentials text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text,
  role text,
  is_decision_maker boolean not null default false,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  stage text not null default 'sygnal'
    check (stage in ('sygnal','kontakt','audyt_gemba','propozycja','negocjacje','wygrana','przegrana')),
  value numeric(14,2) not null default 0,
  currency text not null default 'PLN' check (currency in ('PLN','EUR')),
  app_type text not null default 'Inne',
  expected_close_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_company_idx on public.contacts(company_id);
create index if not exists deals_company_idx on public.deals(company_id);
create index if not exists deals_stage_idx on public.deals(stage);

grant select, insert, update, delete on public.companies, public.contacts, public.deals to authenticated;
grant all on public.companies, public.contacts, public.deals to service_role;

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;

create policy "auth all companies" on public.companies for all to authenticated using (true) with check (true);
create policy "auth all contacts" on public.contacts for all to authenticated using (true) with check (true);
create policy "auth all deals" on public.deals for all to authenticated using (true) with check (true);
`;

const fitRank = (f?: string) => {
  const u = (f ?? "").toUpperCase();
  return u.includes("BARDZO") ? 3 : u.includes("MOCNE") ? 2 : u ? 1 : 0;
};
const portfolioOf = (d: Deal) =>
  d.title.startsWith("Interim") ? "Interim Mariusz" : d.app_type === "Fabryka Smart" ? "Fabryka Smart" : d.app_type === "CRM" || d.app_type === "Asystent Restauracji" ? "CRM" : "Inne";

function Page() {
  const { deals } = useDealStore();
  const [log, setLog] = useState<ImportedLead[]>([]);
  const [sqlOpen, setSqlOpen] = useState(false);
  useEffect(() => setLog(readLeadLog()), []);

  const today = new Date().toISOString().slice(0, 10);
  const active = deals.filter((d) => d.stage !== "przegrana" && d.stage !== "wygrana");
  const open = deals.filter((d) => d.stage !== "przegrana");
  const pipeline = active.reduce((s, d) => s + toPLN(d), 0);
  const addedToday = active.filter((d) => d.created_at.slice(0, 10) === today).reduce((s, d) => s + toPLN(d), 0);
  const leadsToday = log.filter((l) => l.imported_at.slice(0, 10) === today).length;
  const won = deals.filter((d) => d.stage === "wygrana").length;
  const winRate = deals.length ? Math.round((won / deals.length) * 100) : 0;

  const isSample = log.length === 0;
  const top = useMemo(() => {
    const src = isSample ? parseScanReport(SAMPLE_REPORT) : log;
    return [...src].sort((a, b) => fitRank(b.fit_score) - fitRank(a.fit_score)).slice(0, 3);
  }, [log, isSample]);

  const portfolio = ["Fabryka Smart", "Interim Mariusz", "CRM"].map((k) => {
    const items = open.filter((d) => portfolioOf(d) === k);
    return { k, count: items.length, value: items.reduce((s, d) => s + toPLN(d), 0) };
  });
  const portTotal = portfolio.reduce((s, p) => s + p.value, 0) || 1;
  const funnel = STAGES.filter((s) => s.id !== "przegrana" && s.id !== "kontakt").map((s) => ({ ...s, count: deals.filter((d) => d.stage === s.id).length }));
  const maxStage = Math.max(1, ...funnel.map((f) => f.count));

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.error("Nie udało się skopiować"); }
  };

  const kpis = [
    { label: "Wartość Lejka (PLN)", value: formatMoney(pipeline), sub: addedToday ? `+${formatMoney(addedToday)} dziś` : "bez zmian dziś", icon: Wallet, up: addedToday > 0 },
    { label: "Aktywne Szanse", value: String(open.length), sub: "bez przegranych", icon: Briefcase },
    { label: "Dzisiejsze Nowe Leady", value: String(leadsToday), sub: "ze Skanera Leadów", icon: ScanSearch },
    { label: "Wskaźnik Wygranych", value: `${winRate}%`, sub: `${won} z ${deals.length} szans`, icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-foreground">Centrum Akcji</h1>
          <p className="text-sm text-muted-foreground">Co dziś przesuwa lejek do przodu</p>
        </div>
        <Button asChild variant="outline"><Link to="/companies"><Plus className="mr-1 h-4 w-4" />Nowa Firma</Link></Button>
        <Button asChild variant="outline"><Link to="/pipeline"><Plus className="mr-1 h-4 w-4" />Nowa Szansa</Link></Button>
        <Button asChild><Link to="/importer"><ScanSearch className="mr-1 h-4 w-4" />Wklej Raport Skanera</Link></Button>
        <Button variant="secondary" onClick={() => setSqlOpen(true)}><Database className="mr-1 h-4 w-4" />Pobierz Skrypt SQL dla Supabase</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, up }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<Icon className="h-4 w-4" /></div>
            <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
            <div className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-primary" : "text-muted-foreground"}`}>{up && <TrendingUp className="h-3 w-3" />}{sub}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="mr-auto font-semibold text-foreground">TOP 3 LEADY NA DZIŚ (Problem-First)</h2>
          {isSample && <Badge variant="outline">przykład – brak zaimportowanych leadów</Badge>}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {top.map((l) => (
            <div key={l.key} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto font-semibold text-foreground">{l.company_name}</span>
                {l.fit_score && <Badge variant="secondary">{l.fit_score}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{l.hypothesis_pain || l.signal_fact || "—"}</p>
              <Button size="sm" className="mt-auto" onClick={() => copy(coldMessage(l), `Skopiowano cold email – ${l.company_name}`)}>
                <Copy className="mr-1 h-4 w-4" />Kopiuj Cold Email
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-foreground">Podział portfela</h2>
          {portfolio.map((p) => (
            <div key={p.k} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{p.k} <span className="text-muted-foreground">· {p.count}</span></span><span className="font-medium">{formatMoney(p.value)}</span></div>
              <Progress value={(p.value / portTotal) * 100} />
            </div>
          ))}
        </Card>
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-foreground">Etapy lejka</h2>
          {funnel.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0">{f.label}</span>
              <div className="h-6 flex-1 rounded bg-muted">
                <div className="flex h-6 items-center rounded bg-primary px-2 text-xs font-semibold text-primary-foreground" style={{ width: `${Math.max(8, (f.count / maxStage) * 100)}%` }}>{f.count}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Dialog open={sqlOpen} onOpenChange={setSqlOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Skrypt SQL dla Supabase</DialogTitle>
            <DialogDescription>Tabele companies, contacts i deals – gotowe do uruchomienia po podłączeniu bazy.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">{SQL}</pre>
          <Button onClick={() => copy(SQL, "Skopiowano SQL")}><Copy className="mr-1 h-4 w-4" />Kopiuj SQL</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
