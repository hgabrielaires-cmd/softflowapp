import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS } from "@/lib/supabase-types";
import type { AppRole } from "@/lib/supabase-types";
import { ALL_ROLES, TIPO_TECNICO_OPTIONS } from "../constants";
import type { UserWithRoles, MesaOption } from "../types";
import {
  Users,
  KeyRound,
  Bell,
  Loader2,
  Globe,
  ShoppingCart,
  Wrench,
  Headphones,
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  Ban,
} from "lucide-react";

interface Filial {
  id: string;
  nome: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: UserWithRoles | null;
  // Form state
  editName: string;
  setEditName: (v: string) => void;
  editTelefone: string;
  setEditTelefone: (v: string) => void;
  editRole: AppRole;
  setEditRole: (v: AppRole) => void;
  editAcessoGlobal: boolean;
  setEditAcessoGlobal: (v: boolean) => void;
  editFilialIds: string[];
  setEditFilialIds: React.Dispatch<React.SetStateAction<string[]>>;
  editIsVendedor: boolean;
  setEditIsVendedor: (v: boolean) => void;
  editRecebeComissao: boolean;
  setEditRecebeComissao: (v: boolean) => void;
  editComissaoImp: string;
  setEditComissaoImp: (v: string) => void;
  editComissaoMens: string;
  setEditComissaoMens: (v: string) => void;
  editComissaoServ: string;
  setEditComissaoServ: (v: string) => void;
  editIsTecnico: boolean;
  setEditIsTecnico: (v: boolean) => void;
  editTipoTecnico: string;
  setEditTipoTecnico: (v: string) => void;
  editMesaIds: string[];
  setEditMesaIds: React.Dispatch<React.SetStateAction<string[]>>;
  editDescontoLimiteImp: string;
  setEditDescontoLimiteImp: (v: string) => void;
  editDescontoLimiteMens: string;
  setEditDescontoLimiteMens: (v: string) => void;
  editGestorDesconto: boolean;
  setEditGestorDesconto: (v: boolean) => void;
  editPermitirCnpjDuplicado: boolean;
  setEditPermitirCnpjDuplicado: (v: boolean) => void;
  editPermiteEnviarEspelho: boolean;
  setEditPermiteEnviarEspelho: (v: boolean) => void;
  editPermiteResetarProjeto: boolean;
  setEditPermiteResetarProjeto: (v: boolean) => void;
  editPermiteCancelarProjeto: boolean;
  setEditPermiteCancelarProjeto: (v: boolean) => void;
  editPermiteVerValoresProjeto: boolean;
  setEditPermiteVerValoresProjeto: (v: boolean) => void;
  editActive: boolean;
  setEditActive: (v: boolean) => void;
  editIsAtendenteChat: boolean;
  setEditIsAtendenteChat: (v: boolean) => void;
  saving: boolean;
  handleEdit: (e: React.FormEvent) => void;
  // Data
  filiais: Filial[];
  mesasDisponiveis: MesaOption[];
}

export function EditUserDialog({
  open,
  onOpenChange,
  editingUser,
  editName, setEditName,
  editTelefone, setEditTelefone,
  editRole, setEditRole,
  editAcessoGlobal, setEditAcessoGlobal,
  editFilialIds, setEditFilialIds,
  editIsVendedor, setEditIsVendedor,
  editRecebeComissao, setEditRecebeComissao,
  editComissaoImp, setEditComissaoImp,
  editComissaoMens, setEditComissaoMens,
  editComissaoServ, setEditComissaoServ,
  editIsTecnico, setEditIsTecnico,
  editTipoTecnico, setEditTipoTecnico,
  editMesaIds, setEditMesaIds,
  editDescontoLimiteImp, setEditDescontoLimiteImp,
  editDescontoLimiteMens, setEditDescontoLimiteMens,
  editGestorDesconto, setEditGestorDesconto,
  editPermitirCnpjDuplicado, setEditPermitirCnpjDuplicado,
  editPermiteEnviarEspelho, setEditPermiteEnviarEspelho,
  editPermiteResetarProjeto, setEditPermiteResetarProjeto,
  editPermiteCancelarProjeto, setEditPermiteCancelarProjeto,
  editPermiteVerValoresProjeto, setEditPermiteVerValoresProjeto,
  editActive, setEditActive,
  editIsAtendenteChat, setEditIsAtendenteChat,
  saving,
  handleEdit,
  filiais,
  mesasDisponiveis,
}: EditUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEdit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 mb-3">
              <TabsTrigger value="dados" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="permissoes" className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Permissões Especiais
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Notificações
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-1">
              {/* ── Tab Dados ── */}
              <TabsContent value="dados" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label>Nome completo</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input value={editingUser?.email || ""} disabled className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={editTelefone}
                      onChange={(e) => setEditTelefone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cargo</Label>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Filiais */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filiais de Acesso</p>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        Acesso global
                      </Label>
                      <Switch checked={editAcessoGlobal} onCheckedChange={(v) => {
                        setEditAcessoGlobal(v);
                        if (v) setEditFilialIds([]);
                      }} />
                    </div>
                  </div>
                  {!editAcessoGlobal && (
                    <div className="space-y-2">
                      {filiais.map((fil) => (
                        <div key={fil.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                          <span className="text-sm">{fil.nome}</span>
                          <Switch
                            checked={editFilialIds.includes(fil.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditFilialIds((prev) => [...prev, fil.id]);
                              } else {
                                setEditFilialIds((prev) => prev.filter((id) => id !== fil.id));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {editAcessoGlobal && (
                    <p className="text-xs text-muted-foreground">Este usuário terá acesso a todas as filiais.</p>
                  )}
                </div>
                {/* Vendedor */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        É Vendedor?
                      </Label>
                      <p className="text-xs text-muted-foreground">Este usuário realiza vendas e pode receber comissão</p>
                    </div>
                    <Switch checked={editIsVendedor} onCheckedChange={setEditIsVendedor} />
                  </div>
                  {editIsVendedor && (
                    <>
                      <div className="border-t border-border" />
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                          <Switch checked={editRecebeComissao} onCheckedChange={setEditRecebeComissao} />
                        </div>
                      </div>
                      {editRecebeComissao && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Implantação (%)</Label>
                            <Input
                              type="number" min="0" max="100" step="0.01"
                              value={editComissaoImp}
                              onChange={(e) => setEditComissaoImp(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Mensalidade (%)</Label>
                            <Input
                              type="number" min="0" max="100" step="0.01"
                              value={editComissaoMens}
                              onChange={(e) => setEditComissaoMens(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Serviço (%)</Label>
                            <Input
                              type="number" min="0" max="100" step="0.01"
                              value={editComissaoServ}
                              onChange={(e) => setEditComissaoServ(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Técnico */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <Wrench className="h-4 w-4 text-primary" />
                        É Técnico?
                      </Label>
                      <p className="text-xs text-muted-foreground">Realiza atendimentos técnicos e pode ser apontado para agenda</p>
                    </div>
                    <Switch checked={editIsTecnico} onCheckedChange={setEditIsTecnico} />
                  </div>
                  {editIsTecnico && (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                      <Label className="text-xs font-medium">Tipo de Atendimento Técnico</Label>
                      <div className="space-y-1.5">
                        {TIPO_TECNICO_OPTIONS.map((opt) => (
                          <div key={opt.value} className="flex items-center justify-between rounded px-2 py-1">
                            <span className="text-xs">{opt.label}</span>
                            <Switch
                              checked={editTipoTecnico === opt.value}
                              onCheckedChange={(checked) => { if (checked) setEditTipoTecnico(opt.value); }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Mesas */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5" />
                    Mesas de Atendimento
                  </p>
                  <div className="space-y-2">
                    {mesasDisponiveis.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                        <span className="text-sm">{m.nome}</span>
                        <Switch
                          checked={editMesaIds.includes(m.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setEditMesaIds((prev) => [...prev, m.id]);
                            else setEditMesaIds((prev) => prev.filter((id) => id !== m.id));
                          }}
                        />
                      </div>
                    ))}
                    {mesasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mesa cadastrada.</p>}
                  </div>
                </div>
                {/* Desconto */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limite de Desconto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Desconto máx. implantação (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        value={editDescontoLimiteImp}
                        onChange={(e) => setEditDescontoLimiteImp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Desconto máx. mensalidade (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        value={editDescontoLimiteMens}
                        onChange={(e) => setEditDescontoLimiteMens(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {/* Atendente Chat */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        É atendente de chat
                      </Label>
                      <p className="text-xs text-muted-foreground">Atendentes aparecem na distribuição, transferência e seleção de responsável no chat</p>
                    </div>
                    <Switch checked={editIsAtendenteChat} onCheckedChange={setEditIsAtendenteChat} />
                  </div>
                </div>
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Status</Label>
                    <p className="text-xs text-muted-foreground">{editActive ? "Usuário ativo no sistema" : "Usuário sem acesso ao sistema"}</p>
                  </div>
                  <Switch checked={editActive} onCheckedChange={setEditActive} />
                </div>
              </TabsContent>

              {/* ── Tab Permissões Especiais ── */}
              <TabsContent value="permissoes" className="space-y-4 mt-0">
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Gestor de Desconto
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Recebe notificações e pode aprovar/reprovar solicitações de desconto acima do limite permitido.
                      </p>
                    </div>
                    <Switch checked={editGestorDesconto} onCheckedChange={setEditGestorDesconto} />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                        Permitir Cadastro CNPJ Duplicado
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite cadastrar clientes com CNPJ/CPF já existente no sistema.
                      </p>
                    </div>
                    <Switch checked={editPermitirCnpjDuplicado} onCheckedChange={setEditPermitirCnpjDuplicado} />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        Enviar Espelho via WhatsApp
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite enviar o resumo do espelho do cliente via WhatsApp diretamente pelo sistema.
                      </p>
                    </div>
                    <Switch checked={editPermiteEnviarEspelho} onCheckedChange={setEditPermiteEnviarEspelho} />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                        Resetar Projeto
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite resetar projetos no painel de atendimento, apagando histórico e voltando para etapa inicial.
                      </p>
                    </div>
                    <Switch checked={editPermiteResetarProjeto} onCheckedChange={setEditPermiteResetarProjeto} />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <Ban className="h-4 w-4 text-red-500" />
                        Cancelar Projeto
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite cancelar projetos no painel de atendimento, registrando o motivo no relatório de projetos cancelados.
                      </p>
                    </div>
                    <Switch checked={editPermiteCancelarProjeto} onCheckedChange={setEditPermiteCancelarProjeto} />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                        Ver Valores do Projeto em Detalhes
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite visualizar os valores financeiros (implantação, mensalidade, etc.) nos detalhes do projeto no painel de atendimento.
                      </p>
                    </div>
                    <Switch checked={editPermiteVerValoresProjeto} onCheckedChange={setEditPermiteVerValoresProjeto} />
                  </div>
                </div>
              </TabsContent>

              {/* ── Tab Notificações ── */}
              <TabsContent value="notificacoes" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground mb-1">Em breve</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Configurações de preferências de notificações por usuário estarão disponíveis em breve.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-3 shrink-0 border-t border-border mt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
