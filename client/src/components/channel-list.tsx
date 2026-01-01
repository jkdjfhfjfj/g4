import { MessageSquare, Lock, Search, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  selectedChannelIds: string[];
  onSelectChannel: (channelId: string) => void;
  telegramStatus: "connected" | "disconnected" | "connecting" | "needs_auth";
}

export function ChannelList({
  channels,
  selectedChannelIds,
  onSelectChannel,
  telegramStatus,
}: ChannelListProps) {
  const [search, setSearch] = useState("");
  const isDisabled = telegramStatus !== "connected";

  const filteredChannels = channels.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search and select channels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={isDisabled}
          className="pl-9 h-10 bg-white/15 border-white/25 text-primary-foreground placeholder:text-primary-foreground/50"
        />
      </div>
      
      <ScrollArea className="h-32 rounded-md border border-border bg-card/50">
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {filteredChannels.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground col-span-full">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = selectedChannelIds.includes(channel.id);
              return (
                <Button
                  key={channel.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onSelectChannel(channel.id)}
                  disabled={isDisabled}
                  className="justify-start gap-2 h-8 px-2 text-xs"
                >
                  {channel.type === "group" ? (
                    <Users className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{channel.title}</span>
                  {isSelected && <Check className="h-3 w-3 flex-shrink-0 text-primary" />}
                </Button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
