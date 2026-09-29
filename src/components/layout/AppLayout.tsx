import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Building2, CheckSquare, Factory, Kanban, LayoutDashboard, Menu, Search, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/companies", label: "Firmy", icon: Building2 },
  { to: "/contacts", label: "Kontakty", icon: Users },
  { to: "/pipeline", label: "Lejek Sprzedaży", icon: Kanban },
  { to: "/tasks", label: "Zadania", icon: CheckSquare },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-muted">
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2 font-bold">
            <Factory className="h-6 w-6 text-sidebar-primary" /> B2B CRM
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Zamknij menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-semibold" }}>
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Otwórz menu"><Menu className="h-5 w-5" /></Button>
          <div className="relative min-w-0 max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Szukaj firm, kontaktów..." className="pl-9" />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Powiadomienia"><Bell className="h-5 w-5" /></Button>
            <Avatar className="h-8 w-8"><AvatarFallback>MJ</AvatarFallback></Avatar>
            <span className="hidden text-sm font-medium sm:inline">Mariusz Janeczek</span>
          </div>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
