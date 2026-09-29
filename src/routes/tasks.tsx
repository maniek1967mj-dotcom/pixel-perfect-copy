import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Zadania — B2B CRM" },
      { name: "description", content: "Zadania i działania handlowe." },
      { property: "og:title", content: "Zadania — B2B CRM" },
      { property: "og:description", content: "Zadania i działania handlowe." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PlaceholderPage title="Zadania" />;
}
