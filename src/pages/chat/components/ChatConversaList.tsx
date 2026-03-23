import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAT_TABS } from "../constants";
import { ChatConversa, STATUS_COLORS, STATUS_LABELS, ChatStatus } from "../types";
import { tempoRelativo, previewMensagem, formatarTelefone } from "../helpers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  conversas: ChatConversa[];
  tab: string;
  onTabChange: (tab: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedId: string | null;
  onSelect: (c: ChatConversa) => void;
  counts: Record<string, number>;
}

export default function ChatConversaList({
  conversas, tab, onTabChange, search, onSearchChange,
  selectedId, onSelect, counts,
}: Props) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Chat</h2>
          {(counts.fila || 0) > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {counts.fila}
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={onTabChange} className="px-2 pt-2">
        <TabsList className="w-full h-8">
          {CHAT_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs flex-1 h-7">
              {t.label}
              {(counts[t.value] || 0) > 0 && (
                <span className="ml-1 text-[10px] bg-muted rounded-full px-1">
                  {counts[t.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {conversas.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma conversa encontrada
            </p>
          )}
          {conversas.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                selectedId === c.id
                  ? "bg-accent"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {(c.nome_cliente || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate text-foreground">
                      {c.nome_cliente || formatarTelefone(c.numero_cliente)}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {tempoRelativo(c.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {formatarTelefone(c.numero_cliente)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[c.status as ChatStatus] || "bg-gray-400")} />
                    <span className="text-[10px] text-muted-foreground">
                      {STATUS_LABELS[c.status as ChatStatus] || c.status}
                    </span>
                    {c.setor && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {(c.setor as any).nome}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
