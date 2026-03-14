import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHelpdeskTipos, useHelpdeskModelos } from "./tickets/useTicketsQueries";
import { useSaveHelpdeskTipo, useSaveHelpdeskModelo } from "./tickets/useTicketsForm";
import { TICKET_MESAS } from "./tickets/constants";
import { Settings, Plus, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HelpdeskParametros() {
  const [activeTab, setActiveTab] = useState("tipos");
  const [editingTipo, setEditingTipo] = useState<any>(null);
  const [editingModelo, setEditingModelo] = useState<any>(null);

  const { data: tipos = [] } = useHelpdeskTipos();
  const { data: modelos = [] } = useHelpdeskModelos();
  const saveTipo = useSaveHelpdeskTipo();
  const saveModelo = useSaveHelpdeskModelo();

  // Tipo form state
  const [tipoNome, setTipoNome] = useState("");
  const [tipoDescricao, setTipoDescricao] = useState("");
  const [tipoSla, setTipoSla] = useState(24);
  const [tipoMesa, setTipoMesa] = useState("Suporte");
  const [tipoAtivo, setTipoAtivo] = useState(true);

  // Modelo form state
  const [modeloNome, setModeloNome] = useState("");
  const [modeloTipoId, setModeloTipoId] = useState<string | null>(null);
  const [modeloTitulo, setModeloTitulo] = useState("");
  const [modeloCorpo, setModeloCorpo] = useState("");
  const [modeloAtivo, setModeloAtivo] = useState(true);

  const resetTipoForm = () => {
    setEditingTipo(null);
    setTipoNome(""); setTipoDescricao(""); setTipoSla(24); setTipoMesa("Suporte"); setTipoAtivo(true);
  };

  const resetModeloForm = () => {
    setEditingModelo(null);
    setModeloNome(""); setModeloTipoId(null); setModeloTitulo(""); setModeloCorpo(""); setModeloAtivo(true);
  };

  const loadTipo = (t: any) => {
    setEditingTipo(t);
    setTipoNome(t.nome); setTipoDescricao(t.descricao || ""); setTipoSla(t.sla_horas); setTipoMesa(t.mesa_padrao); setTipoAtivo(t.ativo);
  };

  const loadModelo = (m: any) => {
    setEditingModelo(m);
    setModeloNome(m.nome); setModeloTipoId(m.tipo_atendimento_id); setModeloTitulo(m.titulo_padrao || ""); setModeloCorpo(m.corpo_html); setModeloAtivo(m.ativo);
  };

  const handleSaveTipo = () => {
    saveTipo.mutate({
      id: editingTipo?.id,
      nome: tipoNome,
      descricao: tipoDescricao || null,
      sla_horas: tipoSla,
      mesa_padrao: tipoMesa,
      ativo: tipoAtivo,
    }, { onSuccess: resetTipoForm });
  };

  const handleSaveModelo = () => {
    saveModelo.mutate({
      id: editingModelo?.id,
      nome: modeloNome,
      tipo_atendimento_id: modeloTipoId,
      titulo_padrao: modeloTitulo || null,
      corpo_html: modeloCorpo,
      ativo: modeloAtivo,
    }, { onSuccess: resetModeloForm });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4 space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Parâmetros Helpdesk
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="tipos">Tipos de Atendimento</TabsTrigger>
            <TabsTrigger value="modelos">Modelos de Ticket</TabsTrigger>
          </TabsList>

          {/* TIPOS */}
          <TabsContent value="tipos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tipos de Atendimento</h2>
              <Button size="sm" onClick={resetTipoForm}><Plus className="h-4 w-4 mr-1" /> Novo Tipo</Button>
            </div>

            <div className="flex gap-4">
              {/* Table */}
              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>SLA (h)</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tipos.map((t: any) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadTipo(t)}>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>{t.sla_horas}h</TableCell>
                        <TableCell>{t.mesa_padrao}</TableCell>
                        <TableCell>
                          <Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tipos.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum tipo cadastrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Form inline */}
              <div className="w-[380px] bg-card rounded-xl border p-4 space-y-3 shrink-0">
                <h3 className="text-sm font-semibold">{editingTipo ? "Editar Tipo" : "Novo Tipo"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Mesa padrão</Label>
                    <Select value={tipoMesa} onValueChange={setTipoMesa}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_MESAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">SLA (horas)</Label>
                    <Input type="number" value={tipoSla} onChange={(e) => setTipoSla(Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Label className="text-xs">Ativo</Label>
                    <Switch checked={tipoAtivo} onCheckedChange={setTipoAtivo} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea value={tipoDescricao} onChange={(e) => setTipoDescricao(e.target.value)} className="text-sm min-h-[60px]" />
                </div>
                <Button className="w-full" onClick={handleSaveTipo} disabled={!tipoNome.trim() || saveTipo.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* MODELOS */}
          <TabsContent value="modelos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Modelos de Ticket</h2>
              <Button size="sm" onClick={resetModeloForm}><Plus className="h-4 w-4 mr-1" /> Novo Modelo</Button>
            </div>

            <div className="flex gap-4">
              {/* Table */}
              <div className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelos.map((m: any) => (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadModelo(m)}>
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell>{m.tipo_atendimento?.nome || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {modelos.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum modelo cadastrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Form inline */}
              <div className="w-[420px] bg-card rounded-xl border p-4 space-y-3 shrink-0">
                <h3 className="text-sm font-semibold">{editingModelo ? "Editar Modelo" : "Novo Modelo"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={modeloNome} onChange={(e) => setModeloNome(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de Atendimento</Label>
                    <Select value={modeloTipoId || "__none__"} onValueChange={(v) => setModeloTipoId(v === "__none__" ? null : v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {tipos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Título padrão</Label>
                  <Input value={modeloTitulo} onChange={(e) => setModeloTitulo(e.target.value)} className="text-sm" placeholder="Pré-preenche o título do ticket" />
                </div>
                <div>
                  <Label className="text-xs">Corpo do modelo</Label>
                  <Textarea value={modeloCorpo} onChange={(e) => setModeloCorpo(e.target.value)} className="text-sm min-h-[120px]"
                    placeholder="Use {cliente}, {contrato}, {data} como variáveis" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Ativo</Label>
                  <Switch checked={modeloAtivo} onCheckedChange={setModeloAtivo} />
                </div>
                <Button className="w-full" onClick={handleSaveModelo} disabled={!modeloNome.trim() || saveModelo.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
