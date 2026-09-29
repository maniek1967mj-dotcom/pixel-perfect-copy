import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted"><Icon className="h-6 w-6 text-muted-foreground" /></div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </Card>
  );
}
