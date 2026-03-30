import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetores, useAtendentes } from "../useChatQueries";
import { MessageSquare, Clock, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";

const PERIODO_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "30d", label: "Últimos 30 dias" },
];

const CORES_GRAFICO = ["hsl(var(--primary))", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

function getDataInicio(periodo: string) {
  const now = new Date();
  switch (periodo) {
    case "hoje": return startOfDay(now).toISOString();
    case "semana": return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case "mes": return startOfMonth(now).toISOString();
    case "30d": return subDays(now, 30).toISOString();
    default: return subDays(now, 30).toISOString();
  }
}

function formatDuracao(segundos: number | null) {
  if (!segundos) return "—";
  const min = Math.floor(segundos / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}

interface Props {
  onVerConversa?: (id: string) => void;
}

export default function ChatDashboard({ onVerConversa }: Props) {
  const [periodo, setPeriodo] = useState("mes");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const { data: setores } = useSetores();
  const { data: atendentes } = useAtendentes();

  const dataInicio = useMemo(() => getDataInicio(periodo), [periodo]);

  const { data: conversas = [] } = useQuery({
    queryKey: ["chat-dashboard", dataInicio, setorFiltro],
    queryFn: async () => {
      let q = supabase
        .from("chat_conversas")
        .select(`
          id, protocolo, status, nome_cliente, numero_cliente,
          atendente_id, setor_id, created_at, iniciado_em,
          atendimento_iniciado_em, encerrado_em,
          tempo_espera_segundos, tempo_atendimento_segundos,
          nps_nota, nps_comentario,
          atendente:profiles!chat_conversas_atendente_id_fkey(user_id, full_name, avatar_url),
          setor:setores!chat_conversas_setor_id_fkey(id, nome)
        `)
        .gte("created_at", dataInicio)
        .order("created_at", { ascending: false });

      if (setorFiltro !== "todos") q = q.eq("setor_id", setorFiltro);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch collaborator participations for the period
  const { data: colaboracoes = [] } = useQuery({
    queryKey: ["chat-dashboard-colab", dataInicio, setorFiltro],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversa_atendentes")
        .select(`
          user_id,
          conversa_id,
          entrou_em,
          conversa:chat_conversas!inner(
            id, atendente_id, status, created_at,
            tempo_atendimento_segundos, nps_nota, setor_id
          )
        `)
        .gte("entrou_em", dataInicio);
      if (error) throw error;

      let result = (data || []) as any[];
      if (setorFiltro !== "todos") {
        result = result.filter((c: any) => c.conversa?.setor_id === setorFiltro);
      }
      return result;
    },
  });

  // KPIs
  const total = conversas.length;
  const encerrados = conversas.filter((c: any) => c.status === "encerrado");
  const tempoMedioAtend = encerrados.length
    ? Math.round(encerrados.reduce((s: number, c: any) => s + (c.tempo_atendimento_segundos || 0), 0) / encerrados.length)
    : 0;
  const tempoMedioEspera = encerrados.length
    ? Math.round(encerrados.reduce((s: number, c: any) => s + (c.tempo_espera_segundos || 0), 0) / encerrados.length)
    : 0;
  const comNps = conversas.filter((c: any) => c.nps_nota != null);
  const npsMedio = comNps.length
    ? (comNps.reduce((s: number, c: any) => s + c.nps_nota, 0) / comNps.length).toFixed(1)
    : "—";
  const taxaResolucao = total > 0 ? Math.round((encerrados.length / total) * 100) : 0;

  // Charts
  const porHora = useMemo(() => {
    const horas = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}h`, total: 0 }));
    conversas.forEach((c: any) => {
      if (c.created_at) {
        const h = new Date(c.created_at).getHours();
        horas[h].total++;
      }
    });
    return horas;
  }, [conversas]);

  const porDia = useMemo(() => {
    const map: Record<string, number> = {};
    conversas.forEach((c: any) => {
      if (c.created_at) {
        const d = format(new Date(c.created_at), "dd/MM");
        map[d] = (map[d] || 0) + 1;
      }
    });
    return Object.entries(map).map(([dia, total]) => ({ dia, total })).slice(-14);
  }, [conversas]);

  const porSetor = useMemo(() => {
    const map: Record<string, number> = {};
    conversas.forEach((c: any) => {
      const nome = (c.setor as any)?.nome || "Sem setor";
      map[nome] = (map[nome] || 0) + 1;
    });
    return Object.entries(map).map(([nome, total]) => ({ nome, total }));
  }, [conversas]);

  // Ranking
  const ranking = useMemo(() => {
    const map: Record<string, { nome: string; avatar: string | null; total: number; tempo: number; npsSum: number; npsCount: number }> = {};
    conversas.forEach((c: any) => {
      if (!c.atendente_id) return;
      const at = c.atendente as any;
      if (!map[c.atendente_id]) {
        map[c.atendente_id] = { nome: at?.full_name || "—", avatar: at?.avatar_url, total: 0, tempo: 0, npsSum: 0, npsCount: 0 };
      }
      map[c.atendente_id].total++;
      if (c.tempo_atendimento_segundos) map[c.atendente_id].tempo += c.tempo_atendimento_segundos;
      if (c.nps_nota != null) { map[c.atendente_id].npsSum += c.nps_nota; map[c.atendente_id].npsCount++; }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [conversas]);

  // NPS ruim
  const npsRuim = useMemo(() =>
    conversas.filter((c: any) => c.nps_nota != null && c.nps_nota <= 2), [conversas]);

  return (
    <div className="space-y-4 p-4">
      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODO_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos os setores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><MessageSquare className="h-4 w-4" /> Atendimentos</div>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-4 w-4" /> Tempo médio atend.</div>
            <p className="text-2xl font-bold">{formatDuracao(tempoMedioAtend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-4 w-4" /> Tempo médio espera</div>
            <p className="text-2xl font-bold">{formatDuracao(tempoMedioEspera)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Star className="h-4 w-4" /> NPS médio</div>
            <p className="text-2xl font-bold">{npsMedio}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-4 w-4" /> Resolução</div>
            <p className="text-2xl font-bold">{taxaResolucao}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Por hora do dia</CardTitle></CardHeader>
          <CardContent className="p-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porHora}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Por dia</CardTitle></CardHeader>
          <CardContent className="p-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Por setor</CardTitle></CardHeader>
          <CardContent className="p-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porSetor} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={70} label={({ nome }) => nome}>
                  {porSetor.map((_, i) => <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking atendentes */}
      <Card>
        <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Ranking de atendentes</CardTitle></CardHeader>
        <CardContent className="p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Atendente</TableHead>
                <TableHead className="text-xs text-right">Atendimentos</TableHead>
                <TableHead className="text-xs text-right">Tempo médio</TableHead>
                <TableHead className="text-xs text-right">NPS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{r.nome}</TableCell>
                  <TableCell className="text-sm text-right">{r.total}</TableCell>
                  <TableCell className="text-sm text-right">{r.total > 0 ? formatDuracao(Math.round(r.tempo / r.total)) : "—"}</TableCell>
                  <TableCell className="text-sm text-right">{r.npsCount > 0 ? (r.npsSum / r.npsCount).toFixed(1) : "—"}</TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* NPS ruim */}
      {npsRuim.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" /> NPS ≤ 2
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Protocolo</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Atendente</TableHead>
                  <TableHead className="text-xs text-center">Nota</TableHead>
                  <TableHead className="text-xs text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {npsRuim.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.protocolo}</TableCell>
                    <TableCell className="text-xs">{c.nome_cliente || "—"}</TableCell>
                    <TableCell className="text-xs">{(c.atendente as any)?.full_name || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="text-xs">{c.nps_nota}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onVerConversa?.(c.id)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
