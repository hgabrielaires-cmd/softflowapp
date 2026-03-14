import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Lock } from "lucide-react";

interface Props {
  onSubmit: (conteudo: string, visibilidade: "publico" | "interno") => void;
  isLoading?: boolean;
}

export function TicketNovaResposta({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState("");
  const [interno, setInterno] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), interno ? "interno" : "publico");
    setText("");
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
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua resposta..."
        className="min-h-[80px]"
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
