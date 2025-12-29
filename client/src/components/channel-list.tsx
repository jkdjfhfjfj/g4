import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lock, ChevronRight } from "lucide-react";
import type { TelegramChannel } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChannelListProps {
  channels: TelegramChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  telegramStatus: "connected" | "disconnected" | "connecting" | "needs_auth";
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  telegramStatus,
}: ChannelListProps) {
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const isDisabled = telegramStatus !== "connected";

  return (
    <div className="w-full space-y-3">
      <Select value={selectedChannelId || ""} onValueChange={onSelectChannel}>
        <SelectTrigger
          disabled={isDisabled}
          className="w-full bg-white/20 border-white/30 text-primary-foreground placeholder:text-white/60 hover:bg-white/25 transition-colors"
          data-testid="select-channel"
        >
          <div className="flex items-center gap-2 w-full text-left">
            <MessageSquare className="h-5 w-5 flex-shrink-0" />
            <SelectValue
              placeholder={
                telegramStatus === "needs_auth"
                  ? "Authenticate first"
                  : telegramStatus === "connecting"
                  ? "Connecting..."
                  : telegramStatus === "disconnected"
                  ? "Disconnected"
                  : "Select channel"
              }
            />
          </div>
        </SelectTrigger>
        <SelectContent className="min-w-80">
          {channels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No channels available
            </div>
          ) : (
            channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <div className="flex items-center gap-3">
                  {channel.isPrivate ? (
                    <div className="p-1.5 rounded-lg bg-destructive/10">
                      <Lock className="h-4 w-4 text-destructive" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{channel.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {channel.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Selected channel info card */}
      {selectedChannel && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-md hover-elevate">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/20 flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{selectedChannel.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedChannel.isPrivate ? "🔒 Private" : "🌐 Public"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-primary/50 flex-shrink-0" />
          </div>
        </Card>
      )}
    </div>
  );
}
