import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ustawienia – B2B CRM" },
      { name: "description", content: "Ustawienia CRM i czyszczenie danych lokalnych." },
      { property: "og:title", content: "Ustawienia – B2B CRM" },
      { property: "og:description", content: "Ustawienia CRM i czyszczenie danych lokalnych." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const reset = () => { localStorage.clear(); window.location.reload(); };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">Zarządzanie danymi zapisanymi na tym urządzeniu</p>
      </div>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Reset danych testowych</h2>
          <p className="text-sm text-muted-foreground">Usuwa wszystkie firmy, kontakty, szanse i zaimportowane leady z tej przeglądarki.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive"><Trash2 className="mr-1 h-4 w-4" />Wyczyść Dane Testowe</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wyczyścić wszystkie dane?</AlertDialogTitle>
              <AlertDialogDescription>Tej operacji nie można cofnąć. CRM wróci do pustego stanu.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>Wyczyść</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
