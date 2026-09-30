import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Phone, PhoneCall, Plus, Target } from "lucide-react";
import { useCompanyStore } from "@/data/companyStore";
import { useDealStore, type Deal } from "@/data/dealStore";
import { useActivityStore, OUTCOMES, outcomeLabel, type Activity, type CallOutcome } from "@/data/activityStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Centrum Połączeń i Kalendarz — Fabryka Smart CRM" },
      { name: "description", content: "Dzienny cel telefonów, kalendarz follow-upów i audytów oraz dziennik rozmów." },
      { property: "og:title", content: "Centrum Połączeń i Kalendarz — Fabryka Smart CRM" },
      { property: "og:description", content: "Dzienny cel telefonów, kalendarz follow-upów i audytów oraz dziennik rozmów." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const DAILY_TARGET = 10;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const fmtDay = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" });
const OPEN = (d: Deal) => d.stage !== "wygrana" && d.stage !== "przegrana";

type Kind = "done" | "planned" | "overdue" | "audit";
interface CalEvent { key: string; date: string; kind: Kind; label: string; dealId?: string; activityId?: string }
const KIND_CLS: Record<Kind, string> = {
  done: "bg-ev-done/15 text-ev-done border-ev-done/40",
  planned: "bg-ev-planned/15 text-ev-planned border-ev-planned/40",
  overdue: "bg-ev-overdue/15 text-ev-overdue border-ev-overdue/40",
  audit: "bg-ev-audit/15 text-ev-audit border-ev-audit/40",
};

function Page() {
  const cs = useCompanyStore();
  const ds = useDealStore();
  const as = useActivityStore();
  const today = ymd(new Date());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMode, setCalMode] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(today);
  const [logDeal, setLogDeal] = useState<string | null>(null); // "" = choose
  const [dayDialog, setDayDialog] = useState<string | null>(null);

  const companyName = (id: string) => cs.companies.find((c) => c.id === id)?.name ?? "—";
  const dealById = (id?: string) => ds.deals.find((d) => d.id === id);
  const contactOf = (d?: Deal) => (d?.contact_id ? cs.contacts.find((c) => c.id === d.contact_id) : undefined);

  const calls = as.activities.filter((a) => a.type === "call");
  const weekStart = (() => { const d = new Date(today + "T12:00:00"); const dow = (d.getDay() + 6) % 7; return addDays(today, -dow); })();
  const todayCalls = calls.filter((a) => a.date === today).length;
  const weekCalls = calls.filter((a) => a.date >= weekStart && a.date <= today);
  const weekAudits = weekCalls.filter((a) => a.outcome === "audyt").length;
  const conversion = weekCalls.length ? Math.round((weekAudits / weekCalls.length) * 100) : 0;
  const openDeals = ds.deals.filter(OPEN);
  const overdue = openDeals.filter((d) => d.followUpDate && d.followUpDate < today);
  const scheduledDone = calls.filter((a) => a.wasScheduled).length;
  const scheduledRate = scheduledDone + overdue.length ? Math.round((scheduledDone / (scheduledDone + overdue.length)) * 100) : 0;

  const events = useMemo<CalEvent[]>(() => {
    const ev: CalEvent[] = [];
    for (const d of ds.deals) {
      if (OPEN(d) && d.followUpDate) ev.push({ key: "f" + d.id, date: d.followUpDate, kind: d.followUpDate < today ? "overdue" : "planned", label: `📞 ${companyName(d.company_id)}`, dealId: d.id });
    }
    for (const a of as.activities) {
      if (a.type === "call") ev.push({ key: a.id, date: a.date, kind: "done", label: `✔ ${a.title}`, activityId: a.id, dealId: a.deal_id });
      else ev.push({ key: a.id, date: a.date, kind: a.done ? "done" : "audit", label: `${a.type === "audit" ? "🏭" : "🤝"} ${a.title}`, activityId: a.id, dealId: a.deal_id });
    }
    return ev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds.deals, as.activities, cs.companies, today]);

  const reschedule = (e: CalEvent, date: string) => {
    if (e.kind === "done") return toast.error("Zrealizowanych zdarzeń nie można przenosić");
    if (e.activityId) as.update(e.activityId, { date });
    else if (e.dealId) ds.patch(e.dealId, { followUpDate: date });
    toast.success(`Przeniesiono na ${fmtDay(date)}`);
  };

  const exportIcs = () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const items = events.filter((e) => e.kind !== "done");
    if (!items.length) return toast.error("Brak zaplanowanych zadań do eksportu");
    const body = items.map((e) => {
      const d = e.date.replace(/-/g, ""), n = addDays(e.date, 1).replace(/-/g, "");
      const deal = dealById(e.dealId); const ct = contactOf(deal);
      const desc = [deal?.title, ct?.name, ct?.phone, ct?.email].filter(Boolean).join(" | ");
      return ["BEGIN:VEVENT", `UID:${e.key}@fabryka-smart-crm`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${n}`, `SUMMARY:${esc(e.label)}`, `DESCRIPTION:${esc(desc)}`, "END:VEVENT"].join("\r\n");
    });
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fabryka Smart CRM//PL", "CALSCALE:GREGORIAN", ...body, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `fabryka-smart-zadania-${today}.ics`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Wyeksportowano ${items.length} zdarzeń`);
  };

  const todayList = openDeals.filter((d) => d.followUpDate && d.followUpDate <= today).sort((a, b) => (a.followUpDate! < b.followUpDate! ? -1 : 1));
  const todayMeetings = as.activities.filter((a) => a.type !== "call" && !a.done && a.date === today);
  const log = [...calls].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centrum Połączeń i Kalendarz Efektywności</h1>
          <p className="text-sm text-muted-foreground">Dzisiejsze telefony, follow-upy, audyty Gemba i historia rozmów.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportIcs}><Download className="mr-1 h-4 w-4" />Eksportuj do Google / Outlook (ICS)</Button>
          <Button onClick={() => setLogDeal("")}><PhoneCall className="mr-1 h-4 w-4" />Zarejestruj Rozmowę</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4" />Cel na dziś: 5-10 telefonów</div>
          <div className="mt-1 text-2xl font-bold">{todayCalls}/{DAILY_TARGET} <span className="text-sm font-normal text-muted-foreground">wykonanych - {Math.min(100, Math.round((todayCalls / DAILY_TARGET) * 100))}%</span></div>
          <Progress value={Math.min(100, (todayCalls / DAILY_TARGET) * 100)} className="mt-2" />
        </Card>
        <Kpi label="Liczba rozmów w tym tygodniu" value={String(weekCalls.length)} />
        <Kpi label="Konwersja: Rozmowy → Audyty Gemba" value={`${conversion}%`} sub={`${weekAudits} audytów w tym tygodniu`} />
        <Kpi label="Zrealizowane zaplanowane kontakty" value={`${scheduledRate}%`} sub={`${overdue.length} zaległych`} />
      </div>

      <div className="inline-flex rounded-lg border bg-muted p-1">
        <button onClick={() => setView("list")} className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 text-sm", view === "list" && "bg-background shadow-sm font-medium")}><List className="h-4 w-4" />Widok Listy (Dziś)</button>
        <button onClick={() => setView("calendar")} className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 text-sm", view === "calendar" && "bg-background shadow-sm font-medium")}><CalendarDays className="h-4 w-4" />Widok Kalendarza (Tydzień / Miesiąc)</button>
      </div>

      {view === "list" ? (
        <Card className="divide-y">
          {todayList.length === 0 && todayMeetings.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Brak zaplanowanych połączeń na dziś. Ustaw follow-up w lejku lub kliknij dzień w kalendarzu.</div>
          )}
          {todayMeetings.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><span className={cn("mr-2 rounded border px-2 py-0.5 text-xs", KIND_CLS.audit)}>{a.type === "audit" ? "Audyt Gemba" : "Spotkanie B2B"}</span><span className="font-medium">{a.title}</span></div>
              <Button size="sm" variant="outline" onClick={() => { as.update(a.id, { done: true }); toast.success("Oznaczono jako zrealizowane"); }}>Zrealizowane</Button>
            </div>
          ))}
          {todayList.map((d) => {
            const ct = contactOf(d); const late = d.followUpDate! < today;
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded border px-2 py-0.5 text-xs", late ? KIND_CLS.overdue : KIND_CLS.planned)}>{late ? `Zaległe (${fmtDay(d.followUpDate!)})` : "Dziś"}</span>
                    <span className="font-medium">{companyName(d.company_id)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{d.title}{ct ? ` · ${ct.name}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  {ct?.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${ct.phone.replace(/\s/g, "")}`}><Phone className="mr-1 h-4 w-4" />{ct.phone}</a></Button>}
                  <Button size="sm" onClick={() => setLogDeal(d.id)}><PhoneCall className="mr-1 h-4 w-4" />Zarejestruj Rozmowę</Button>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <CalendarView mode={calMode} setMode={setCalMode} cursor={cursor} setCursor={setCursor} today={today} events={events}
          onDrop={reschedule} onDayClick={setDayDialog} onEventClick={(e) => e.dealId && e.kind !== "done" && setLogDeal(e.dealId)} />
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Dziennik Aktywności i Historia Rozmów</h2>
        <Card className="divide-y">
          {log.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Brak zarejestrowanych rozmów.</div>}
          {log.map((a) => {
            const o = outcomeLabel(a.outcome);
            return (
              <div key={a.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                {o && <div className="mt-1 text-xs font-medium">{o.emoji} {o.label}</div>}
                {a.note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.note}</p>}
              </div>
            );
          })}
        </Card>
      </div>

      <CallLogDialog open={logDeal !== null} dealId={logDeal ?? ""} onClose={() => setLogDeal(null)} deals={openDeals} companyName={companyName} today={today}
        onSave={(dealId, note, outcome, date) => {
          const d = dealById(dealId); if (!d) return;
          const title = `${companyName(d.company_id)} — ${d.title}`;
          as.add({ type: "call", deal_id: d.id, title, date: today, done: true, note, outcome, wasScheduled: !!d.followUpDate && d.followUpDate <= today });
          if (outcome === "audyt") {
            ds.patch(d.id, { stage: "audyt_gemba", followUpDate: undefined });
            as.add({ type: "audit", deal_id: d.id, title: `Audyt Gemba: ${companyName(d.company_id)}`, date, done: false });
          } else if (outcome === "ponowny") ds.patch(d.id, { followUpDate: date });
          else if (outcome === "oferta") ds.patch(d.id, { stage: "propozycja", followUpDate: addDays(today, 3) });
          else if (outcome === "odrzucony") ds.patch(d.id, { stage: "przegrana", followUpDate: undefined });
          else ds.patch(d.id, { followUpDate: addDays(today, 1) });
          toast.success("Zarejestrowano rozmowę");
          setLogDeal(null);
        }} />

      <DayDialog date={dayDialog} onClose={() => setDayDialog(null)} deals={openDeals} companyName={companyName}
        onSave={(date, type, dealId) => {
          const d = dealById(dealId); if (!d) return;
          if (type === "followup") ds.patch(d.id, { followUpDate: date });
          else as.add({ type, deal_id: d.id, title: `${type === "audit" ? "Audyt Gemba" : "Spotkanie B2B"}: ${companyName(d.company_id)}`, date, done: false });
          toast.success(`Dodano na ${fmtDay(date)}`);
          setDayDialog(null);
        }} />
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function CalendarView({ mode, setMode, cursor, setCursor, today, events, onDrop, onDayClick, onEventClick }: {
  mode: "week" | "month"; setMode: (m: "week" | "month") => void; cursor: string; setCursor: (s: string) => void; today: string;
  events: CalEvent[]; onDrop: (e: CalEvent, date: string) => void; onDayClick: (d: string) => void; onEventClick: (e: CalEvent) => void;
}) {
  const c = new Date(cursor + "T12:00:00");
  const days: string[] = [];
  let start: string;
  if (mode === "week") { start = addDays(cursor, -((c.getDay() + 6) % 7)); for (let i = 0; i < 7; i++) days.push(addDays(start, i)); }
  else {
    const first = ymd(new Date(c.getFullYear(), c.getMonth(), 1, 12));
    start = addDays(first, -((new Date(first + "T12:00:00").getDay() + 6) % 7));
    for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  }
  const month = c.getMonth();
  const title = mode === "week" ? `${fmtDay(days[0])} – ${fmtDay(days[6])}` : c.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const step = (dir: number) => {
    if (mode === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(ymd(new Date(c.getFullYear(), c.getMonth() + dir, 1, 12)));
  };
  const [drag, setDrag] = useState<CalEvent | null>(null);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => step(-1)} aria-label="Poprzedni"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(today)}>Dziś</Button>
          <Button size="icon" variant="outline" onClick={() => step(1)} aria-label="Następny"><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 font-semibold capitalize">{title}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "week" ? "default" : "outline"} onClick={() => setMode("week")}>Tydzień</Button>
          <Button size="sm" variant={mode === "month" ? "default" : "outline"} onClick={() => setMode("month")}>Miesiąc</Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <Legend k="done" t="Zrealizowane rozmowy / spotkania" /><Legend k="planned" t="Zaplanowane połączenia" />
        <Legend k="overdue" t="Zaległe połączenia" /><Legend k="audit" t="Audyty Gemba / Spotkania B2B" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const list = events.filter((e) => e.date === day);
          const dim = mode === "month" && new Date(day + "T12:00:00").getMonth() !== month;
          return (
            <div key={day} onClick={() => onDayClick(day)}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag && drag.date !== day) onDrop(drag, day); setDrag(null); }}
              className={cn("cursor-pointer rounded-md border p-1 text-left transition-colors hover:bg-muted/60", mode === "week" ? "min-h-40" : "min-h-24", dim && "opacity-50", day === today && "border-primary ring-1 ring-primary")}>
              <div className="mb-1 text-xs font-semibold">{new Date(day + "T12:00:00").getDate()}</div>
              <div className="space-y-1">
                {list.slice(0, mode === "month" ? 3 : 20).map((e) => (
                  <div key={e.key} draggable={e.kind !== "done"} onDragStart={() => setDrag(e)}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    title={e.label} className={cn("truncate rounded border px-1 py-0.5 text-[11px]", KIND_CLS[e.kind], e.kind !== "done" && "cursor-grab")}>{e.label}</div>
                ))}
                {mode === "month" && list.length > 3 && <div className="text-[11px] text-muted-foreground">+{list.length - 3} więcej</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Przeciągnij zdarzenie na inny dzień, aby je przełożyć. Kliknij dzień, aby dodać follow-up lub audyt.</p>
    </Card>
  );
}

function Legend({ k, t }: { k: Kind; t: string }) {
  return <span className="flex items-center gap-1"><span className={cn("h-3 w-3 rounded-full border", KIND_CLS[k])} />{t}</span>;
}

function DealSelect({ deals, value, onChange, companyName }: { deals: Deal[]; value: string; onChange: (v: string) => void; companyName: (id: string) => string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Wybierz szansę sprzedaży" /></SelectTrigger>
      <SelectContent>{deals.map((d) => <SelectItem key={d.id} value={d.id}>{companyName(d.company_id)} — {d.title}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function CallLogDialog({ open, dealId, onClose, deals, companyName, today, onSave }: {
  open: boolean; dealId: string; onClose: () => void; deals: Deal[]; companyName: (id: string) => string; today: string;
  onSave: (dealId: string, note: string, outcome: CallOutcome, date: string) => void;
}) {
  const [sel, setSel] = useState(""); const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | null>(null); const [date, setDate] = useState("");
  const [lastKey, setLastKey] = useState("");
  const key = `${open}-${dealId}`;
  if (key !== lastKey) { setLastKey(key); setSel(dealId); setNote(""); setOutcome(null); setDate(addDays(today, 3)); }
  const needsDate = outcome === "audyt" || outcome === "ponowny";
  const submit = () => {
    if (!sel) return toast.error("Wybierz szansę sprzedaży");
    if (!note.trim()) return toast.error("Notatka jest wymagana");
    if (!outcome) return toast.error("Wybierz wynik rozmowy");
    if (needsDate && !date) return toast.error("Wybierz datę");
    onSave(sel, note.trim(), outcome, date);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Zarejestruj Rozmowę</DialogTitle><DialogDescription>Notatka i szybka kwalifikacja wyniku.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {!dealId && (deals.length ? <DealSelect deals={deals} value={sel} onChange={setSel} companyName={companyName} /> : <p className="text-sm text-muted-foreground">Brak otwartych szans w lejku.</p>)}
          {dealId && <p className="text-sm font-medium">{(() => { const d = deals.find((x) => x.id === dealId); return d ? `${companyName(d.company_id)} — ${d.title}` : ""; })()}</p>}
          <div className="space-y-1"><Label>Notatka / Komentarz *</Label><Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Co ustalono w rozmowie?" /></div>
          <div className="space-y-2">
            <Label>Szybka Kwalifikacja</Label>
            <div className="grid gap-2">
              {OUTCOMES.map((o) => (
                <Button key={o.id} type="button" variant={outcome === o.id ? "default" : "outline"} className="justify-start" onClick={() => setOutcome(o.id)}>{o.emoji} {o.label}</Button>
              ))}
            </div>
          </div>
          {needsDate && (
            <div className="space-y-1"><Label>{outcome === "audyt" ? "Data Audytu Gemba" : "Data ponownego kontaktu"}</Label><Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Anuluj</Button><Button onClick={submit}>Zapisz rozmowę</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayDialog({ date, onClose, deals, companyName, onSave }: {
  date: string | null; onClose: () => void; deals: Deal[]; companyName: (id: string) => string;
  onSave: (date: string, type: "followup" | "audit" | "meeting", dealId: string) => void;
}) {
  const [type, setType] = useState<"followup" | "audit" | "meeting">("followup");
  const [sel, setSel] = useState("");
  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Zaplanuj na {date && fmtDay(date)}</DialogTitle><DialogDescription>Dodaj follow-up, Audyt Gemba lub spotkanie B2B.</DialogDescription></DialogHeader>
        {deals.length === 0 ? <p className="text-sm text-muted-foreground">Brak otwartych szans w lejku — dodaj je najpierw w Lejku Sprzedaży.</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {([["followup", "📞 Follow-up"], ["audit", "🏭 Audyt Gemba"], ["meeting", "🤝 Spotkanie"]] as const).map(([k, l]) => (
                <Button key={k} size="sm" variant={type === k ? "default" : "outline"} onClick={() => setType(k)}>{l}</Button>
              ))}
            </div>
            <DealSelect deals={deals} value={sel} onChange={setSel} companyName={companyName} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button disabled={!sel} onClick={() => date && onSave(date, type, sel)}><Plus className="mr-1 h-4 w-4" />Dodaj</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
