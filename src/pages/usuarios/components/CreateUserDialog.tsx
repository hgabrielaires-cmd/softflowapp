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
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS } from "@/lib/supabase-types";
import type { AppRole } from "@/lib/supabase-types";
import { ALL_ROLES, TIPO_TECNICO_OPTIONS } from "../constants";
import type { MesaOption, SetorOption } from "../types";
import {
  Plus,
  Search,
  Loader2,
  Mail,
  Globe,
  ShoppingCart,
  Wrench,
  Headphones,
  ShieldCheck,
} from "lucide-react";

interface Filial {
  id: string;
  nome: string;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Form state
  inviteName: string;
  setInviteName: (v: string) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteTelefone: string;
  setInviteTelefone: (v: string) => void;
  inviteRole: AppRole;
  setInviteRole: (v: AppRole) => void;
  inviteAcessoGlobal: boolean;
  setInviteAcessoGlobal: (v: boolean) => void;
  inviteFilialIds: string[];
  setInviteFilialIds: React.Dispatch<React.SetStateAction<string[]>>;
  inviteIsVendedor: boolean;
  setInviteIsVendedor: (v: boolean) => void;
  inviteRecebeComissao: boolean;
  setInviteRecebeComissao: (v: boolean) => void;
  inviteComissaoImp: string;
  setInviteComissaoImp: (v: string) => void;
  inviteComissaoMens: string;
  setInviteComissaoMens: (v: string) => void;
  inviteComissaoServ: string;
  setInviteComissaoServ: (v: string) => void;
  inviteIsTecnico: boolean;
  setInviteIsTecnico: (v: boolean) => void;
  inviteTipoTecnico: string;
  setInviteTipoTecnico: (v: string) => void;
  inviteMesaIds: string[];
  setInviteMesaIds: React.Dispatch<React.SetStateAction<string[]>>;
  inviteSetorId: string;
  setInviteSetorId: (v: string) => void;
  inviteDescontoLimiteImp: string;
  setInviteDescontoLimiteImp: (v: string) => void;
  inviteDescontoLimiteMens: string;
  setInviteDescontoLimiteMens: (v: string) => void;
  inviteGestorDesconto: boolean;
  setInviteGestorDesconto: (v: boolean) => void;
  invitePermitirCnpjDuplicado: boolean;
  setInvitePermitirCnpjDuplicado: (v: boolean) => void;
  inviting: boolean;
  handleInvite: (e: React.FormEvent) => void;
  // Data
  filiais: Filial[];
  mesasDisponiveis: MesaOption[];
  setoresDisponiveis: SetorOption[];
}

export function CreateUserDialog({
  open,
  onOpenChange,
  inviteName, setInviteName,
  inviteEmail, setInviteEmail,
  inviteTelefone, setInviteTelefone,
  inviteRole, setInviteRole,
  inviteAcessoGlobal, setInviteAcessoGlobal,
  inviteFilialIds, setInviteFilialIds,
  inviteIsVendedor, setInviteIsVendedor,
  inviteRecebeComissao, setInviteRecebeComissao,
  inviteComissaoImp, setInviteComissaoImp,
  inviteComissaoMens, setInviteComissaoMens,
  inviteComissaoServ, setInviteComissaoServ,
  inviteIsTecnico, setInviteIsTecnico,
  inviteTipoTecnico, setInviteTipoTecnico,
  inviteMesaIds, setInviteMesaIds,
  inviteDescontoLimiteImp, setInviteDescontoLimiteImp,
  inviteDescontoLimiteMens, setInviteDescontoLimiteMens,
  inviteGestorDesconto, setInviteGestorDesconto,
  invitePermitirCnpjDuplicado, setInvitePermitirCnpjDuplicado,
  inviting,
  handleInvite,
  filiais,
  mesasDisponiveis,
}: CreateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input
              placeholder="João da Silva"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="joao@softplus.com.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={inviteTelefone}
                onChange={(e) => setInviteTelefone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
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
                <Switch checked={inviteAcessoGlobal} onCheckedChange={(v) => {
                  setInviteAcessoGlobal(v);
                  if (v) setInviteFilialIds([]);
                }} />
              </div>
            </div>
            {!inviteAcessoGlobal && (
              <div className="space-y-2">
                {filiais.map((fil) => (
                  <div key={fil.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                    <span className="text-sm">{fil.nome}</span>
                    <Switch
                      checked={inviteFilialIds.includes(fil.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setInviteFilialIds((prev) => [...prev, fil.id]);
                        } else {
                          setInviteFilialIds((prev) => prev.filter((id) => id !== fil.id));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {inviteAcessoGlobal && (
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
              <Switch checked={inviteIsVendedor} onCheckedChange={setInviteIsVendedor} />
            </div>
            {inviteIsVendedor && (
              <>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissão</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Recebe comissão</Label>
                    <Switch checked={inviteRecebeComissao} onCheckedChange={setInviteRecebeComissao} />
                  </div>
                </div>
                {inviteRecebeComissao && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Implantação (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01" placeholder="5"
                        value={inviteComissaoImp}
                        onChange={(e) => setInviteComissaoImp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensalidade (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01" placeholder="5"
                        value={inviteComissaoMens}
                        onChange={(e) => setInviteComissaoMens(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Serviço (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.01" placeholder="5"
                        value={inviteComissaoServ}
                        onChange={(e) => setInviteComissaoServ(e.target.value)}
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
              <Switch checked={inviteIsTecnico} onCheckedChange={setInviteIsTecnico} />
            </div>
            {inviteIsTecnico && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                <Label className="text-xs font-medium">Tipo de Atendimento</Label>
                <div className="space-y-1.5">
                  {TIPO_TECNICO_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center justify-between rounded px-2 py-1">
                      <span className="text-xs">{opt.label}</span>
                      <Switch
                        checked={inviteTipoTecnico === opt.value}
                        onCheckedChange={(checked) => { if (checked) setInviteTipoTecnico(opt.value); }}
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
                    checked={inviteMesaIds.includes(m.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setInviteMesaIds((prev) => [...prev, m.id]);
                      else setInviteMesaIds((prev) => prev.filter((id) => id !== m.id));
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
                  type="number" min="0" max="100" step="0.01" placeholder="0"
                  value={inviteDescontoLimiteImp}
                  onChange={(e) => setInviteDescontoLimiteImp(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto máx. mensalidade (%)</Label>
                <Input
                  type="number" min="0" max="100" step="0.01" placeholder="0"
                  value={inviteDescontoLimiteMens}
                  onChange={(e) => setInviteDescontoLimiteMens(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Gestor de desconto
                </Label>
                <p className="text-xs text-muted-foreground">Recebe notificações e aprova descontos acima do limite</p>
              </div>
              <Switch checked={inviteGestorDesconto} onCheckedChange={setInviteGestorDesconto} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Permitir Cadastro CNPJ Duplicado
                </Label>
                <p className="text-xs text-muted-foreground">Permite cadastrar clientes com CNPJ já existente no módulo de Clientes</p>
              </div>
              <Switch checked={invitePermitirCnpjDuplicado} onCheckedChange={setInvitePermitirCnpjDuplicado} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
