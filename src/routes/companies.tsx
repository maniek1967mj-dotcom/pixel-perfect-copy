import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, MoreHorizontal, Pencil, Plus, Search, Trash2, Eye, X } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { useCompanyStore, ALL_POTENTIALS, SIZES } from "@/data/companyStore";
import type { AppPotential, Company } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Baza Firm B2B — CRM" },
      { name: "description", content: "Zarządzaj kontami, parkiem maszynowym i potencjałem wdrożeniowym firm." },
      { property: "og:title", content: "Baza Firm B2B — CRM" },
      { property: "og:description", content: "Zarządzaj kontami, parkiem maszynowym i potencjałem wdrożeniowym firm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { open?: string } =>
    typeof s["open"] === "string" ? { open: s["open"] } : {},
  component: Page,
});

const potentialClass: Record<string, string> = {
  "Fabryka Smart": "bg-blue-500/15 text-blue-700 border-blue-500/30",
  "Asystent Restauracji": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  CRM: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Inne: "bg-muted text-muted-foreground border-border",
};

function PotentialBadge({ p }: { p: string }) {
  return <Badge variant="outline" className={potentialClass[p] ?? potentialClass['Inne']}>{p}</Badge>;
}

type FormState = { name: string; nip: string; industry: string; size: string; machine_park: string; app_potential: AppPotential[] };
const emptyForm: FormState = { name: "", nip: "", industry: "", size: "", machine_park: "", app_potential: [] };

function Page() {
  const store = useCompanyStore();
  const [q, setQ] = useState("");
  const [pot, setPot] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; nip?: string }>({});
  const search = Route.useSearch();
  const [detailId, setDetailId] = useState<string | null>(search.open ?? null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return store.companies.filter((c) => {
      const matchQ = !s || [c.name, c.nip, c.machine_park ?? ""].some((v) => v.toLowerCase().includes(s));
      const matchP = pot === "all" || c.app_potential.includes(pot as AppPotential);
      return matchQ && matchP;
    });
  }, [store.companies, q, pot]);

  const openAdd = () => { setEditId(undefined); setForm(emptyForm); setErrors({}); setFormOpen(true); };
  const openEdit = (c: Company) => {
    setEditId(c.id);
    setForm({ name: c.name, nip: c.nip, industry: c.industry, size: c.size, machine_park: c.machine_park ?? "", app_potential: c.app_potential });
    setErrors({}); setFormOpen(true);
  };
  const submit = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Nazwa firmy jest wymagana";
    if (!form.nip.trim()) e.nip = "NIP jest wymagany";
    setErrors(e);
    if (Object.keys(e).length) return;
    store.upsertCompany({ ...form, name: form.name.trim(), nip: form.nip.trim() }, editId);
    toast.success(editId ? "Zapisano zmiany firmy" : "Dodano nową firmę");
    setFormOpen(false);
  };
  const remove = (c: Company) => {
    if (!confirm(`Usunąć firmę „${c.name}”?`)) return;
    store.deleteCompany(c.id);
    toast.success("Usunięto firmę");
  };
  const togglePot = (p: AppPotential) =>
    setForm((f) => ({ ...f, app_potential: f.app_potential.includes(p) ? f.app_potential.filter((x) => x !== p) : [...f.app_potential, p] }));

  const detail = store.companies.find((c) => c.id === detailId) ?? null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Baza Firm B2B</h1>
            <p className="text-sm text-muted-foreground">Zarządzaj kontami, parkiem maszynowym i potencjałem wdrożeniowym</p>
          </div>
          <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Dodaj Firmę</Button>
        </div>

        {store.ready && store.companies.length === 0 ? (
          <EmptyState icon={Building2} title="Brak firm" text="Dodaj pierwszą firmę ręcznie lub zaimportuj leady ze Skanera Leadów." action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Dodaj Firmę</Button><Button variant="outline" asChild><Link to="/importer">Importuj ze skanera</Link></Button></div>} />
        ) : (<>
        <Card className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Szukaj po nazwie, NIP lub parku maszynowym (np. Mazak, Laser)…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={pot} onValueChange={setPot}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Potencjał" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie potencjały</SelectItem>
              {ALL_POTENTIALS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setQ(""); setPot("all"); }}><X className="mr-1 h-4 w-4" />Resetuj</Button>
        </Card>

        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firma</TableHead>
                <TableHead>Branża & Wielkość</TableHead>
                <TableHead>Park Maszynowy</TableHead>
                <TableHead>Potencjał Aplikacji</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.ready && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Brak firm spełniających kryteria.</TableCell></TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailId(c.id)}>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">NIP: {c.nip}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{c.industry || "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.size || "—"}</div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <Tooltip>
                      <TooltipTrigger asChild><div className="truncate text-sm">{c.machine_park || "—"}</div></TooltipTrigger>
                      <TooltipContent className="max-w-xs">{c.machine_park || "Brak danych"}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">{c.app_potential.map((p) => <PotentialBadge key={p} p={p} />)}</div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetailId(c.id)}><Eye className="mr-1 h-4 w-4" />Szczegóły</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Więcej akcji"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edytuj</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(c)}><Trash2 className="mr-2 h-4 w-4" />Usuń</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        </>)}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edytuj firmę" : "Dodaj firmę"}</DialogTitle>
            <DialogDescription>Uzupełnij dane konta B2B.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="f-name">Nazwa firmy *</Label>
              <Input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="f-nip">NIP *</Label>
                <Input id="f-nip" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
                {errors.nip && <p className="text-xs text-destructive">{errors.nip}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-ind">Branża</Label>
                <Input id="f-ind" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Wielkość firmy</Label>
              <Select value={SIZES.includes(form.size) ? form.size : ""} onValueChange={(v) => setForm({ ...form, size: v })}>
                <SelectTrigger><SelectValue placeholder={form.size || "Wybierz"} /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-mp">Park Maszynowy</Label>
              <Textarea id="f-mp" rows={3} value={form.machine_park} onChange={(e) => setForm({ ...form, machine_park: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Potencjał Aplikacji</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_POTENTIALS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.app_potential.includes(p)} onCheckedChange={() => togglePot(p)} />{p}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
            <Button onClick={submit}>{editId ? "Zapisz zmiany" : "Dodaj firmę"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && <CompanyDetail company={detail} store={store} />}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

function CompanyDetail({ company, store }: { company: Company; store: ReturnType<typeof useCompanyStore> }) {
  const contacts = store.contacts.filter((c) => c.company_id === company.id);
  const blank = { first_name: "", last_name: "", role: "", email: "", phone: "", is_decision_maker: false };
  const [f, setF] = useState(blank);
  const add = () => {
    if (!f.first_name.trim() || !f.last_name.trim()) { toast.error("Imię i nazwisko są wymagane"); return; }
    store.addContact({ ...f, company_id: company.id });
    setF(blank);
    toast.success("Dodano kontakt");
  };
  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{company.name}</SheetTitle>
        <SheetDescription>NIP: {company.nip}</SheetDescription>
      </SheetHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">Branża</div>{company.industry || "—"}</div>
        <div><div className="text-xs text-muted-foreground">Wielkość</div>{company.size || "—"}</div>
      </div>
      <div className="text-sm">
        <div className="mb-1 text-xs text-muted-foreground">Park maszynowy</div>
        <p className="whitespace-pre-wrap">{company.machine_park || "—"}</p>
      </div>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Potencjał aplikacji</div>
        <div className="flex flex-wrap gap-1">{company.app_potential.map((p) => <PotentialBadge key={p} p={p} />)}</div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Kontakty ({contacts.length})</h3>
        <div className="space-y-2">
          {contacts.length === 0 && <p className="text-sm text-muted-foreground">Brak kontaktów.</p>}
          {contacts.map((c) => (
            <Card key={c.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.first_name} {c.last_name}</span>
                {c.is_decision_maker && <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">Decydent</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{c.role}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.email} · {c.phone}</div>
            </Card>
          ))}
        </div>
      </div>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Szybko dodaj kontakt</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Imię *" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          <Input placeholder="Nazwisko *" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
          <Input className="col-span-2" placeholder="Stanowisko" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
          <Input placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input placeholder="Telefon" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={f.is_decision_maker} onCheckedChange={(v) => setF({ ...f, is_decision_maker: v === true })} />Decydent
        </label>
        <Button className="w-full" onClick={add}><Plus className="mr-1 h-4 w-4" />Dodaj kontakt</Button>
      </Card>
    </div>
  );
}
