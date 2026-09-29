import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, ExternalLink, FileText, MapPin, Sparkles, User } from "lucide-react";
import { parseScanReport, coldMessage, type ParsedLead } from "@/utils/scanParser";
import { EmptyState } from "@/components/layout/EmptyState";
import { importLead, readImported } from "@/utils/leadImport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/importer")({
  head: () => ({
    meta: [
      { title: "Skaner Leadów & Smart Import — CRM" },
      { name: "description", content: "Wklej poranny raport ze skanera i zamień leady w szanse sprzedaży jednym kliknięciem." },
      { property: "og:title", content: "Skaner Leadów & Smart Import — CRM" },
      { property: "og:description", content: "Wklej poranny raport ze skanera i zamień leady w szanse sprzedaży jednym kliknięciem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function fitClass(fit?: string) {
  const f = (fit ?? "").toUpperCase();
  if (f.includes("BARDZO")) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/40";
  if (f.includes("MOCNE")) return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function Page() {
  const [raw, setRaw] = useState("");
  const [leads, setLeads] = useState<ParsedLead[] | null>(null);
  const [imported, setImported] = useState<string[]>([]);
  useEffect(() => setImported(readImported()), []);

  const process = () => {
    const res = parseScanReport(raw);
    setLeads(res);
    if (res.length) toast.success(`Znaleziono leadów: ${res.length}`);
    else toast.error("Nie znaleziono tabel z leadami w raporcie");
  };
  const doImport = (l: ParsedLead) => {
    importLead(l);
    setImported(readImported());
    toast.success(`Zaimportowano ${l.company_name} – firma, kontakt i szansa w lejku`);
  };
  const copy = async (l: ParsedLead) => {
    try { await navigator.clipboard.writeText(coldMessage(l)); toast.success("Skopiowano wiadomość"); } catch { toast.error("Nie udało się skopiować"); }
  };

  const b = leads?.filter((l) => l.source_table === "FABRYKA_SMART") ?? [];
  const a = leads?.filter((l) => l.source_table === "MARIUSZ_INTERIM") ?? [];

  const list = (items: ParsedLead[]) =>
    items.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">Brak leadów w tej tabeli.</p>
    ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((l) => {
          const done = imported.includes(l.key);
          return (
            <Card key={l.key} className={`flex flex-col gap-3 p-4 ${done ? "opacity-75" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="mr-auto font-semibold text-foreground">{l.company_name}</h3>
                {l.location && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{l.location}</Badge>}
                {l.fit_score && <Badge variant="outline" className={fitClass(l.fit_score)}>{l.fit_score}</Badge>}
              </div>
              {l.industry && <div className="text-xs text-muted-foreground">{l.industry} · sugerowane: {l.suggested_app}</div>}
              <div className="text-sm"><span className="font-semibold">Fakt (Sygnał):</span> {l.signal_fact || "—"}</div>
              {l.hypothesis_pain && (
                <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/10 p-3 text-sm">
                  <span className="font-semibold">Hipoteza Bólu:</span> {l.hypothesis_pain}
                </div>
              )}
              <div className="flex items-center gap-1 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-semibold">Namiar / Kontakt:</span> {l.contact_person ?? "nie zidentyfikowano"}</div>
              {l.source_url && (
                <a href={l.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />Link źródłowy
                </a>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button size="sm" disabled={done} onClick={() => doImport(l)}>
                  {done ? <><Check className="mr-1 h-4 w-4" />Zaimportowano</> : <><Download className="mr-1 h-4 w-4" />Importuj do CRM</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(l)}><Copy className="mr-1 h-4 w-4" />Kopiuj Cold Message</Button>
              </div>
            </Card>
          );
        })}
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Skaner Leadów & Smart Import</h1>
        <p className="text-sm text-muted-foreground">Wklej poranny raport ze skanera sieci i przekształć go 1-kliknięciem w gotowe szanse w CRM</p>
      </div>

      <Card className="space-y-3 p-4">
        <Textarea
          rows={10}
          className="font-mono text-xs"
          aria-label="Raport ze skanera"
          placeholder="Wklej tutaj cały raport ze skanera (Tabela A i Tabela B)..."
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={process} disabled={!raw.trim()}><Sparkles className="mr-1 h-4 w-4" />Przetwórz Raport</Button>
        </div>
      </Card>

      {!leads && (
        <EmptyState icon={FileText} title="Wklej pierwszy raport ze skanera" text="Wklej raport z Tabelą A i Tabelą B w pole powyżej, a następnie kliknij „Przetwórz Raport”." action={<Button variant="outline" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Raport ze skanera"]')?.focus()}>Wklej raport</Button>} />
      )}

      {leads && (
        <Tabs defaultValue="b">
          <TabsList>
            <TabsTrigger value="b">Fabryka Smart (Tabela B) · {b.length}</TabsTrigger>
            <TabsTrigger value="a">Zlecenia Mariusz (Tabela A) · {a.length}</TabsTrigger>
          </TabsList>
          <TabsContent value="b" className="mt-4">{list(b)}</TabsContent>
          <TabsContent value="a" className="mt-4">{list(a)}</TabsContent>
        </Tabs>
      )}
    </div>
  );
}
