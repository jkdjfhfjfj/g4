import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lock, ChevronDown } from "lucide-react";
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
    <div className="w-full">
      <Select value={selectedChannelId || ""} onValueChange={onSelectChannel}>
        <SelectTrigger
          disabled={isDisabled}
          className="w-full bg-card border-card-border hover:bg-card/80 transition-colors"
          data-testid="select-channel"
        >
          <div className="flex items-center gap-2 w-full">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <SelectValue
                placeholder={
                  telegramStatus === "needs_auth"
                    ? "Authenticate to select channel"
                    : telegramStatus === "connecting"
                    ? "Connecting..."
                    : telegramStatus === "disconnected"
                    ? "Disconnected"
                    : "Select a channel"
                }
              />
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </div>
        </SelectTrigger>
        <SelectContent className="min-w-96">
          {channels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No channels available
            </div>
          ) : (
            channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <div className="flex items-center gap-3">
                  {channel.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{channel.title}</span>
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
        <Card className="mt-3 p-3 bg-card/50 border-card-border/50">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{selectedChannel.title}</p>
              <p className="text-xs text-muted-foreground">
                {selectedChannel.isPrivate ? "Private Channel" : "Public Channel"}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
