import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, GripVertical } from "lucide-react";
import { EtapaAlertasConfig, defaultAlertLevel, type AlertLevel } from "@/components/EtapaAlertasConfig";

interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  controla_sla: boolean;
  prazo_maximo_horas: number | null;
  alerta_whatsapp: boolean;
  alerta_notificacoes: boolean;
  created_at: string;
  updated_at: string;
}

const defaultForm = {
  nome: "",
  cor: "#3b82f6",
  controla_sla: false,
  prazo_horas: "",
  prazo_minutos: "",
  alerta_whatsapp: false,
  alerta_notificacoes: false,
};

// filialId -> AlertLevel[]
type FilialAlertMap = Record<string, AlertLevel[]>;

function buildDefaultFilialMap(filiais: { id: string }[]): FilialAlertMap {
  const map: FilialAlertMap = {};
  filiais.forEach((f) => {
    map[f.id] = [1, 2, 3].map(defaultAlertLevel);
  });
  return map;
}

export default function EtapasPainel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PainelEtapa | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [whatsappByFilial, setWhatsappByFilial] = useState<FilialAlertMap>({});
  const [notifByFilial, setNotifByFilial] = useState<FilialAlertMap>({});
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ["painel_etapas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("painel_etapas").select("*").order("ordem");
      if (error) throw error;
      return data as PainelEtapa[];
    },
  });

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais_ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ["message_templates_alerta_sla_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("message_templates").select("id, nome, tipo, categoria").eq("ativo", true).eq("categoria", "alerta_sla").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const whatsappTemplates = allTemplates.filter((t) => t.tipo === "whatsapp");
  const notifTemplates = allTemplates.filter((t) => t.tipo === "notificacao");

  const { data: usuarios = [] } = useQuery({
    queryKey: ["profiles_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, user_id, acesso_global").eq("active", true).order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string; user_id: string; acesso_global: boolean }[];
    },
  });

  // Load usuario_filiais junction for filtering
  const { data: usuarioFiliais = [] } = useQuery({
    queryKey: ["usuario_filiais_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuario_filiais").select("user_id, filial_id");
      if (error) throw error;
      return data as { user_id: string; filial_id: string }[];
    },
  });

  // Build map: filial_id -> profile ids (includes global users)
  const usuariosPorFilial: Record<string, string[]> = {};
  filiais.forEach((f) => {
    const globalUserIds = usuarios.filter((u) => u.acesso_global).map((u) => u.id);
    const filialUserIds = usuarioFiliais
      .filter((uf) => uf.filial_id === f.id)
      .map((uf) => {
        const profile = usuarios.find((u) => u.user_id === uf.user_id);
        return profile?.id;
      })
      .filter(Boolean) as string[];
    // Merge and deduplicate
    usuariosPorFilial[f.id] = [...new Set([...filialUserIds, ...globalUserIds])];
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        cor: form.cor || null,
        controla_sla: form.controla_sla,
        prazo_maximo_horas: form.controla_sla && (form.prazo_horas || form.prazo_minutos) ? Number(form.prazo_horas || 0) + Number(form.prazo_minutos || 0) / 60 : null,
        alerta_whatsapp: form.alerta_whatsapp,
        alerta_notificacoes: form.alerta_notificacoes,
      };

      let etapaId: string;

      if (editing) {
        const { error } = await supabase.from("painel_etapas").update(payload).eq("id", editing.id);
        if (error) throw error;
        etapaId = editing.id;
      } else {
        const maxOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1;
        const { data, error } = await supabase.from("painel_etapas").insert({ ...payload, ordem: maxOrdem }).select("id").single();
        if (error) throw error;
        etapaId = data.id;
      }

      // Delete existing alerts for this etapa
      await supabase.from("painel_etapa_alertas").delete().eq("etapa_id", etapaId);

      const alertsToInsert: any[] = [];

      const addAlerts = (canal: string, filialMap: FilialAlertMap, isEnabled: boolean) => {
        if (!isEnabled) return;
        Object.entries(filialMap).forEach(([filialId, levels]) => {
          levels.forEach((lvl) => {
            if (lvl.ativo) {
              alertsToInsert.push({
                etapa_id: etapaId,
                canal,
                nivel: lvl.nivel,
                template_id: lvl.template_id || null,
                usuario_ids: lvl.usuario_ids.length > 0 ? lvl.usuario_ids : [],
                horas_apos_sla: Number(lvl.horas_apos_sla) || 0,
                ativo: true,
                filial_id: filialId,
                notificar_vendedor: lvl.notificar_vendedor || false,
              });
            }
          });
        });
      };

      addAlerts("whatsapp", whatsappByFilial, form.alerta_whatsapp);
      addAlerts("notificacao", notifByFilial, form.alerta_notificacoes);

      if (alertsToInsert.length > 0) {
        const { error: alertError } = await supabase.from("painel_etapa_alertas").insert(alertsToInsert);
        if (alertError) throw alertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
      toast.success(editing ? "Etapa atualizada!" : "Etapa criada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar etapa."),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("painel_etapas").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel_etapas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("painel_etapas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
      toast.success("Etapa excluída!");
    },
    onError: () => toast.error("Erro ao excluir etapa. Pode estar vinculada a atendimentos."),
  });

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...etapas];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    const updates = reordered.map((etapa, idx) =>
      supabase.from("painel_etapas").update({ ordem: idx + 1 }).eq("id", etapa.id)
    );
    dragItem.current = null;
    dragOverItem.current = null;
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["painel_etapas"] });
    } catch {
      toast.error("Erro ao reordenar etapas.");
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ ...defaultForm });
    setWhatsappByFilial(buildDefaultFilialMap(filiais));
    setNotifByFilial(buildDefaultFilialMap(filiais));
    setDialogOpen(true);
  }

  async function openEdit(etapa: PainelEtapa) {
    setEditing(etapa);
    setForm({
      nome: etapa.nome,
      cor: etapa.cor || "#3b82f6",
      controla_sla: etapa.controla_sla,
      prazo_horas: etapa.prazo_maximo_horas != null ? String(Math.floor(etapa.prazo_maximo_horas)) : "",
      prazo_minutos: etapa.prazo_maximo_horas != null ? String(Math.round((etapa.prazo_maximo_horas % 1) * 60)) : "",
      alerta_whatsapp: etapa.alerta_whatsapp,
      alerta_notificacoes: etapa.alerta_notificacoes,
    });

    // Load existing alerts
    const { data: alertas } = await supabase
      .from("painel_etapa_alertas")
      .select("*")
      .eq("etapa_id", etapa.id)
      .order("nivel");

    const wMap: FilialAlertMap = buildDefaultFilialMap(filiais);
    const nMap: FilialAlertMap = buildDefaultFilialMap(filiais);

    alertas?.forEach((a: any) => {
      const fId = a.filial_id;
      if (!fId) return;
      const targetMap = a.canal === "whatsapp" ? wMap : nMap;
      if (!targetMap[fId]) targetMap[fId] = [1, 2, 3].map(defaultAlertLevel);
      const levelIdx = targetMap[fId].findIndex((l) => l.nivel === a.nivel);
      if (levelIdx >= 0) {
        targetMap[fId][levelIdx] = {
          nivel: a.nivel,
          template_id: a.template_id || "",
          usuario_ids: a.usuario_ids || [],
          horas_apos_sla: String(a.horas_apos_sla || 0),
          ativo: a.ativo,
          notificar_vendedor: a.notificar_vendedor || false,
        };
      }
    });

    setWhatsappByFilial(wMap);
    setNotifByFilial(nMap);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...defaultForm });
    setWhatsappByFilial({});
    setNotifByFilial({});
  }

  function handleFilialLevelChange(
    setter: React.Dispatch<React.SetStateAction<FilialAlertMap>>
  ) {
    return (filialId: string, nivel: number, field: keyof AlertLevel, value: any) => {
      setter((prev) => {
        const filialLevels = prev[filialId] || [1, 2, 3].map(defaultAlertLevel);
        return {
          ...prev,
          [filialId]: filialLevels.map((l) => (l.nivel === nivel ? { ...l, [field]: value } : l)),
        };
      });
    };
  }

  const filtered = search ? etapas.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase())) : etapas;
  const isDraggable = !search;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Etapas do Painel</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Etapa</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24 text-center">Cor</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-32 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma etapa encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((etapa, idx) => (
                  <TableRow
                    key={etapa.id}
                    draggable={isDraggable}
                    onDragStart={() => { dragItem.current = idx; }}
                    onDragEnter={() => { dragOverItem.current = idx; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                    className={isDraggable ? "cursor-grab active:cursor-grabbing" : ""}
                  >
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isDraggable && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">{etapa.ordem}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{etapa.nome}</TableCell>
                    <TableCell className="text-center">
                      {etapa.cor ? (
                        <div className="inline-flex items-center gap-2">
                          <div className="w-5 h-5 rounded border" style={{ backgroundColor: etapa.cor }} />
                          <span className="text-xs text-muted-foreground">{etapa.cor}</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={etapa.ativo} onCheckedChange={(v) => toggleMutation.mutate({ id: etapa.id, ativo: v })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(etapa)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(etapa.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Onboard" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                <Input value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} className="max-w-32" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Controla SLA</label>
              <Switch checked={form.controla_sla} onCheckedChange={(v) => setForm((p) => ({ ...p, controla_sla: v, prazo_horas: v ? p.prazo_horas : "", prazo_minutos: v ? p.prazo_minutos : "" }))} />
            </div>
            {form.controla_sla && (
              <div>
                <label className="text-sm font-medium">Prazo Máximo para Início *</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1">
                    <Input type="number" min="0" value={form.prazo_horas} onChange={(e) => setForm((p) => ({ ...p, prazo_horas: e.target.value }))} placeholder="0" />
                    <span className="text-xs text-muted-foreground mt-0.5 block">Horas</span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground mt-[-16px]">:</span>
                  <div className="flex-1">
                    <Input type="number" min="0" max="59" value={form.prazo_minutos} onChange={(e) => setForm((p) => ({ ...p, prazo_minutos: e.target.value }))} placeholder="0" />
                    <span className="text-xs text-muted-foreground mt-0.5 block">Minutos</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Se ultrapassado, o card aparecerá como "Tarefa Atrasada" no painel.</p>
              </div>
            )}

            <EtapaAlertasConfig
              canal="whatsapp"
              canalLabel="WhatsApp"
              enabled={form.alerta_whatsapp}
              onEnabledChange={(v) => setForm((p) => ({ ...p, alerta_whatsapp: v }))}
              filiais={filiais}
              filialConfigs={whatsappByFilial}
              onFilialLevelChange={handleFilialLevelChange(setWhatsappByFilial)}
              templates={whatsappTemplates}
              usuarios={usuarios}
              usuariosPorFilial={usuariosPorFilial}
            />

            <EtapaAlertasConfig
              canal="notificacao"
              canalLabel="Notificações"
              enabled={form.alerta_notificacoes}
              onEnabledChange={(v) => setForm((p) => ({ ...p, alerta_notificacoes: v }))}
              filiais={filiais}
              filialConfigs={notifByFilial}
              onFilialLevelChange={handleFilialLevelChange(setNotifByFilial)}
              templates={notifTemplates}
              usuarios={usuarios}
              usuariosPorFilial={usuariosPorFilial}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || (form.controla_sla && !form.prazo_horas && !form.prazo_minutos) || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
