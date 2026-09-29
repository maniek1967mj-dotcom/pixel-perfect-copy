import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setEvt(null); setIos(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!evt && !ios) return null;

  const click = async () => {
    if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); }
    else setHelp(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={click} className="w-full justify-start border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent">
        <Download className="mr-2 h-4 w-4" /> Zainstaluj Aplikację
      </Button>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zainstaluj na iPhonie / iPadzie</DialogTitle>
            <DialogDescription>Dodaj Smart CRM do ekranu początkowego w dwóch krokach.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-center gap-2">1. Kliknij <Share className="h-4 w-4" /> <b>Udostępnij</b> w Safari</li>
            <li>2. Wybierz <b>Dodaj do ekranu początkowego</b></li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
