import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — B2B CRM" },
      { name: "description", content: "Pulpit CRM B2B – przegląd firm, kontaktów i zadań." },
      { property: "og:title", content: "Dashboard — B2B CRM" },
      { property: "og:description", content: "Pulpit CRM B2B – przegląd firm, kontaktów i zadań." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PlaceholderPage title="Dashboard" />;
}
