import { useCallback, useEffect, useState } from "react";
import type { Currency, Deal } from "@/data/dealStore";

export type OrderStatus = "ZAMÓWIONE" | "W REALIZACJI" | "ZREALIZOWANE";
export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "ZAMÓWIONE", label: "Zamówione" },
  { id: "W REALIZACJI", label: "W realizacji" },
  { id: "ZREALIZOWANE", label: "Zrealizowane" },
];

export interface Order {
  id: string;
  orderNumber: string;
  deal_id: string;
  company_id: string;
  title: string;
  client: string;
  sellValue: number;
  currency: Currency;
  costValue: number;
  status: OrderStatus;
  orderDate: string;
  deliveryDate: string;
  created_at: string;
}

export const ORDERS_KEY = "crm.orders.v1";
const EVENT = "crm-orders-changed";

export const margin = (o: Pick<Order, "sellValue" | "costValue">) => o.sellValue - o.costValue;
export const marginPct = (o: Pick<Order, "sellValue" | "costValue">) => (o.sellValue > 0 ? (margin(o) / o.sellValue) * 100 : 0);

export function readOrders(): Order[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as Order[]; } catch { return []; }
}
function writeOrders(v: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(v));
  window.dispatchEvent(new Event(EVENT));
}

function nextNumber(orders: Order[], year: number) {
  const prefix = `ZAM/${year}/`;
  const max = orders.filter((o) => o.orderNumber.startsWith(prefix)).reduce((m, o) => Math.max(m, parseInt(o.orderNumber.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Creates an order for a won deal (once per deal). Returns the new order or null if it already exists. */
export function createOrderFromDeal(d: Deal, client: string): Order | null {
  const orders = readOrders();
  if (orders.some((o) => o.deal_id === d.id)) return null;
  const today = new Date();
  const delivery = new Date(); delivery.setDate(delivery.getDate() + 30);
  const o: Order = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    orderNumber: nextNumber(orders, today.getFullYear()),
    deal_id: d.id,
    company_id: d.company_id,
    title: d.title,
    client,
    sellValue: d.value,
    currency: d.currency,
    costValue: 0,
    status: "ZAMÓWIONE",
    orderDate: today.toISOString().slice(0, 10),
    deliveryDate: delivery.toISOString().slice(0, 10),
    created_at: today.toISOString(),
  };
  writeOrders([o, ...orders]);
  return o;
}

export function useOrderStore() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => setOrders(readOrders());
    load(); setReady(true);
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, []);
  const update = useCallback((id: string, data: Partial<Omit<Order, "id">>) => {
    writeOrders(readOrders().map((o) => (o.id === id ? { ...o, ...data } : o)));
  }, []);
  const remove = useCallback((id: string) => writeOrders(readOrders().filter((o) => o.id !== id)), []);
  return { ready, orders, update, remove };
}
