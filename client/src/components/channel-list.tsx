import { MessageSquare, Lock, Search, Users } from "lucide-react";
import type { TelegramChannel } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [search, setSearch] = useState("");
  const isDisabled = telegramStatus !== "connected";

  const filteredChannels = channels.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full">
      <Select value={selectedChannelId || ""} onValueChange={onSelectChannel}>
        <SelectTrigger
          disabled={isDisabled}
          className="w-full bg-white/15 border-white/25 text-primary-foreground hover:bg-white/20 transition-colors h-10"
          data-testid="select-channel"
        >
          <div className="flex items-center gap-2 w-full text-left min-w-0">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 truncate">
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
          </div>
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[280px] max-w-[calc(100vw-2rem)]">
          <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
          </div>
          <ScrollArea className="max-h-[300px]">
            {filteredChannels.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No channels found
              </div>
            ) : (
              filteredChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    {channel.type === "group" ? (
                      <Users className="h-4 w-4 text-orange-400" />
                    ) : channel.isPrivate ? (
                      <Lock className="h-4 w-4 text-destructive" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium text-sm truncate max-w-[180px] sm:max-w-[220px]">
                      {channel.title}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
}
