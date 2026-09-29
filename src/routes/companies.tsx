import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { companies } from "@/data/mockData";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Firmy — B2B CRM" },
      { name: "description", content: "Lista firm z przemysłu, produkcji i IT." },
      { property: "og:title", content: "Firmy — B2B CRM" },
      { property: "og:description", content: "Lista firm z przemysłu, produkcji i IT." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PlaceholderPage title="Firmy">Łączna liczba firm: <strong className="text-foreground">{companies.length}</strong></PlaceholderPage>;
}
