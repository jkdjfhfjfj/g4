import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Lock, Users } from "lucide-react";
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
  const [search, setSearch] = useState("");

  const filteredChannels = channels.filter(
    (channel) =>
      channel.title.toLowerCase().includes(search.toLowerCase()) ||
      channel.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-select first channel when available
  if (channels.length > 0 && !selectedChannelId && channels[0]?.id) {
    setTimeout(() => onSelectChannel(channels[0].id), 100);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Channels</span>
          <span className="sm:hidden">Ch</span>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
            data-testid="input-channel-search"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {telegramStatus !== "connected" ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {telegramStatus === "needs_auth"
                ? "Authentication required"
                : telegramStatus === "connecting"
                ? "Connecting to Telegram..."
                : "Telegram not connected"}
            </p>
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No channels found</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="px-2 pb-2 space-y-1">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors hover-elevate active-elevate-2 ${
                    selectedChannelId === channel.id
                      ? "bg-sidebar-accent"
                      : ""
                  }`}
                  data-testid={`button-channel-${channel.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {channel.isPrivate && (
                          <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium truncate">{channel.title}</p>
                      </div>
                      {channel.username && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{channel.username}
                        </p>
                      )}
                    </div>
                    {channel.participantsCount !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Users className="h-3 w-3" />
                        {channel.participantsCount > 1000
                          ? `${(channel.participantsCount / 1000).toFixed(1)}K`
                          : channel.participantsCount}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
