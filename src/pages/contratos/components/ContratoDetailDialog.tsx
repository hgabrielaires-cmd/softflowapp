import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { UserAvatar } from "@/components/UserAvatar";
import {
  FileCheck, Loader2, FileOutput, Download, CheckCircle2, Send,
  RefreshCw, ClipboardCopy, ExternalLink, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Contrato, ZapSignRecord, ModuloAdicionadoItem } from "../types";
import { fmtBRL, gerarTermoAceite, type GerarTermoAceiteContext } from "../helpers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Contrato;
  contratos: Contrato[];
  zapsignRecords: Record<string, ZapSignRecord>;
  canManage: boolean;
  podeRegerarContrato: boolean;
  gerando: boolean;
  enviandoWhatsapp: boolean;
  contatosCliente: { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[];
  buildTermoCtx: () => GerarTermoAceiteContext;
  // Badge helpers
  getStatusBadge: (status: string) => React.ReactNode;
  getTipoBadge: (tipo: string) => React.ReactNode;
  getStatusGeracaoBadge: (statusGeracao: string | null, contratoStatus?: string) => React.ReactNode;
  // Actions
  onSetSelected: (contrato: Contrato) => void;
  onGerarContrato: (contrato: Contrato) => void;
  onBaixarContrato: (contrato: Contrato) => void;
  onEnviarWhatsapp: (mensagem: string, contatos: Props["contatosCliente"], contrato: Contrato | null) => void;
  onCancelar: () => void;
  cancelamentoInfo?: { nome: string; avatar_url: string | null; cancelado_em: string; motivo: string | null } | null;
}

export function ContratoDetailDialog({
  open,
  onOpenChange,
  selected,
  contratos,
  zapsignRecords,
  canManage,
  podeRegerarContrato,
  gerando,
  enviandoWhatsapp,
  contatosCliente,
  buildTermoCtx,
  getStatusBadge,
  getTipoBadge,
  getStatusGeracaoBadge,
  onSetSelected,
  onGerarContrato,
  onBaixarContrato,
  onEnviarWhatsapp,
  onCancelar,
  cancelamentoInfo,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="contrato-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            Contrato {selected.numero_exibicao || `#${selected.numero_registro}`}
          </DialogTitle>
          <DialogDescription id="contrato-desc">
            Detalhes completos do contrato selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Número</p>
              <p className="font-mono font-semibold">
                {selected.numero_exibicao || `#${selected.numero_registro}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <div className="flex items-center gap-2">
                {getStatusBadge(selected.status)}
              </div>
            </div>
            {/* Info de cancelamento */}
            {selected.status === "Encerrado" && cancelamentoInfo && (
              <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={cancelamentoInfo.avatar_url}
                    fullName={cancelamentoInfo.nome}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      Cancelado por {cancelamentoInfo.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cancelamentoInfo.cancelado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {cancelamentoInfo.motivo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">Motivo:</span> {cancelamentoInfo.motivo}
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-semibold">{selected.clientes?.nome_fantasia || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Plano</p>
              <p className="font-semibold">{selected.planos?.nome || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tipo</p>
              {getTipoBadge(selected.tipo)}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Data de criação</p>
              <p>
                {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            {selected.pedidos?.numero_exibicao && (
              <div>
                <p className="text-muted-foreground text-xs">Pedido de Origem</p>
                <p className="font-mono font-semibold">{selected.pedidos.numero_exibicao}</p>
              </div>
            )}
          </div>

          {/* Contratos vinculados */}
          <VinculadosSection
            contratos={contratos}
            selected={selected}
            getTipoBadge={getTipoBadge}
            getStatusBadge={getStatusBadge}
            onSetSelected={onSetSelected}
          />

          {/* Dados do pedido vinculado */}
          {selected.pedidos && (
            <PedidoSection selected={selected} />
          )}

          {/* Mensagem — Termo de Aceite / OA */}
          {canManage && selected.pedidos && (
            <TermoAceiteSection
              selected={selected}
              zapsignRecords={zapsignRecords}
              enviandoWhatsapp={enviandoWhatsapp}
              contatosCliente={contatosCliente}
              buildTermoCtx={buildTermoCtx}
              onEnviarWhatsapp={onEnviarWhatsapp}
            />
          )}

          {/* Ações de Contrato */}
          <AcoesContratoSection
            selected={selected}
            zapsignRecords={zapsignRecords}
            podeRegerarContrato={podeRegerarContrato}
            gerando={gerando}
            getStatusGeracaoBadge={getStatusGeracaoBadge}
            onGerarContrato={onGerarContrato}
            onBaixarContrato={onBaixarContrato}
          />

          {/* Comentários Internos do Pedido */}
          {selected.pedido_id && (
            <div className="border-t border-border pt-4">
              <PedidoComentarios pedidoId={selected.pedido_id} />
            </div>
          )}

          {/* Cancelar */}
          {canManage && selected.status === "Ativo" && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onCancelar}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Contrato
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components (internal) ────────────────────────────────────────────

function VinculadosSection({
  contratos, selected, getTipoBadge, getStatusBadge, onSetSelected,
}: {
  contratos: Contrato[];
  selected: Contrato;
  getTipoBadge: (tipo: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  onSetSelected: (c: Contrato) => void;
}) {
  const vinculados = contratos.filter(c => c.contrato_origem_id === selected.id);
  if (vinculados.length === 0) return null;
  return (
    <div className="border-t border-border pt-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contratos Vinculados</p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {vinculados.map(v => (
          <button
            key={v.id}
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onSetSelected(v)}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{v.numero_exibicao}</span>
              {getTipoBadge(v.tipo)}
              {v.pedidos?.tipo_pedido && (
                <span className="text-muted-foreground">
                  {v.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade de Plano" : v.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : v.pedidos.tipo_pedido === "OA" ? "📋 Ordem de Atendimento" : v.pedidos.tipo_pedido}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(v.status)}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PedidoSection({ selected }: { selected: Contrato }) {
  const p = selected.pedidos!;
  const adicionais = (p.modulos_adicionais || []) as ModuloAdicionadoItem[];
  const hasDescImp = p.desconto_implantacao_valor > 0;
  const hasDescMens = p.desconto_mensalidade_valor > 0;

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores do Pedido</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Implantação</p>
          {hasDescImp && (
            <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_implantacao_original)}</p>
          )}
          <p className="font-semibold text-foreground">{fmtBRL(p.valor_implantacao_final)}</p>
          {hasDescImp && (
            <p className="text-xs text-emerald-600">
              Desconto: {p.desconto_implantacao_tipo === "%" ? `${p.desconto_implantacao_valor}%` : fmtBRL(p.desconto_implantacao_valor)}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Mensalidade</p>
          {hasDescMens && (
            <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_mensalidade_original)}</p>
          )}
          <p className="font-semibold text-foreground">{fmtBRL(p.valor_mensalidade_final)}</p>
          {hasDescMens && (
            <p className="text-xs text-emerald-600">
              Desconto: {p.desconto_mensalidade_tipo === "%" ? `${p.desconto_mensalidade_valor}%` : fmtBRL(p.desconto_mensalidade_valor)}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Valor Total</span>
        <span className="font-bold text-foreground">{fmtBRL(p.valor_total)}</span>
      </div>

      {adicionais.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos Adicionais</p>
          <div className="rounded-lg border border-border divide-y divide-border">
            {adicionais.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-foreground">{m.nome} <span className="text-muted-foreground">× {m.quantidade}</span></span>
                <span className="font-medium">{fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.observacoes && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
          <p className="text-xs text-foreground bg-muted/40 rounded-lg p-3">{p.observacoes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {selected.status === "Encerrado" ? (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
            Cancelado
          </Badge>
        ) : (
          <>
            {p.financeiro_status === "Aprovado" && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                ✓ Aprovado Financeiro
              </Badge>
            )}
            {p.contrato_liberado ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                Contrato Liberado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Contrato Pendente
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TermoAceiteSection({
  selected, zapsignRecords, enviandoWhatsapp, contatosCliente, buildTermoCtx, onEnviarWhatsapp,
}: {
  selected: Contrato;
  zapsignRecords: Record<string, ZapSignRecord>;
  enviandoWhatsapp: boolean;
  contatosCliente: Props["contatosCliente"];
  buildTermoCtx: () => GerarTermoAceiteContext;
  onEnviarWhatsapp: Props["onEnviarWhatsapp"];
}) {
  const zRec = zapsignRecords[selected.id];
  const linkAssinatura = zRec?.signers?.[1]?.sign_url || zRec?.signers?.[0]?.sign_url || undefined;
  const mensagem = gerarTermoAceite(selected, buildTermoCtx(), linkAssinatura);
  const isOA = selected.tipo === "OA";
  const msgLabel = isOA ? "Mensagem — Ordem de Atendimento" : "Mensagem — Termo de Aceite";

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{msgLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => {
            navigator.clipboard.writeText(mensagem);
            toast.success("Mensagem copiada!");
          }}
        >
          📋 Copiar
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3 max-h-64 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{mensagem}</pre>
      </div>
      {!linkAssinatura && (
        <p className="text-xs text-muted-foreground">
          💡 Envie o contrato para assinatura eletrônica para preencher automaticamente o <code className="bg-muted px-1 rounded">{"{link_assinatura}"}</code>. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
        </p>
      )}
      {linkAssinatura && (
        <p className="text-xs text-muted-foreground">
          ✅ Link de assinatura preenchido automaticamente. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2 mt-2"
        disabled={enviandoWhatsapp}
        onClick={() => onEnviarWhatsapp(mensagem, contatosCliente, selected)}
      >
        {enviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {enviandoWhatsapp ? "Enviando..." : "Enviar WhatsApp"}
      </Button>
    </div>
  );
}

function AcoesContratoSection({
  selected, zapsignRecords, podeRegerarContrato, gerando, getStatusGeracaoBadge, onGerarContrato, onBaixarContrato,
}: {
  selected: Contrato;
  zapsignRecords: Record<string, ZapSignRecord>;
  podeRegerarContrato: boolean;
  gerando: boolean;
  getStatusGeracaoBadge: (sg: string | null, cs?: string) => React.ReactNode;
  onGerarContrato: (c: Contrato) => void;
  onBaixarContrato: (c: Contrato) => void;
}) {
  const zRec = zapsignRecords[selected.id];

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selected.tipo === "OA" ? "Documento da OA" : "Documento do Contrato"}</p>
        {getStatusGeracaoBadge(selected.status_geracao)}
      </div>

      {zRec ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              📄 Documento enviado para assinatura. Visualize pelo link abaixo:
            </p>
            {zRec.sign_url && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => window.open(zRec.sign_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Visualizar Documento
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(zRec.sign_url!);
                    toast.success("Link copiado!");
                  }}
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {podeRegerarContrato ? (
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => onGerarContrato(selected)}
                disabled={gerando}
              >
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {selected.tipo === "OA" ? "Regerar OA" : "Regerar Contrato"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              🔒 Geração e reenvio bloqueados — documento já registrado na ZapSign.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onGerarContrato(selected)}
              disabled={gerando}
            >
              {gerando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileOutput className="h-4 w-4 mr-2" />
              )}
              {selected.tipo === "OA"
                ? (selected.status_geracao === "Gerado" ? "Regerar OA" : "Gerar OA")
                : (selected.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato")}
            </Button>

            {selected.status_geracao === "Gerado" && selected.pdf_url && (
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onBaixarContrato(selected)}
                disabled={gerando}
              >
                {gerando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {selected.tipo === "OA" ? "Baixar OA" : "Baixar Contrato"}
              </Button>
            )}
          </div>

          {selected.status_geracao === "Gerado" && (
            <p className="text-xs text-muted-foreground">
              💡 {selected.tipo === "OA" ? "OA gerada" : "Contrato gerado"} em PDF e pronto para download.
            </p>
          )}
        </>
      )}
    </div>
  );
}
