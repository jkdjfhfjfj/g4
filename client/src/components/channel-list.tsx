import { MessageSquare, Lock } from "lucide-react";
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
          className="w-full bg-white/15 border-white/25 text-primary-foreground hover:bg-white/20 transition-colors h-10"
          data-testid="select-channel"
        >
          <div className="flex items-center gap-2 w-full text-left">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <SelectValue
              placeholder={
                telegramStatus === "needs_auth"
                  ? "Authenticate"
                  : telegramStatus === "connecting"
                  ? "Connecting..."
                  : "Select channel"
              }
            />
          </div>
        </SelectTrigger>
        <SelectContent className="min-w-72">
          {channels.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No channels
            </div>
          ) : (
            channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <div className="flex items-center gap-2">
                  {channel.isPrivate ? (
                    <Lock className="h-4 w-4 text-destructive" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium text-sm">{channel.title}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
