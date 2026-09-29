import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Lejek Sprzedaży — B2B CRM" },
      { name: "description", content: "Etapy sprzedaży i szanse." },
      { property: "og:title", content: "Lejek Sprzedaży — B2B CRM" },
      { property: "og:description", content: "Etapy sprzedaży i szanse." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PlaceholderPage title="Lejek Sprzedaży" />;
}
