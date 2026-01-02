import { useState, useEffect, useRef, useMemo } from "react";
import { Terminal, ScrollText, X, Pause, Play, Brain, ChevronRight, AlertCircle, Sparkles, Loader2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogsFABProps {
  logs: string[];
}

interface ErrorAnalysis {
  explanation: string;
  correction: string;
  modelUsed?: string;
  logIndex: number;
}

export function LogsFAB({ logs }: LogsFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredLogs = useMemo(() => {
    return displayLogs.filter(log => {
      const matchesText = log.toLowerCase().includes(filterText.toLowerCase());
      if (!matchesText) return false;

      if (filterType === "all") return true;
      if (filterType === "error") return log.includes("ERROR:");
      if (filterType === "trade") return log.includes("[MT-EXEC]") || log.includes("[MT-API]");
      if (filterType === "ai") return log.includes("[AI]");
      if (filterType === "tg") return log.includes("[TG]");
      return true;
    });
  }, [displayLogs, filterText, filterType]);

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
    if (viewportRef.current && !isPaused) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [filteredLogs, isOpen, isPaused]);

  const handleAnalyzeError = async (log: string, index: number) => {
    try {
      setAnalyzingIndex(index);
      const res = await apiRequest("POST", "/api/analyze-error", { errorText: log });
      const data = await res.json();
      setAnalysis({ ...data, logIndex: index });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Could not connect to AI service.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingIndex(null);
    }
  };

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
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0 relative">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-mono">System Logs {isPaused ? "(Paused)" : "(Live)"}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 mr-8">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsPaused(!isPaused)}
                className={`h-8 w-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground ${isPaused ? "text-yellow-500 bg-yellow-500/10" : ""}`}
                title={isPaused ? "Resume Stream" : "Pause Stream"}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                <span className="sr-only">{isPaused ? "Resume" : "Pause"}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Logs List */}
            <div className={`flex-1 flex flex-col bg-[#0d1117] border-r border-border/10 ${analysis ? "hidden md:flex" : "flex"}`}>
              <div className="bg-[#161b22] px-4 py-2 border-b border-border/50 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  <span>Output</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} /> 
                      {isPaused ? "Paused" : "Live"}
                    </span>
                    <span>30m Retention</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter logs..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="h-8 pl-8 text-xs bg-black/20 border-border/20"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 h-8 text-xs bg-black/20 border-border/20">
                      <Filter className="h-3 w-3 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Logs</SelectItem>
                      <SelectItem value="error">Errors</SelectItem>
                      <SelectItem value="trade">Trades</SelectItem>
                      <SelectItem value="ai">AI Analysis</SelectItem>
                      <SelectItem value="tg">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="flex-1 w-full" viewportRef={viewportRef}>
                <div className="p-4 space-y-1.5">
                  {filteredLogs.length === 0 ? (
                    <div className="text-muted-foreground italic py-4 flex flex-col items-center gap-2">
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 animate-spin" />
                      {filterText || filterType !== 'all' ? 'No matching logs found' : 'Waiting for system activity...'}
                    </div>
                  ) : (
                    filteredLogs.map((log, i) => {
                      const isError = log.includes("ERROR:");
                      const isTrade = log.includes("[MT-EXEC]") || log.includes("[MT-API]");
                      const isAI = log.includes("[AI]");
                      const isTG = log.includes("[TG]");
                      const isSuccess = log.toLowerCase().includes("success");
                      const isWarning = log.toLowerCase().includes("warning");
                      
                      const timestamp = log.match(/\[(.*?)\]/)?.[1] || "";
                      const content = log.replace(/\[.*?\]\s*/, "");
                      
                      let borderClass = "border-transparent text-gray-300";
                      let bgClass = "hover:bg-white/5";
                      
                      if (isError) {
                        borderClass = "border-red-500 text-red-300";
                        bgClass = "bg-red-500/5";
                      } else if (isTrade) {
                        borderClass = "border-cyan-500 text-cyan-300";
                        bgClass = "bg-cyan-500/5";
                      } else if (isAI) {
                        borderClass = "border-purple-500 text-purple-300";
                        bgClass = "bg-purple-500/5";
                      } else if (isTG) {
                        borderClass = "border-blue-500 text-blue-300";
                        bgClass = "bg-blue-500/5";
                      } else if (isSuccess) {
                        borderClass = "border-green-500 text-green-300";
                        bgClass = "bg-green-500/5";
                      } else if (isWarning) {
                        borderClass = "border-yellow-500 text-yellow-300";
                        bgClass = "bg-yellow-500/5";
                      }
                      
                      return (
                        <div 
                          key={i} 
                          className={`group relative flex items-start border-l-2 pl-3 py-0.5 transition-colors ${borderClass} ${bgClass} ${analysis?.logIndex === i ? "bg-primary/10 border-l-primary" : ""}`}
                        >
                          <div className="flex-1 flex flex-col">
                            <span className="text-[10px] opacity-40 mr-2 select-none font-sans">
                              {timestamp.split('T')[1]?.split('.')[0] || timestamp}
                            </span>
                            <span className="whitespace-pre-wrap break-all">{content}</span>
                          </div>
                          
                          {isError && (
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full bg-primary/20 hover:bg-primary text-primary-foreground"
                                onClick={() => handleAnalyzeError(log, i)}
                                disabled={analyzingIndex === i}
                                title="AI Analysis"
                              >
                                {analyzingIndex === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* AI Detail Panel */}
            {analysis && (
              <div className="w-full md:w-96 bg-muted/20 border-l border-border/10 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">AI Analysis</h3>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAnalysis(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
                    <section className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <AlertCircle className="h-3 w-3" />
                        Explanation
                      </div>
                      <div className="p-3 bg-[#161b22] rounded-md border border-border/30 text-sm leading-relaxed text-gray-200">
                        {analysis.explanation}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest text-primary">
                        <Brain className="h-3 w-3" />
                        Correction View
                      </div>
                      <div className="p-3 bg-primary/5 rounded-md border border-primary/20 text-sm leading-relaxed text-primary-foreground/90 font-mono">
                        {analysis.correction}
                      </div>
                    </section>

                    {analysis.modelUsed && (
                      <div className="pt-4 border-t border-border/10">
                        <span className="text-[10px] text-muted-foreground opacity-50 uppercase font-mono">
                          Analyzed by {analysis.modelUsed}
                        </span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
