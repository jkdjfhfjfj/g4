import { useState, useEffect, useRef } from "react";
import { Terminal, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogsFABProps {
  logs: string[];
}

export function LogsFAB({ logs }: LogsFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, isOpen]);

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-[9999] bg-primary hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 border-2 border-white/20"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-logs"
      >
        <ScrollText className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-mono">System Logs (Live)</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-[#0d1117] p-0 font-mono text-sm leading-relaxed overflow-hidden">
            <ScrollArea ref={scrollRef} className="h-full w-full">
              <div className="p-4 space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic py-4">Waiting for system activity...</div>
                ) : (
                  logs.map((log, i) => {
                    const isError = log.includes("ERROR:");
                    return (
                      <div 
                        key={i} 
                        className={`whitespace-pre-wrap break-all ${isError ? "text-red-400" : "text-gray-300"}`}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
