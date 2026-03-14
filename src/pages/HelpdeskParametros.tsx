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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHelpdeskTipos, useHelpdeskModelos } from "./tickets/useTicketsQueries";
import { useSaveHelpdeskTipo, useSaveHelpdeskModelo } from "./tickets/useTicketsForm";
import { TICKET_MESAS } from "./tickets/constants";
import { Settings, Plus, Save, Braces, Tag, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VARIAVEIS_MODELO = [
  { var: "{cliente.nome_fantasia}", desc: "Nome fantasia do cliente" },
  { var: "{cliente.razao_social}", desc: "Razão social do cliente" },
  { var: "{cliente.cnpj_cpf}", desc: "CNPJ/CPF do cliente" },
  { var: "{contato.nome}", desc: "Nome do contato principal" },
  { var: "{contato.email}", desc: "E-mail do contato" },
  { var: "{contato.telefone}", desc: "Telefone do contato" },
  { var: "{contrato.numero}", desc: "Número do contrato" },
  { var: "{usuario.nome}", desc: "Nome do usuário logado" },
  { var: "{data}", desc: "Data atual" },
  { var: "{ticket.numero}", desc: "Número do ticket" },
];

function useHelpdeskTags() {
  return useQuery({
    queryKey: ["helpdesk_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tags")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("helpdesk_tags").insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_tags"] });
      toast.success("Tag criada!");
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate")) {
        toast.error("Essa tag já existe.");
      } else {
        toast.error("Erro ao criar tag.");
      }
    },
  });
}

function useToggleTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("helpdesk_tags").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk_tags"] }),
  });
}

function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("helpdesk_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_tags"] });
      toast.success("Tag removida!");
    },
  });
}

export default function HelpdeskParametros() {
  const [activeTab, setActiveTab] = useState("tipos");

  const { data: tipos = [] } = useHelpdeskTipos();
  const { data: modelos = [] } = useHelpdeskModelos();
  const saveTipo = useSaveHelpdeskTipo();
  const saveModelo = useSaveHelpdeskModelo();

  // Tags
  const { data: tags = [] } = useHelpdeskTags();
  const createTag = useCreateTag();
  const toggleTag = useToggleTag();
  const deleteTag = useDeleteTag();
  const [newTagName, setNewTagName] = useState("");

  // Dialog state
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);

  // Tipo form state
  const [editingTipoId, setEditingTipoId] = useState<string | undefined>();
  const [tipoNome, setTipoNome] = useState("");
  const [tipoDescricao, setTipoDescricao] = useState("");
  const [tipoSla, setTipoSla] = useState(24);
  const [tipoMesa, setTipoMesa] = useState("Suporte");
  const [tipoAtivo, setTipoAtivo] = useState(true);

  // Modelo form state
  const [editingModeloId, setEditingModeloId] = useState<string | undefined>();
  const [modeloNome, setModeloNome] = useState("");
  const [modeloTipoId, setModeloTipoId] = useState<string | null>(null);
  const [modeloTitulo, setModeloTitulo] = useState("");
  const [modeloCorpo, setModeloCorpo] = useState("");
  const [modeloAtivo, setModeloAtivo] = useState(true);

  const openNewTipo = () => {
    setEditingTipoId(undefined);
    setTipoNome("");
    setTipoDescricao("");
    setTipoSla(24);
    setTipoMesa("Suporte");
    setTipoAtivo(true);
    setTipoDialogOpen(true);
  };

  const openEditTipo = (t: any) => {
    setEditingTipoId(t.id);
    setTipoNome(t.nome);
    setTipoDescricao(t.descricao || "");
    setTipoSla(t.sla_horas);
    setTipoMesa(t.mesa_padrao);
    setTipoAtivo(t.ativo);
    setTipoDialogOpen(true);
  };

  const openNewModelo = () => {
    setEditingModeloId(undefined);
    setModeloNome("");
    setModeloTipoId(null);
    setModeloTitulo("");
    setModeloCorpo("");
    setModeloAtivo(true);
    setModeloDialogOpen(true);
  };

  const openEditModelo = (m: any) => {
    setEditingModeloId(m.id);
    setModeloNome(m.nome);
    setModeloTipoId(m.tipo_atendimento_id);
    setModeloTitulo(m.titulo_padrao || "");
    setModeloCorpo(m.corpo_html);
    setModeloAtivo(m.ativo);
    setModeloDialogOpen(true);
  };

  const handleSaveTipo = () => {
    saveTipo.mutate({
      id: editingTipoId,
      nome: tipoNome,
      descricao: tipoDescricao || null,
      sla_horas: tipoSla,
      mesa_padrao: tipoMesa,
      ativo: tipoAtivo,
    }, { onSuccess: () => setTipoDialogOpen(false) });
  };

  const handleSaveModelo = () => {
    saveModelo.mutate({
      id: editingModeloId,
      nome: modeloNome,
      tipo_atendimento_id: modeloTipoId,
      titulo_padrao: modeloTitulo || null,
      corpo_html: modeloCorpo,
      ativo: modeloAtivo,
    }, { onSuccess: () => setModeloDialogOpen(false) });
  };

  const handleAddTag = () => {
    const val = newTagName.trim().toUpperCase();
    if (!val) return;
    const formatted = val.startsWith("#") ? val : `#${val}`;
    createTag.mutate(formatted, { onSuccess: () => setNewTagName("") });
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
            <TabsTrigger value="tags" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Tags
            </TabsTrigger>
          </TabsList>

          {/* TIPOS */}
          <TabsContent value="tipos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tipos de Atendimento</h2>
              <Button size="sm" onClick={openNewTipo}>
                <Plus className="h-4 w-4 mr-1" /> Novo Tipo
              </Button>
            </div>

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
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditTipo(t)}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>{t.sla_horas}h</TableCell>
                    <TableCell>{t.mesa_padrao}</TableCell>
                    <TableCell>
                      <Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {tipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum tipo cadastrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* MODELOS */}
          <TabsContent value="modelos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Modelos de Ticket</h2>
              <Button size="sm" onClick={openNewModelo}>
                <Plus className="h-4 w-4 mr-1" /> Novo Modelo
              </Button>
            </div>

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
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditModelo(m)}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell>{m.tipo_atendimento?.nome || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {modelos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum modelo cadastrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* TAGS */}
          <TabsContent value="tags" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tags de Tickets</h2>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da tag (ex: NFE)"
                className="w-64 h-9"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTagName.trim() || createTag.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag: any) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                        {tag.nome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tag.ativo}
                        onCheckedChange={(v) => toggleTag.mutate({ id: tag.id, ativo: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => deleteTag.mutate(tag.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma tag cadastrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <p className="text-xs text-muted-foreground">
              As tags cadastradas aqui aparecem como sugestão ao abrir um novo ticket. O prefixo # é adicionado automaticamente.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Tipo */}
      <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTipoId ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} placeholder="Ex: Suporte Técnico Remoto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Mesa padrão</Label>
                <Select value={tipoMesa} onValueChange={setTipoMesa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_MESAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">SLA (horas)</Label>
                <Input type="number" value={tipoSla} onChange={(e) => setTipoSla(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Ativo</Label>
              <Switch checked={tipoAtivo} onCheckedChange={setTipoAtivo} />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={tipoDescricao} onChange={(e) => setTipoDescricao(e.target.value)} className="min-h-[80px]" />
            </div>
            <Button className="w-full" onClick={handleSaveTipo} disabled={!tipoNome.trim() || saveTipo.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modelo */}
      <Dialog open={modeloDialogOpen} onOpenChange={setModeloDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModeloId ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={modeloNome} onChange={(e) => setModeloNome(e.target.value)} placeholder="Nome do modelo" />
            </div>
            <div>
              <Label className="text-xs">Tipo de Atendimento</Label>
              <Select value={modeloTipoId || "__none__"} onValueChange={(v) => setModeloTipoId(v === "__none__" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {tipos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título padrão</Label>
              <Input value={modeloTitulo} onChange={(e) => setModeloTitulo(e.target.value)} placeholder="Pré-preenche o título do ticket" />
            </div>
            <div>
              <Label className="text-xs">Corpo do modelo</Label>
              <Textarea value={modeloCorpo} onChange={(e) => setModeloCorpo(e.target.value)} className="min-h-[120px]"
                placeholder="Use {cliente}, {contrato}, {data} como variáveis" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={modeloAtivo} onCheckedChange={setModeloAtivo} />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    <Braces className="h-4 w-4 mr-1" /> Variáveis
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b">
                    <p className="text-xs font-semibold text-foreground">Variáveis disponíveis</p>
                    <p className="text-[11px] text-muted-foreground">Clique para copiar e cole no corpo do modelo</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {VARIAVEIS_MODELO.map((v) => (
                      <button
                        key={v.var}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(v.var);
                          setModeloCorpo((prev) => prev + v.var);
                        }}
                      >
                        <span className="text-xs font-mono text-primary">{v.var}</span>
                        <span className="block text-[11px] text-muted-foreground">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button className="w-full" onClick={handleSaveModelo} disabled={!modeloNome.trim() || saveModelo.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
