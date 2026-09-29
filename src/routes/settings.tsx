import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { exportBackupJson, exportCsv, importBackupJson } from "@/utils/backup";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ustawienia – B2B CRM" },
      { name: "description", content: "Ustawienia CRM, kopie zapasowe i czyszczenie danych lokalnych." },
      { property: "og:title", content: "Ustawienia – B2B CRM" },
      { property: "og:description", content: "Ustawienia CRM, kopie zapasowe i czyszczenie danych lokalnych." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => { localStorage.clear(); window.location.reload(); };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const stats = await importBackupJson(file);
      toast.success(`Przywrócono dane: ${stats.companies} firm, ${stats.contacts} kontaktów, ${stats.deals} szans.`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się wczytać kopii zapasowej");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">Zarządzanie danymi zapisanymi na tym urządzeniu</p>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-foreground">Kopia zapasowa i eksport</h2>
          <p className="text-sm text-muted-foreground">Zapisz swoje dane na komputerze lub telefonie i przywróć je w razie potrzeby.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={exportBackupJson}>
            <Download className="mr-1 h-4 w-4" />Pobierz Kopię Zapasową (JSON)
          </Button>
          <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />{importing ? "Wgrywanie…" : "Wgraj Kopię Zapasową"}
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />Eksportuj Bazy do CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Eksport CSV pobiera dwa pliki (firmy i szanse) gotowe do otwarcia w Excelu.
        </p>
      </Card>

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
