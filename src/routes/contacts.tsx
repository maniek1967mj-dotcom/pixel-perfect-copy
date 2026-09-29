import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Info, Mail, Pencil, Phone, Plus, Search, Star, Trash2, X } from "lucide-react";
import { useCompanyStore } from "@/data/companyStore";
import type { Contact } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Baza Kontaktów B2B — CRM" },
      { name: "description", content: "Zarządzaj decydentami, relacjami i danymi kontaktowymi w zakładach." },
      { property: "og:title", content: "Baza Kontaktów B2B — CRM" },
      { property: "og:description", content: "Zarządzaj decydentami, relacjami i danymi kontaktowymi w zakładach." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type FormState = Omit<Contact, "id" | "created_at" | "updated_at">;
const emptyForm: FormState = { company_id: "", first_name: "", last_name: "", role: "", is_decision_maker: false, email: "", phone: "" };

export function DecisionBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700">
      <Star className="h-3 w-3 fill-current" />Decydent
    </Badge>
  );
}

function Page() {
  const store = useCompanyStore();
  const [q, setQ] = useState("");
  const [companyF, setCompanyF] = useState("all");
  const [onlyDM, setOnlyDM] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyName = (id: string) => store.companies.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return store.contacts.filter((c) => {
      const mq = !s || [c.first_name, c.last_name, `${c.first_name} ${c.last_name}`, c.role, c.email, c.phone].some((v) => v.toLowerCase().includes(s));
      return mq && (companyF === "all" || c.company_id === companyF) && (!onlyDM || c.is_decision_maker);
    });
  }, [store.contacts, q, companyF, onlyDM]);

  const openAdd = () => { setEditId(undefined); setForm({ ...emptyForm, company_id: companyF !== "all" ? companyF : "" }); setErrors({}); setOpen(true); };
  const openEdit = (c: Contact) => {
    setEditId(c.id);
    setForm({ company_id: c.company_id, first_name: c.first_name, last_name: c.last_name, role: c.role, is_decision_maker: c.is_decision_maker, email: c.email, phone: c.phone });
    setErrors({}); setOpen(true);
  };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.company_id) e["company_id"] = "Wybierz firmę";
    if (!form.first_name.trim()) e["first_name"] = "Imię jest wymagane";
    if (!form.last_name.trim()) e["last_name"] = "Nazwisko jest wymagane";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e["email"] = "Nieprawidłowy e-mail";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), role: form.role.trim(), email: form.email.trim(), phone: form.phone.trim() };
    if (editId) store.updateContact(editId, data); else store.addContact(data);
    toast.success(editId ? "Zapisano zmiany kontaktu" : "Dodano nowy kontakt");
    setOpen(false);
  };
  const remove = (c: Contact) => {
    if (!confirm(`Usunąć kontakt „${c.first_name} ${c.last_name}”?`)) return;
    store.deleteContact(c.id);
    toast.success("Usunięto kontakt");
  };
  const copy = async (email: string) => {
    try { await navigator.clipboard.writeText(email); toast.success("Skopiowano e-mail"); } catch { toast.error("Nie udało się skopiować"); }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Baza Kontaktów B2B</h1>
            <p className="text-sm text-muted-foreground">Zarządzaj decydentami, relacjami i danymi kontaktowymi w zakładach</p>
          </div>
          <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Dodaj Kontakt</Button>
        </div>

        <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" aria-label="Szukaj kontaktów" placeholder="Imię, nazwisko, stanowisko, e-mail lub telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={companyF} onValueChange={setCompanyF}>
            <SelectTrigger className="lg:w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie firmy</SelectItem>
              {store.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <Switch checked={onlyDM} onCheckedChange={setOnlyDM} />Tylko decydenci
          </label>
          <Button variant="outline" onClick={() => { setQ(""); setCompanyF("all"); setOnlyDM(false); }}><X className="mr-1 h-4 w-4" />Resetuj</Button>
        </Card>

        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i Nazwisko</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Rola / Stanowisko</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.ready && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Brak kontaktów spełniających kryteria.</TableCell></TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{c.first_name} {c.last_name}</span>
                      {c.is_decision_maker && <DecisionBadge />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link to="/companies" search={{ open: c.company_id }} className="text-sm text-primary underline-offset-4 hover:underline">
                      {companyName(c.company_id)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{c.role || "—"}</TableCell>
                  <TableCell>
                    {c.email ? (
                      <div className="flex items-center gap-1">
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><Mail className="h-3.5 w-3.5" />{c.email}</a>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Kopiuj e-mail" onClick={() => copy(c.email)}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.phone ? (
                      <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{c.phone}</a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edytuj" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Usuń" className="text-destructive" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edytuj kontakt" : "Dodaj kontakt"}</DialogTitle>
            <DialogDescription>Dane osoby kontaktowej w firmie.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Firma *</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz firmę" /></SelectTrigger>
                <SelectContent>{store.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors["company_id"] && <p className="text-xs text-destructive">{errors["company_id"]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-fn">Imię *</Label>
                <Input id="c-fn" maxLength={60} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                {errors["first_name"] && <p className="text-xs text-destructive">{errors["first_name"]}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-ln">Nazwisko *</Label>
                <Input id="c-ln" maxLength={60} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                {errors["last_name"] && <p className="text-xs text-destructive">{errors["last_name"]}</p>}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-role">Rola / Stanowisko</Label>
              <Input id="c-role" maxLength={100} placeholder="np. Dyrektor Zakładu" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="c-dm" checked={form.is_decision_maker} onCheckedChange={(v) => setForm({ ...form, is_decision_maker: v })} />
              <Label htmlFor="c-dm">Czy jest Decydentem?</Label>
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent>Zaznacz, jeśli osoba podejmuje decyzje zakupowe / wdrożeniowe</TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-em">E-mail</Label>
                <Input id="c-em" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-ph">Telefon</Label>
                <Input id="c-ph" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={submit}>{editId ? "Zapisz zmiany" : "Dodaj kontakt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
