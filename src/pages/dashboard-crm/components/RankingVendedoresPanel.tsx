import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import type { VendedorRanking } from "../types";
import { formatValor } from "../helpers";

const MEDALS = ["🥇", "🥈", "🥉"];

interface Props {
  data?: VendedorRanking[];
  isLoading: boolean;
  isAdmin: boolean;
  currentUserId?: string;
  titulo: string;
  maxItems?: number;
}

export function RankingVendedoresPanel({ data, isLoading, isAdmin, currentUserId, titulo, maxItems = 10 }: Props) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-card h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
        </CardContent>
      </Card>
    );
  }

  const items = (data || []).slice(0, maxItems);
  const maxVal = items[0]?.valorTotal || 1;

  return (
    <Card className="border-none shadow-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm">{titulo}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum vendedor encontrado</p>
        )}
        {items.map((v, i) => {
          const isMe = v.user_id === currentUserId;
          const showValue = isAdmin || isMe;
          return (
            <div
              key={v.user_id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isMe ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800" : "hover:bg-muted/50"}`}
            >
              <span className="text-sm font-bold w-6 text-center shrink-0">
                {i < 3 ? MEDALS[i] : `${i + 1}º`}
              </span>
              <Avatar className="h-7 w-7">
                <AvatarImage src={v.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{v.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{v.full_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{v.negocios} negócio{v.negocios !== 1 ? "s" : ""}</span>
                  {showValue && <span className="font-semibold text-foreground">{formatValor(v.valorTotal)}</span>}
                  {!showValue && <span>---</span>}
                </div>
                <Progress value={(v.valorTotal / maxVal) * 100} className="h-1 mt-1" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
