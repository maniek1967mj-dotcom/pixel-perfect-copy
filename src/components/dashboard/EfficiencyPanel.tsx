import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Flame, Lightbulb, Phone, Sparkles, Target, Wallet, Zap } from "lucide-react";
import type { Deal } from "@/data/dealStore";
import { formatMoney } from "@/data/dealStore";
import { useActivityStore } from "@/data/activityStore";
import { margin, useOrderStore } from "@/data/orderStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const DAILY_CALL_GOAL = 10;

const iso = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function Ring({ value, max }: { value: number; max: number }) {
  const pct = Math.min(1, value / max);
  const r = 26, c = 2 * Math.PI * r;
  const color = pct >= 1 ? "var(--ev-done)" : pct >= 0.5 ? "var(--ev-planned)" : "var(--ev-overdue)";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
    </svg>
  );
}

export function EfficiencyPanel({ deals }: { deals: Deal[] }) {
  const { activities } = useActivityStore();
  const { orders } = useOrderStore();
  const now = new Date();
  const today = iso(now);

  const calls = activities.filter((a) => a.type === "call");
  const doneCalls = calls.filter((a) => a.done);
  const doneOn = (day: string) => doneCalls.filter((a) => a.date === day).length;
  const callsToday = doneOn(today);

  // Streak: consecutive days reaching goal (today counts if reached, otherwise start from yesterday)
  let streak = 0;
  let cursor = callsToday >= DAILY_CALL_GOAL ? now : addDays(now, -1);
  for (let i = 0; i < 365; i++) {
    const d = cursor.getDay();
    if (d === 0 || d === 6) { cursor = addDays(cursor, -1); continue; } // weekends don't break streak
    if (doneOn(iso(cursor)) >= DAILY_CALL_GOAL) { streak++; cursor = addDays(cursor, -1); } else break;
  }

  // Conversion funnel
  const audits = doneCalls.filter((a) => a.outcome === "audyt").length + activities.filter((a) => a.type === "audit" && a.done).length;
  const callDealIds = new Set(calls.filter((a) => a.deal_id).map((a) => a.deal_id));
  const phoneOrders = orders.filter((o) => callDealIds.has(o.deal_id));
  const auditPct = doneCalls.length ? Math.round((audits / doneCalls.length) * 100) : 0;
  const orderPct = audits ? Math.round((phoneOrders.length / audits) * 100) : 0;

  // Margin this month from phone orders, per currency
  const month = today.slice(0, 7);
  const marginBy: Record<string, number> = {};
  phoneOrders.filter((o) => o.orderDate.slice(0, 7) === month).forEach((o) => { marginBy[o.currency] = (marginBy[o.currency] ?? 0) + margin(o); });
  const marginEntries = Object.entries(marginBy);

  // Week Mon–Fri
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const week = ["Pn", "Wt", "Śr", "Cz", "Pt"].map((label, i) => {
    const day = iso(addDays(monday, i));
    const dayCalls = calls.filter((a) => a.date === day);
    return {
      label, day,
      planned: dayCalls.length,
      done: dayCalls.filter((a) => a.done).length,
      won: orders.filter((o) => o.orderDate === day).length,
    };
  });
  const maxBar = Math.max(1, ...week.flatMap((w) => [w.planned, w.done, w.won]));
  const bestDay = week.reduce((b, w) => (w.won + w.done > b.won + b.done ? w : b), week[0]!);
  const weekAudits = activities.filter((a) => a.date >= week[0]!.day && a.date <= week[4]!.day && a.done && (a.outcome === "audyt" || a.type === "audit")).length;

  // Tips
  const staleProposals = deals.filter((d) => d.stage === "propozycja" && !d.followUpDate).length;
  const freshSignals = deals.filter((d) => d.stage === "sygnal").length;
  const tips: { icon: typeof Zap; text: string; to: "/tasks" | "/pipeline" }[] = [];
  if (callsToday < 5) tips.push({ icon: Zap, to: "/tasks", text: `Zostało Ci jeszcze ${DAILY_CALL_GOAL - callsToday} telefonów do dziennego celu. Najlepszy czas na obdzwonkę to 10:00–12:00. Przejdź do Zadań!` });
  if (staleProposals > 0) tips.push({ icon: Target, to: "/pipeline", text: `Masz ${staleProposals} ofert w zawieszeniu. Zadzwoń domknąć decyzję!` });
  if (weekAudits > 2) tips.push({ icon: Flame, to: "/pipeline", text: "Świetny tydzień! Wysoka skuteczność rozmów – przekuj te audyty na 2 nowe Zamówienia." });
  if (freshSignals > 5) tips.push({ icon: Phone, to: "/tasks", text: `W lejku czeka ${freshSignals} świeżych sygnałów z Okna 0-7 dni. Obdzwoń je w pierwszej kolejności.` });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <Ring value={callsToday} max={DAILY_CALL_GOAL} />
          <div>
            <div className="text-sm text-muted-foreground">Dzienne Połączenia</div>
            <div className="text-2xl font-bold text-foreground">{callsToday} / {DAILY_CALL_GOAL}</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">Seria Aktywności<Flame className="h-4 w-4" style={{ color: "var(--ev-planned)" }} /></div>
          <div className="mt-2 text-2xl font-bold text-foreground">{streak} {streak === 1 ? "dzień" : "dni"} z rzędu</div>
          <div className="mt-1 text-xs text-muted-foreground">dni robocze z celem {DAILY_CALL_GOAL} połączeń</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pełny Lejek Konwersji</div>
          <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-foreground">
            <span>{doneCalls.length} tel.</span><ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{audits} audyty <span className="text-xs text-muted-foreground">({auditPct}%)</span></span><ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{phoneOrders.length} zam. <span className="text-xs text-muted-foreground">({orderPct}%)</span></span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Telefony → Audyty Gemba → Zamówienia</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">Marża z Telefonów (miesiąc)<Wallet className="h-4 w-4" /></div>
          <div className="mt-2 space-y-0.5 text-xl font-bold text-foreground">
            {marginEntries.length ? marginEntries.map(([cur, v]) => <div key={cur}>{formatMoney(v, cur)}</div>) : <div>{formatMoney(0)}</div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/40 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-semibold text-foreground">Smart Assistant / Podpowiedzi na Dziś</h2></div>
          {tips.length ? (
            <ul className="space-y-2">
              {tips.map((t, i) => (
                <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-sm">
                  <t.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-foreground">{t.text}</span>
                  <Button asChild size="sm" variant="ghost"><Link to={t.to}><ArrowRight className="h-4 w-4" /></Link></Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lightbulb className="h-4 w-4" />Wszystko pod kontrolą — utrzymaj tempo!</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="mr-auto font-semibold text-foreground">Wydajność Tygodniowa</h2>
            <Legend color="var(--muted-foreground)" label="Planowane" />
            <Legend color="var(--ev-done)" label="Wykonane" />
            <Legend color="var(--ev-planned)" label="Wygrane" />
          </div>
          <div className="flex h-40 items-end gap-3">
            {week.map((w) => (
              <div key={w.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  {[[w.planned, "var(--muted-foreground)"], [w.done, "var(--ev-done)"], [w.won, "var(--ev-planned)"]].map(([v, c], i) => (
                    <div key={i} title={String(v)} className="w-1/4 rounded-t" style={{ height: `${((v as number) / maxBar) * 100}%`, minHeight: 2, background: c as string, opacity: i === 0 ? 0.4 : 1 }} />
                  ))}
                </div>
                <span className={`text-xs ${w.day === bestDay?.day && w.done + w.won > 0 ? "font-bold text-primary" : "text-muted-foreground"}`}>{w.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{label}</span>
);
