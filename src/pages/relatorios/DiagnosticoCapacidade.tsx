import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Activity, Upload } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoCapacidade() {
  const { isAdmin } = useAuth() as any;
  const [contexto, setContexto] = useState("");
  const [metricas, setMetricas] = useState("");
  const [logs, setLogs] = useState("");
  const [analise, setAnalise] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAdmin === false) {
    return <div className="p-6 text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  const carregarArquivo = async (e: React.ChangeEvent<HTMLInputElement>, set: (v: string) => void) => {
    const f = e.target.files?.[0];
    if (f) set(await f.text());
    e.target.value = "";
  };

  const analisar = async () => {
    if (!metricas.trim() && !logs.trim()) return toast.error("Informe métricas ou logs");
    setLoading(true);
    setAnalise("");
    try {
      const { data, error } = await supabase.functions.invoke("diagnostico-capacidade", {
        body: { contexto, metricas, logs },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setAnalise(data.analise);
    } catch (e: any) {
      toast.error(e.message || "Falha na análise");
    } finally {
      setLoading(false);
    }
  };

  const campo = (id: string, label: string, value: string, set: (v: string) => void, rows: number, ph: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <label className="text-xs text-primary cursor-pointer inline-flex items-center gap-1">
          <Upload className="h-3 w-3" /> Carregar arquivo
          <input type="file" accept=".txt,.log,.csv,.json" className="hidden" onChange={(e) => carregarArquivo(e, set)} />
        </label>
      </div>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => set(e.target.value)} placeholder={ph} className="font-mono text-xs" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Activity className="h-6 w-6" /> Diagnóstico de Capacidade</h1>
        <p className="text-sm text-muted-foreground">Envie métricas e logs do servidor e a IA indica a causa provável da falha e as ações recomendadas.</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {campo("ctx", "Contexto (opcional)", contexto, setContexto, 2, "Ex.: login travou às 17:59, instância Tiny...")}
          {campo("met", "Métricas", metricas, setMetricas, 8, "CPU %, memória, IOPS de disco, conexões ativas, latência...")}
          {campo("logs", "Logs", logs, setLogs, 10, "Cole aqui os logs do banco, funções ou da aplicação")}
          <Button onClick={analisar} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : "Analisar com IA"}
          </Button>
        </CardContent>
      </Card>
      {analise && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Análise gerada por IA — confirme antes de agir.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{analise}</ReactMarkdown>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
