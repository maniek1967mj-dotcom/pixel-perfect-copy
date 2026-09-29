import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Układ działa poprawnie</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{children ?? "Ta sekcja zostanie rozbudowana w kolejnych krokach."}</CardContent>
      </Card>
    </div>
  );
}
