import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useChatParametrosQueries } from "../useChatParametrosQueries";
import { useChatParametrosForm } from "../useChatParametrosForm";

interface RespostaForm {
  id?: string;
  atalho: string;
  conteudo: string;
  setor_id: string | null;
  ativo: boolean;
}

const EMPTY: RespostaForm = { atalho: "", conteudo: "", setor_id: null, ativo: true };

export function RespostasRapidasTab() {
  const { respostasQuery, setoresQuery } = useChatParametrosQueries();
  const { salvarResposta, excluirResposta } = useChatParametrosForm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RespostaForm>(EMPTY);
  const setores = setoresQuery.data || [];

  const openNew = () => { setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (item: any) => {
    setForm({ id: item.id, atalho: item.atalho, conteudo: item.conteudo, setor_id: item.setor_id, ativo: item.ativo ?? true });
    setDialogOpen(true);
  };

  const handleSave = () => {
    salvarResposta.mutate(form, { onSuccess: () => setDialogOpen(false) });
  };

  const handleDelete = (id: string) => {
    if (confirm("Excluir esta resposta rápida?")) excluirResposta.mutate(id);
  };

  if (respostasQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const items = respostasQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Respostas Rápidas</h3>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Resposta</Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma resposta rápida cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Atalho</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="w-32">Setor</TableHead>
                <TableHead className="w-20">Ativo</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.atalho}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{item.conteudo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.setor?.nome || "Todos"}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Resposta" : "Nova Resposta Rápida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Atalho (ex: /boa_tarde)</Label>
              <Input value={form.atalho} onChange={(e) => setForm((p) => ({ ...p, atalho: e.target.value }))} placeholder="/atalho" />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea rows={4} value={form.conteudo} onChange={(e) => setForm((p) => ({ ...p, conteudo: e.target.value }))} placeholder="Texto da resposta rápida..." />
            </div>
            <div>
              <Label>Setor (opcional)</Label>
              <Select value={form.setor_id || "todos"} onValueChange={(v) => setForm((p) => ({ ...p, setor_id: v === "todos" ? null : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {setores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={salvarResposta.isPending}>
              {salvarResposta.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
