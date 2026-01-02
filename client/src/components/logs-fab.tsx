import { useState, useEffect, useRef } from "react";
import { Terminal, ScrollText, X, Pause, Play } from "lucide-react";
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
  const [isPaused, setIsPaused] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync display logs when not paused or when dialog opens
  useEffect(() => {
    if (!isPaused) {
      setDisplayLogs(logs);
    }
  }, [logs, isPaused]);

  // When opening dialog, if not paused, sync immediately
  useEffect(() => {
    if (isOpen && !isPaused) {
      setDisplayLogs(logs);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new logs arrive and not paused
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [displayLogs, isOpen, isPaused]);

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-32 right-6 h-16 w-16 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.6)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 border-4 border-white flex items-center justify-center pointer-events-auto"
        style={{ zIndex: 99999999 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("FAB Clicked");
          setIsOpen(true);
        }}
        data-testid="button-open-logs"
      >
        <ScrollText className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-mono">System Logs {isPaused ? "(Paused)" : "(Live)"}</DialogTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPaused(!isPaused)}
              className="gap-2 h-8"
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Resume Stream
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause Stream
                </>
              )}
            </Button>
          </DialogHeader>

          <div className="flex-1 bg-[#0d1117] p-0 font-mono text-sm leading-relaxed overflow-hidden flex flex-col">
            <div className="bg-[#161b22] px-4 py-2 border-b border-border/50 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              <span>Output</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} /> 
                  {isPaused ? "Paused" : "Live"}
                </span>
                <span>30m Retention</span>
              </div>
            </div>
            <ScrollArea ref={scrollRef} className="flex-1 w-full">
              <div className="p-4 space-y-1.5">
                {displayLogs.length === 0 ? (
                  <div className="text-muted-foreground italic py-4 flex flex-col items-center gap-2">
                    <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 animate-spin" />
                    Waiting for system activity...
                  </div>
                ) : (
                  displayLogs.map((log, i) => {
                    const isError = log.includes("ERROR:");
                    const isTrade = log.includes("[MT-EXEC]");
                    const timestamp = log.match(/\[(.*?)\]/)?.[1] || "";
                    const content = log.replace(/\[.*?\]\s*/, "");
                    
                    return (
                      <div 
                        key={i} 
                        className={`group border-l-2 pl-3 py-0.5 transition-colors ${
                          isError ? "border-red-500 bg-red-500/5 text-red-300" : 
                          isTrade ? "border-primary bg-primary/5 text-primary-foreground" :
                          "border-transparent hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        <span className="text-[10px] opacity-40 mr-2 select-none font-sans">
                          {timestamp.split('T')[1]?.split('.')[0] || timestamp}
                        </span>
                        <span className="whitespace-pre-wrap break-all">{content}</span>
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
