import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Calendar, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCompanyStore } from "@/data/companyStore";
import { useDealStore, STAGES, DEAL_APP_TYPES, formatMoney, toPLN, type Deal, type Stage, type DealAppType } from "@/data/dealStore";
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
const columnClass: Partial<Record<Stage, string>> = {
  wygrana: "border-emerald-500/40 bg-emerald-500/5",
  przegrana: "border-red-500/30 bg-muted/60",
};

type FormState = Omit<Deal, "id" | "created_at">;
const emptyForm = (): FormState => ({ title: "", company_id: "", contact_id: "", stage: "sygnal", value: 0, currency: "PLN", app_type: "Fabryka Smart", expected_close_date: "", notes: "" });

function Page() {
  const cs = useCompanyStore();
  const ds = useDealStore();
  const [appF, setAppF] = useState("all");
  const [compF, setCompF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [valueText, setValueText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const companyName = (id: string) => cs.companies.find((c) => c.id === id)?.name ?? "—";
  const visible = useMemo(
    () => ds.deals.filter((d) => (appF === "all" || d.app_type === appF) && (compF === "all" || d.company_id === compF)),
    [ds.deals, appF, compF],
  );
  const active = visible.filter((d) => d.stage !== "przegrana");
  const activeTotal = active.reduce((s, d) => s + toPLN(d), 0);

  const openAdd = (stage: Stage = "sygnal") => { setEditId(undefined); setForm({ ...emptyForm(), stage }); setValueText(""); setErrors({}); setOpen(true); };
  const openEdit = (d: Deal) => {
    setEditId(d.id);
    setForm({ title: d.title, company_id: d.company_id, contact_id: d.contact_id ?? "", stage: d.stage, value: d.value, currency: d.currency, app_type: d.app_type, expected_close_date: d.expected_close_date, notes: d.notes ?? "" });
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
    ds.upsert(data, editId);
    toast.success(editId ? "Zapisano szansę sprzedaży" : "Dodano nową szansę sprzedaży");
    setOpen(false);
  };
  const moveTo = (d: Deal, stage: Stage) => {
    if (d.stage === stage) return;
    ds.move(d.id, stage);
    toast.success(`Przeniesiono do: ${STAGES.find((s) => s.id === stage)?.label}`);
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Aktywna wartość lejka</div>
          <div className="text-2xl font-semibold text-foreground">{formatMoney(activeTotal)}</div>
          <div className="text-xs text-muted-foreground">bez przegranych · EUR przeliczone po 4,30 zł</div>
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
        <Button variant="outline" onClick={() => { setAppF("all"); setCompF("all"); }}><X className="mr-1 h-4 w-4" />Resetuj</Button>
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
                      <div className="text-xs text-muted-foreground">{companyName(d.company_id)}</div>
                      <Badge variant="outline" className={appClass[d.app_type]}>{d.app_type}</Badge>
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
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as "PLN" | "EUR" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PLN">PLN</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-date">Przewidywana data zamknięcia</Label>
              <Input id="d-date" type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
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
