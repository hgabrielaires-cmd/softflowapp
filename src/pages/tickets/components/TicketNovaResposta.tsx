import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Lock } from "lucide-react";
import { MentionInput } from "@/components/MentionInput";

interface MentionUser {
  id: string;
  user_id: string;
  full_name: string;
}

interface Props {
  onSubmit: (conteudo: string, visibilidade: "publico" | "interno", mentionedUserIds: string[]) => void;
  isLoading?: boolean;
  users: MentionUser[];
}

export function TicketNovaResposta({ onSubmit, isLoading, users }: Props) {
  const [text, setText] = useState("");
  const [interno, setInterno] = useState(false);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  const handleMentionsChange = useCallback((ids: string[]) => {
    setMentionedIds(ids);
  }, []);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), interno ? "interno" : "publico", mentionedIds);
    setText("");
    setMentionedIds([]);
  };

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Nova Resposta</Label>
        <div className="flex items-center gap-1.5 ml-auto">
          {interno && <Lock className="h-3 w-3 text-amber-600" />}
          <Label className="text-xs">{interno ? "Interno" : "Público"}</Label>
          <Switch checked={interno} onCheckedChange={setInterno} />
        </div>
      </div>
      <MentionInput
        value={text}
        onChange={setText}
        users={users}
        placeholder="Digite sua resposta... Use @nome para mencionar"
        className="min-h-[80px]"
        onMentionsChange={handleMentionsChange}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || isLoading}>
          <Send className="h-4 w-4 mr-1" />
          Enviar
        </Button>
      </div>
    </div>
  );
}
