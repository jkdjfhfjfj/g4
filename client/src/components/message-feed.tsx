import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Loader2, CheckCircle, XCircle, AlertCircle, Clock, Cpu } from "lucide-react";
import type { TelegramMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface MessageFeedProps {
  messages: TelegramMessage[];
  selectedChannelId: string | null;
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

export function MessageFeed({ messages, selectedChannelId }: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (!isPaused && messages.length > prevMessagesLength.current) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isPaused]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Message Feed
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {!selectedChannelId ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Select a channel to view messages
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Waiting for messages...</p>
          </div>
        ) : (
          <ScrollArea
            ref={scrollRef}
            className="h-[400px]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="px-4 py-2 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 rounded-md bg-muted/50 space-y-2"
                  data-testid={`message-${message.id}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {message.senderName && (
                        <span className="text-xs font-medium">{message.senderName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
                      </span>
                    </div>
                    <VerdictBadge verdict={message.aiVerdict} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">{message.text}</p>
                  {message.verdictDescription && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                      {message.verdictDescription}
                    </p>
                  )}
                  {message.modelUsed && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Cpu className="h-3 w-3" />
                      <span className="font-mono">{message.modelUsed}</span>
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
