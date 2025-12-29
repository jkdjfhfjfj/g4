import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Lock } from "lucide-react";
import type { TelegramChannel } from "@shared/schema";

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

  return (
    <div className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedChannelId || ""} onValueChange={onSelectChannel}>
        <SelectTrigger
          className="text-sm"
          disabled={telegramStatus !== "connected"}
          data-testid="select-channel"
        >
          <SelectValue
            placeholder={
              telegramStatus === "needs_auth"
                ? "Auth required"
                : telegramStatus === "connecting"
                ? "Connecting..."
                : "Select channel"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {channels.map((channel) => (
            <SelectItem key={channel.id} value={channel.id}>
              <div className="flex items-center gap-2">
                {channel.isPrivate && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <span>{channel.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
