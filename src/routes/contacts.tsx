import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Kontakty — B2B CRM" },
      { name: "description", content: "Osoby kontaktowe i decydenci." },
      { property: "og:title", content: "Kontakty — B2B CRM" },
      { property: "og:description", content: "Osoby kontaktowe i decydenci." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PlaceholderPage title="Kontakty" />;
}
