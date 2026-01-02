import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Loader2, CheckCircle, XCircle, AlertCircle, Clock, Cpu } from "lucide-react";
import type { TelegramMessage } from "@shared/schema";
import { format } from "date-fns";

interface MessageFeedProps {
  messages: TelegramMessage[];
  selectedChannelIds: string[];
}

function VerdictBadge({ verdict }: { verdict?: TelegramMessage["aiVerdict"] }) {
  switch (verdict) {
    case "valid_signal":
      return (
        <Badge variant="default" className="bg-success text-success-foreground text-xs gap-1">
          <CheckCircle className="h-3 w-3" />
          Signal
        </Badge>
      );
    case "no_signal":
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <XCircle className="h-3 w-3" />
          No Signal
        </Badge>
      );
    case "analyzing":
      return (
        <Badge variant="outline" className="text-xs gap-1 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyzing
        </Badge>
      );
    case "skipped":
      return (
        <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Skipped
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

export function MessageFeed({ messages, selectedChannelIds }: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const prevMessagesLength = useRef(messages.length);

  // Filter messages based on selected channel IDs
  const filteredMessages = messages.filter(m => {
    const isSelected = selectedChannelIds.includes(m.channelId);
    return isSelected;
  });

  useEffect(() => {
    if (!isPaused && filteredMessages.length > prevMessagesLength.current) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevMessagesLength.current = filteredMessages.length;
  }, [filteredMessages.length, isPaused]);

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Message Feed
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {filteredMessages.length} messages
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {selectedChannelIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Select one or more channels to view messages
            </p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Waiting for messages...</p>
          </div>
        ) : (
          <ScrollArea
            ref={scrollRef}
            className="h-full"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="px-4 py-2 space-y-3 pb-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 rounded-md bg-muted/50 space-y-2"
                  data-testid={`message-${message.id}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {message.channelTitle && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-primary border-primary/20 bg-primary/5">
                          {message.channelTitle}
                        </Badge>
                      )}
                      {message.senderName && (
                        <span className="text-xs font-medium">{message.senderName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.date), "MMM d, HH:mm:ss")}
                      </span>
                      {message.modelUsed && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground border-muted-foreground/20 font-mono">
                          {message.modelUsed}
                        </Badge>
                      )}
                    </div>
                    <VerdictBadge verdict={message.aiVerdict} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  {message.verdictDescription && (
                    <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-primary/80 tracking-wider">
                        <Cpu className="h-3.5 w-3.5" />
                        AI Signal Analysis
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
                        {message.verdictDescription}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
