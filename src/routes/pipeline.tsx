import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Calendar, ChevronDown, ExternalLink, Globe, Kanban, Mail, MoreHorizontal, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { useCompanyStore } from "@/data/companyStore";
import { createOrderFromDeal } from "@/data/orderStore";
import { useDealStore, STAGES, DEAL_APP_TYPES, COUNTRIES, CURRENCIES, TIME_WINDOWS, PRIORITIES, OFFERS, flagOf, formatMoney, toPLN, type Deal, type Stage, type DealAppType, type Currency, type Country, type Priority, type TimeWindow, type SuggestedOffer } from "@/data/dealStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Lejek Sprzedaży B2B — CRM" },
      { name: "description", content: "Zarządzaj procesem ofertowania, audytami Gemba i wartością portfela." },
      { property: "og:title", content: "Lejek Sprzedaży B2B — CRM" },
      { property: "og:description", content: "Zarządzaj procesem ofertowania, audytami Gemba i wartością portfela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const appClass: Record<string, string> = {
  "Fabryka Smart": "bg-blue-500/15 text-blue-700 border-blue-500/30",
  "Asystent Restauracji": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  CRM: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Inne: "bg-muted text-muted-foreground border-border",
};
const prioClass: Record<string, string> = {
  A: "bg-red-500/15 text-red-700 border-red-500/40",
  B: "bg-orange-500/15 text-orange-700 border-orange-500/40",
  C: "bg-yellow-500/15 text-yellow-800 border-yellow-500/40",
  WATCH: "bg-muted text-muted-foreground border-border",
};
const twLabel = (t?: string) => TIME_WINDOWS.find((x) => x.id === t)?.label ?? "";
const isPolish = (n?: string) => !n || /^\s*polski\s*$/i.test(n);

const columnClass: Partial<Record<Stage, string>> = {
  wygrana: "border-emerald-500/40 bg-emerald-500/5",
  przegrana: "border-red-500/30 bg-muted/60",
};

type FormState = Omit<Deal, "id" | "created_at">;
const emptyForm = (): FormState => ({ title: "", company_id: "", contact_id: "", stage: "sygnal", value: 0, currency: "PLN", app_type: "Fabryka Smart", expected_close_date: "", notes: "" });

function extras(d: Deal): Partial<FormState> {
  const keys = ["fact", "trigger", "hypothesis", "verificationQuestion", "firstAction", "scoring", "timeWindow", "priority", "suggestedOffer", "followUpDate", "country", "region", "languageNote", "remoteFirst"] as const;
  const o: Record<string, unknown> = {};
  for (const k of keys) if (d[k] !== undefined) o[k] = d[k];
  return o as Partial<FormState>;
}

function Page() {
  const cs = useCompanyStore();
  const ds = useDealStore();
  const [appF, setAppF] = useState("all");
  const [compF, setCompF] = useState("all");
  const [countryF, setCountryF] = useState("all");
  const [twF, setTwF] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [valueText, setValueText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const companyName = (id: string) => cs.companies.find((c) => c.id === id)?.name ?? "—";
  const contactOf = (id?: string) => (id ? cs.contacts.find((c) => c.id === id) : undefined);
  const visible = useMemo(
    () => ds.deals.filter((d) => (appF === "all" || d.app_type === appF) && (compF === "all" || d.company_id === compF) && (countryF === "all" || (d.country ?? "PL") === countryF) && (twF === "all" || d.timeWindow === twF)),
    [ds.deals, appF, compF, countryF, twF],
  );
  const active = visible.filter((d) => d.stage !== "przegrana");
  const activeTotal = active.reduce((s, d) => s + toPLN(d), 0);

  const openAdd = (stage: Stage = "sygnal") => { setEditId(undefined); setForm({ ...emptyForm(), stage }); setValueText(""); setErrors({}); setOpen(true); };
  const openEdit = (d: Deal) => {
    setEditId(d.id);
    setForm({ title: d.title, company_id: d.company_id, contact_id: d.contact_id ?? "", stage: d.stage, value: d.value, currency: d.currency, app_type: d.app_type, expected_close_date: d.expected_close_date, notes: d.notes ?? "", ...extras(d) });
    setValueText(String(d.value)); setErrors({}); setOpen(true);
  };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e["title"] = "Tytuł jest wymagany";
    if (!form.company_id) e["company_id"] = "Wybierz firmę";
    const value = Number(valueText.replace(/\s/g, "").replace(",", ".") || 0);
    if (!Number.isFinite(value) || value < 0) e["value"] = "Podaj prawidłową kwotę";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data: FormState = { ...form, title: form.title.trim(), value };
    if (!data.contact_id) delete data.contact_id;
    const id = ds.upsert(data, editId);
    if (data.stage === "wygrana") orderFor({ ...data, id, created_at: new Date().toISOString() });
    toast.success(editId ? "Zapisano szansę sprzedaży" : "Dodano nową szansę sprzedaży");
    setOpen(false);
  };
  const moveTo = (d: Deal, stage: Stage) => {
    if (d.stage === stage) return;
    ds.move(d.id, stage);
    toast.success(`Przeniesiono do: ${STAGES.find((s) => s.id === stage)?.label}`);
    if (stage === "wygrana") orderFor({ ...d, stage });
  };
  const orderFor = (d: Deal) => {
    const o = createOrderFromDeal(d, companyName(d.company_id));
    if (o) toast.success(`Utworzono zamówienie ${o.orderNumber}`);
  };
  const del = (d: Deal) => {
    if (!confirm(`Usunąć szansę „${d.title}”?`)) return;
    ds.remove(d.id); toast.success("Usunięto szansę sprzedaży");
  };
  const companyContacts = cs.contacts.filter((c) => c.company_id === form.company_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lejek Sprzedaży B2B</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj procesem ofertowania, audytami Gemba i wartością portfela</p>
        </div>
        <Button onClick={() => openAdd()}><Plus className="mr-1 h-4 w-4" />Nowa Szansa Sprzedaży</Button>
      </div>

      {ds.ready && ds.deals.length === 0 && (
        <EmptyState icon={Kanban} title="Brak szans w lejku" text="Dodaj pierwszą szansę sprzedaży lub zaimportuj leady ze Skanera Leadów." action={<Button onClick={() => openAdd()}><Plus className="mr-1 h-4 w-4" />Nowa Szansa Sprzedaży</Button>} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Aktywna wartość lejka</div>
          <div className="text-2xl font-semibold text-foreground">{formatMoney(activeTotal)}</div>
          <div className="text-xs text-muted-foreground">bez przegranych · EUR po 4,30 zł, CZK po 0,17 zł</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Aktywne szanse</div>
          <div className="text-2xl font-semibold text-foreground">{active.length}</div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row">
        <Select value={appF} onValueChange={setAppF}>
          <SelectTrigger className="sm:w-56" aria-label="Filtr produktu"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie produkty</SelectItem>
            {DEAL_APP_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={compF} onValueChange={setCompF}>
          <SelectTrigger className="sm:w-64" aria-label="Filtr firmy"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie firmy</SelectItem>
            {cs.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryF} onValueChange={setCountryF}>
          <SelectTrigger className="sm:w-44" aria-label="Filtr kraju"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kraje</SelectItem>
            {COUNTRIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.flag} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={twF} onValueChange={setTwF}>
          <SelectTrigger className="sm:w-44" aria-label="Filtr okna czasowego"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Każde okno czasowe</SelectItem>
            {TIME_WINDOWS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setAppF("all"); setCompF("all"); setCountryF("all"); setTwF("all"); }}><X className="mr-1 h-4 w-4" />Resetuj</Button>
      </Card>

      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="flex min-w-max gap-3">
          {STAGES.map((s) => {
            const list = visible.filter((d) => d.stage === s.id);
            const sum = list.reduce((a, d) => a + toPLN(d), 0);
            return (
              <div
                key={s.id}
                onDragOver={(e) => { e.preventDefault(); setDragOver(s.id); }}
                onDragLeave={() => setDragOver((v) => (v === s.id ? null : v))}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(null);
                  const d = ds.deals.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                  if (d) moveTo(d, s.id);
                }}
                className={`flex w-72 flex-col rounded-lg border p-2 transition-colors ${columnClass[s.id] ?? "bg-muted/30"} ${dragOver === s.id ? "ring-2 ring-primary" : ""}`}
              >
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{s.label}</span>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatMoney(sum)}</div>
                </div>
                <div className="flex min-h-24 flex-1 flex-col gap-2">
                  {list.map((d) => (
                    <Card
                      key={d.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                      onClick={() => openEdit(d)}
                      className="cursor-pointer space-y-2 p-3 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold leading-snug text-foreground">{d.title}</div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Akcje szansy"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger><ArrowRightLeft className="mr-2 h-4 w-4" />Przenieś do</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuLabel>Etap</DropdownMenuLabel>
                                  {STAGES.map((t) => (
                                    <DropdownMenuItem key={t.id} disabled={t.id === d.stage} onClick={() => moveTo(d, t.id)}>{t.label}</DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="mr-2 h-4 w-4" />Edytuj</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => del(d)}><Trash2 className="mr-2 h-4 w-4" />Usuń</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground"><span className="mr-1" aria-label={d.country ?? "PL"}>{flagOf(d.country)}</span>{companyName(d.company_id)}{d.region ? ` · ${d.region}` : ""}</div>
                      <div className="flex flex-wrap gap-1">
                        {d.priority && <Badge variant="outline" className={prioClass[d.priority]}>{d.priority}{d.timeWindow ? `: ${twLabel(d.timeWindow)}` : ""}</Badge>}
                        <Badge variant="outline" className={appClass[d.app_type]}>{d.suggestedOffer ?? d.app_type}</Badge>
                        {!isPolish(d.languageNote) && (
                          <Badge variant="outline" title={d.languageNote} className="gap-1"><Globe className="h-3 w-3" />Język</Badge>
                        )}
                      </div>
                      {d.scoring && (
                        <div className="font-mono text-xs text-muted-foreground">T:{d.scoring.t} P:{d.scoring.p} F:{d.scoring.f} A:{d.scoring.a}</div>
                      )}
                      {(d.hypothesis || d.verificationQuestion) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary" onClick={() => setExpanded((x) => ({ ...x, [d.id]: !x[d.id] }))}>
                            <ChevronDown className={`h-3 w-3 transition-transform ${expanded[d.id] ? "rotate-180" : ""}`} />Hipoteza i haczyk
                          </button>
                          {expanded[d.id] && (
                            <div className="mt-1 space-y-1.5 text-xs">
                              {d.hypothesis && <div className="rounded border-l-2 border-amber-500 bg-amber-500/10 p-2"><span className="font-semibold">HIPOTEZA:</span> {d.hypothesis}</div>}
                              {d.verificationQuestion && <div className="rounded border-l-2 border-primary bg-primary/10 p-2"><span className="font-semibold">PYTANIE DO FIRMY:</span> {d.verificationQuestion}</div>}
                              {d.firstAction && <div className="text-muted-foreground">Pierwsza akcja: {d.firstAction}</div>}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{formatMoney(d.value, d.currency)}</span>
                        {d.expected_close_date && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{d.expected_close_date}</span>
                        )}
                      </div>
                    </Card>
                  ))}
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => openAdd(s.id)}><Plus className="mr-1 h-4 w-4" />Dodaj</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edytuj szansę sprzedaży" : "Nowa szansa sprzedaży"}</DialogTitle>
            <DialogDescription>Szczegóły oferty i etap w lejku.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="d-title">Tytuł szansy *</Label>
              <Input id="d-title" maxLength={150} placeholder="np. Audyt i Wdrożenie Systemu Smart" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Firma *</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v, contact_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Wybierz firmę" /></SelectTrigger>
                  <SelectContent>{cs.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors["company_id"] && <p className="text-xs text-destructive">{errors["company_id"]}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Osoba kontaktowa</Label>
                <Select value={form.contact_id ?? ""} onValueChange={(v) => setForm({ ...form, contact_id: v })} disabled={!form.company_id}>
                  <SelectTrigger><SelectValue placeholder={form.company_id ? "Wybierz osobę" : "Najpierw firma"} /></SelectTrigger>
                  <SelectContent>
                    {companyContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.is_decision_maker ? " ★" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Etap</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Typ aplikacji</Label>
                <Select value={form.app_type} onValueChange={(v) => setForm({ ...form, app_type: v as DealAppType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_APP_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="d-val">Wartość</Label>
                <Input id="d-val" inputMode="decimal" type="number" min={0} value={valueText} onChange={(e) => setValueText(e.target.value)} />
                {errors["value"] && <p className="text-xs text-destructive">{errors["value"]}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Waluta</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-date">Przewidywana data zamknięcia</Label>
              <Input id="d-date" type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Kraj</Label>
                <Select value={form.country ?? "PL"} onValueChange={(v) => setForm({ ...form, country: v as Country })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.flag} {c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priorytet</Label>
                <Select value={form.priority ?? ""} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Okno</Label>
                <Select value={form.timeWindow ?? ""} onValueChange={(v) => setForm({ ...form, timeWindow: v as TimeWindow })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{TIME_WINDOWS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Sugerowana oferta</Label>
                <Select value={form.suggestedOffer ?? ""} onValueChange={(v) => setForm({ ...form, suggestedOffer: v as SuggestedOffer })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{OFFERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="d-follow">Follow-up</Label>
                <Input id="d-follow" type="date" value={form.followUpDate ?? ""} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="d-region">Region</Label>
                <Input id="d-region" maxLength={100} value={form.region ?? ""} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="d-lang">Język</Label>
                <Input id="d-lang" maxLength={200} placeholder="Polski" value={form.languageNote ?? ""} onChange={(e) => setForm({ ...form, languageNote: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["t", "p", "f", "a"] as const).map((k) => (
                <div key={k} className="grid gap-1.5">
                  <Label htmlFor={`d-s-${k}`}>{k.toUpperCase()} (0-5)</Label>
                  <Input id={`d-s-${k}`} type="number" min={0} max={5} value={form.scoring?.[k] ?? ""} onChange={(e) => {
                    const v = Math.max(0, Math.min(5, Number(e.target.value) || 0));
                    setForm({ ...form, scoring: { t: 0, p: 0, f: 0, a: 0, ...form.scoring, [k]: v } });
                  }} />
                </div>
              ))}
            </div>
            {([["fact", "Fakt"], ["trigger", "Trigger"], ["hypothesis", "Hipoteza"], ["verificationQuestion", "Pytanie do firmy / Haczyk"], ["firstAction", "Pierwsza akcja"]] as const).map(([k, label]) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`d-${k}`}>{label}</Label>
                <Textarea id={`d-${k}`} rows={2} maxLength={2000} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.remoteFirst ?? false} onChange={(e) => setForm({ ...form, remoteFirst: e.target.checked })} />
              Pierwszy kontakt zdalny (remote-first)
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="d-notes">Notatki / Ustalenia</Label>
              <Textarea id="d-notes" rows={3} maxLength={2000} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editId ? (
              <Button variant="ghost" className="text-destructive" onClick={() => { const d = ds.deals.find((x) => x.id === editId); if (d) { del(d); setOpen(false); } }}>
                <Trash2 className="mr-1 h-4 w-4" />Usuń
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
              <Button onClick={submit}>{editId ? "Zapisz zmiany" : "Dodaj szansę"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
