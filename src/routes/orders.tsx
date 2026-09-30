import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { useOrderStore, ORDER_STATUSES, margin, marginPct, type Order, type OrderStatus } from "@/data/orderStore";
import { formatMoney, toPLN } from "@/data/dealStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Zamówienia — Fabryka Smart CRM" },
      { name: "description", content: "Prosty rejestr zamówień: wartość sprzedaży, koszty realizacji i marża." },
      { property: "og:title", content: "Zamówienia — Fabryka Smart CRM" },
      { property: "og:description", content: "Prosty rejestr zamówień: wartość sprzedaży, koszty realizacji i marża." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const asPLN = (o: Order, v: number) => toPLN({ value: v, currency: o.currency } as Parameters<typeof toPLN>[0]);

function CostInput({ o, onSave }: { o: Order; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(o.costValue || ""));
  const commit = () => {
    const n = Number(v.replace(/\s/g, "").replace(",", ".") || 0);
    if (!Number.isFinite(n) || n < 0) { toast.error("Podaj prawidłowy koszt"); return; }
    if (n !== o.costValue) onSave(n);
  };
  return (
    <Input
      aria-label={`Koszt realizacji ${o.orderNumber}`}
      inputMode="decimal"
      className="h-8 w-32"
      value={v}
      placeholder="0"
      onChange={(e) => {
        setV(e.target.value);
        const n = Number(e.target.value.replace(/\s/g, "").replace(",", ".") || 0);
        if (Number.isFinite(n) && n >= 0) onSave(n);
      }}
      onBlur={commit}
    />
  );
}

function Page() {
  const { ready, orders, update, remove } = useOrderStore();
  const inProgress = orders.filter((o) => o.status === "W REALIZACJI");
  const sumInProgress = inProgress.reduce((s, o) => s + asPLN(o, o.sellValue), 0);
  const totalCost = orders.reduce((s, o) => s + asPLN(o, o.costValue), 0);
  const withValue = orders.filter((o) => o.sellValue > 0);
  const avgMargin = withValue.length ? withValue.reduce((s, o) => s + marginPct(o), 0) / withValue.length : 0;

  const table = (items: Order[]) =>
    items.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">Brak zamówień w tym statusie.</p>
    ) : (
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Nr</th><th className="p-3">Tytuł / Klient</th><th className="p-3 text-right">Sprzedaż</th>
              <th className="p-3">Koszt realizacji / materiałów</th><th className="p-3 text-right">Marża</th>
              <th className="p-3">Status</th><th className="p-3">Data zam.</th><th className="p-3">Dostawa</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const m = margin(o); const pct = marginPct(o);
              return (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap p-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="p-3"><div className="font-medium text-foreground">{o.title}</div><div className="text-xs text-muted-foreground">{o.client}</div></td>
                  <td className="whitespace-nowrap p-3 text-right">{formatMoney(o.sellValue, o.currency)}</td>
                  <td className="p-3"><CostInput o={o} onSave={(v) => update(o.id, { costValue: v })} /></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <div className={m < 0 ? "font-semibold text-destructive" : "font-semibold text-foreground"}>{formatMoney(m, o.currency)}</div>
                    <div className={`text-xs ${pct < 0 ? "text-destructive" : pct < 20 ? "text-orange-600" : "text-emerald-600"}`}>{pct.toFixed(1)}%</div>
                  </td>
                  <td className="p-3">
                    <Select value={o.status} onValueChange={(v) => { update(o.id, { status: v as OrderStatus }); toast.success(`${o.orderNumber}: ${v}`); }}>
                      <SelectTrigger className="h-8 w-36" aria-label="Status zamówienia"><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3"><Input type="date" className="h-8 w-36" value={o.orderDate} onChange={(e) => update(o.id, { orderDate: e.target.value })} /></td>
                  <td className="p-3"><Input type="date" className="h-8 w-36" value={o.deliveryDate} onChange={(e) => update(o.id, { deliveryDate: e.target.value })} /></td>
                  <td className="p-3">
                    <Button size="icon" variant="ghost" aria-label="Usuń zamówienie" onClick={() => { if (confirm(`Usunąć ${o.orderNumber}?`)) { remove(o.id); toast.success("Usunięto zamówienie"); } }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Zamówienia</h1>
        <p className="text-sm text-muted-foreground">Rejestr zamówień i kosztów – tworzony automatycznie z wygranych szans w lejku</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Suma zamówień w realizacji</div><div className="text-2xl font-semibold text-foreground">{formatMoney(sumInProgress)}</div><div className="text-xs text-muted-foreground">{inProgress.length} zamówień</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Łączny koszt</div><div className="text-2xl font-semibold text-foreground">{formatMoney(totalCost)}</div><div className="text-xs text-muted-foreground">wszystkie zamówienia, w PLN</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Średnia marża (%)</div><div className="text-2xl font-semibold text-foreground">{avgMargin.toFixed(1)}%</div></Card>
      </div>

      {ready && orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Brak zamówień" text="Przenieś szansę do etapu „Wdrożenie / Wygrana” w lejku, a zamówienie pojawi się tu automatycznie." />
      ) : (
        <Tabs defaultValue="ZAMÓWIONE">
          <TabsList>
            {ORDER_STATUSES.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label} · {orders.filter((o) => o.status === s.id).length}</TabsTrigger>)}
          </TabsList>
          {ORDER_STATUSES.map((s) => <TabsContent key={s.id} value={s.id} className="mt-4">{table(orders.filter((o) => o.status === s.id))}</TabsContent>)}
        </Tabs>
      )}
    </div>
  );
}
