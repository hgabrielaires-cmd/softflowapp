import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Bot } from "lucide-react";
import { useChatParametrosQueries } from "../useChatParametrosQueries";
import { useChatParametrosForm } from "../useChatParametrosForm";
import { FLUXO_TIPOS, CAMPO_DESTINO_OPCOES } from "../constants";
import { parseOpcoes } from "../helpers";

interface FluxoFormState {
  id?: string;
  ordem: number;
  pergunta: string;
  tipo: string;
  opcoes: { numero: number; texto: string; setor_id?: string }[];
  campo_destino: string | null;
  ativo: boolean;
}

const EMPTY_FLUXO: FluxoFormState = {
  ordem: 1,
  pergunta: "",
  tipo: "opcoes",
  opcoes: [],
  campo_destino: null,
  ativo: true,
};

export function FluxoBotTab() {
  const { fluxoQuery, setoresQuery } = useChatParametrosQueries();
  const { salvarFluxo, excluirFluxo } = useChatParametrosForm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FluxoFormState>(EMPTY_FLUXO);
  const setores = setoresQuery.data || [];

  const openNew = () => {
    const nextOrdem = (fluxoQuery.data?.length || 0) + 1;
    setForm({ ...EMPTY_FLUXO, ordem: nextOrdem });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm({
      id: item.id,
      ordem: item.ordem,
      pergunta: item.pergunta,
      tipo: item.tipo || "opcoes",
      opcoes: parseOpcoes(item.opcoes),
      campo_destino: item.campo_destino,
      ativo: item.ativo ?? true,
    });
    setDialogOpen(true);
  };

  const addOpcao = () => {
    setForm((p) => ({
      ...p,
      opcoes: [...p.opcoes, { numero: p.opcoes.length + 1, texto: "", setor_id: "" }],
    }));
  };

  const removeOpcao = (idx: number) => {
    setForm((p) => ({
      ...p,
      opcoes: p.opcoes.filter((_, i) => i !== idx).map((o, i) => ({ ...o, numero: i + 1 })),
    }));
  };

  const handleSave = () => {
    salvarFluxo.mutate(form, { onSuccess: () => setDialogOpen(false) });
  };

  const handleDelete = (id: string) => {
    if (confirm("Excluir este passo do fluxo?")) excluirFluxo.mutate(id);
  };

  if (fluxoQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const items = fluxoQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fluxo do Bot</h3>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Passo</Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum passo configurado. Clique em "Novo Passo" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ordem</TableHead>
                <TableHead>Pergunta</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-28">Campo Destino</TableHead>
                <TableHead className="w-20">Ativo</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.ordem}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.pergunta}</TableCell>
                  <TableCell><Badge variant="outline">{item.tipo}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.campo_destino || "—"}</TableCell>
                  <TableCell>{item.ativo ? <Badge className="bg-green-100 text-green-700">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Preview do fluxo */}
      {items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Preview do Fluxo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((item: any, idx: number) => {
              const opcoes = parseOpcoes(item.opcoes);
              return (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                  <div className="flex-1 bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-sm">{item.pergunta}</p>
                    {opcoes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {opcoes.map((op: any) => (
                          <p key={op.numero} className="text-xs text-muted-foreground">{op.numero} — {op.texto}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dialog de edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Passo" : "Novo Passo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordem</Label>
                <Input type="number" min={1} value={form.ordem} onChange={(e) => setForm((p) => ({ ...p, ordem: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLUXO_TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Pergunta</Label>
              <Textarea rows={2} value={form.pergunta} onChange={(e) => setForm((p) => ({ ...p, pergunta: e.target.value }))} />
            </div>
            <div>
              <Label>Campo Destino</Label>
              <Select value={form.campo_destino || ""} onValueChange={(v) => setForm((p) => ({ ...p, campo_destino: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CAMPO_DESTINO_OPCOES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
              <Label>Ativo</Label>
            </div>

            {form.tipo === "opcoes" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Opções</Label>
                  <Button variant="outline" size="sm" onClick={addOpcao}><Plus className="h-3 w-3 mr-1" /> Opção</Button>
                </div>
                {form.opcoes.map((op, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-sm font-mono w-6 text-center">{op.numero}</span>
                    <Input
                      placeholder="Texto da opção"
                      value={op.texto}
                      onChange={(e) => {
                        const opcoes = [...form.opcoes];
                        opcoes[idx] = { ...opcoes[idx], texto: e.target.value };
                        setForm((p) => ({ ...p, opcoes }));
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={op.setor_id || ""}
                      onValueChange={(v) => {
                        const opcoes = [...form.opcoes];
                        opcoes[idx] = { ...opcoes[idx], setor_id: v };
                        setForm((p) => ({ ...p, opcoes }));
                      }}
                    >
                      <SelectTrigger className="w-40"><SelectValue placeholder="Setor..." /></SelectTrigger>
                      <SelectContent>
                        {setores.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeOpcao(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={salvarFluxo.isPending}>
              {salvarFluxo.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
