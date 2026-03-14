// ─── Página: Configurar Faturamento — Layout 3 colunas ────────────────────

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Send, X, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

import { useConfigurarFaturamentoQueries } from "../useConfigurarFaturamentoQueries";
import { useConfigurarFaturamentoForm } from "../useConfigurarFaturamentoForm";
import { defaultConfigForm } from "../constants";
import { getBadgeTipoLabel, getBadgeTipoColor } from "../helpers";
import type { ConfigFaturamentoForm } from "../types";

import { EspelhoContrato } from "./EspelhoContrato";
import { ConfiguracaoCobranca } from "./ConfiguracaoCobranca";
import { PreviewFaturas } from "./PreviewFaturas";

export default function ConfigurarFaturamento() {
  const { contratoId } = useParams();
  const navigate = useNavigate();
  const { espelho, contratoFinanceiroBase, loading } = useConfigurarFaturamentoQueries(contratoId);
  const { saving, handleSave } = useConfigurarFaturamentoForm();
  const { roles, isAdmin } = useAuth();

  const [form, setForm] = useState<ConfigFaturamentoForm>(defaultConfigForm());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canEditValues, setCanEditValues] = useState(false);

  // Check permission to edit billing values
  useEffect(() => {
    if (isAdmin) { setCanEditValues(true); return; }
    if (!roles || roles.length === 0) { setCanEditValues(false); return; }

    async function checkPerm() {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao")
        .in("role", roles)
        .eq("permissao", "acao.editar_valores_faturamento")
        .eq("ativo", true)
        .limit(1);
      setCanEditValues((data || []).length > 0);
    }
    checkPerm();
  }, [roles, isAdmin]);

  // Pré-preencher form com dados do contrato
  useEffect(() => {
    if (!espelho) return;

    const tipoPedido = espelho.pedido?.tipo_pedido || "";
    const isSubRegistro = !!espelho.contrato_origem_id;
    const isUpgradeOrDowngrade = tipoPedido === "Upgrade" || tipoPedido === "Downgrade";

    const valorMens = espelho.pedido?.valor_mensalidade_final
      ?? espelho.plano?.valor_mensalidade_padrao ?? 0;
    const valorImpl = espelho.pedido?.valor_implantacao_final
      ?? espelho.plano?.valor_implantacao_padrao ?? 0;
    const parcImpl = espelho.pedido?.pagamento_implantacao_parcelas ?? 1;
    const formaPag = espelho.pedido?.pagamento_mensalidade_forma || "Boleto";

    // Módulos do pedido
    const modulos = (espelho.pedido?.modulos_adicionais || []).map((m: any) => {
      const valorUnit = m.valor_mensalidade ?? m.valor_mensalidade_modulo ?? 0;
      const qtd = m.quantidade ?? 1;
      return {
        id: crypto.randomUUID(),
        nome: m.nome,
        valor_unitario: valorUnit,
        quantidade: qtd,
        valor_mensal: valorUnit * qtd,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
      };
    });

    // Se é sub-registro e temos o base, herdar dia_vencimento e forma_pagamento
    const diaVenc = (isSubRegistro && contratoFinanceiroBase)
      ? contratoFinanceiroBase.dia_vencimento
      : 10;
    const formaPagBase = (isSubRegistro && contratoFinanceiroBase)
      ? contratoFinanceiroBase.forma_pagamento
      : (formaPag === "Boleto" || formaPag === "Pix" ? formaPag : "Boleto");

    setForm((f) => ({
      ...f,
      valor_mensalidade: valorMens,
      valor_implantacao: valorImpl,
      parcelas_implantacao: parcImpl > 0 ? parcImpl : 1,
      dia_vencimento: diaVenc,
      forma_pagamento: formaPagBase,
      modulos,
      email_cobranca: espelho.cliente.email || "",
      whatsapp_cobranca: espelho.cliente.telefone || "",
    }));
  }, [espelho, contratoFinanceiroBase]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!espelho) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-muted-foreground mb-4">Contrato não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/faturamento")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const tipoLabel = getBadgeTipoLabel(espelho.tipo, espelho.pedido?.tipo_pedido);
  const tipoColor = getBadgeTipoColor(tipoLabel);
  const isSubRegistro = !!espelho.contrato_origem_id;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-1 py-3 border-b border-border bg-background shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/faturamento")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              Configurar Faturamento — {espelho.cliente.nome_fantasia}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              Contrato {espelho.numero_exibicao} • Assinado em{" "}
              {format(parseISO(espelho.updated_at), "dd/MM/yyyy")}
              <Badge className={`text-xs ${tipoColor}`}>{tipoLabel}</Badge>
              {isSubRegistro && contratoFinanceiroBase && (
                <Badge variant="outline" className="text-xs">
                  Base: #{contratoFinanceiroBase.contrato_id.slice(0, 8)}… | Mens. atual: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contratoFinanceiroBase.valor_mensalidade)}
                </Badge>
              )}
            </p>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_40%_30%] gap-4 p-4 min-h-0">
            {/* Coluna Esquerda — Espelho */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <EspelhoContrato espelho={espelho} contratoFinanceiroBase={contratoFinanceiroBase} />
            </div>

            {/* Coluna Central — Configuração */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <ConfiguracaoCobranca
                form={form}
                setForm={setForm}
                espelho={espelho}
                canEditValues={canEditValues}
                contratoFinanceiroBase={contratoFinanceiroBase}
              />
            </div>

            {/* Coluna Direita — Preview */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <PreviewFaturas
                form={form}
                setForm={setForm}
                espelho={espelho}
                contratoFinanceiroBase={contratoFinanceiroBase}
              />
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border bg-background shrink-0">
          <Button variant="outline" className="gap-1.5" onClick={() => navigate("/faturamento")}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            className="gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubRegistro ? "Confirmar Alteração" : "Confirmar e Criar Faturamento"}
          </Button>
        </div>
      </div>

      {/* Confirmação */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSubRegistro ? "Confirmar Alteração no Faturamento" : "Confirmar Configuração de Faturamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSubRegistro ? (
                <>
                  O contrato financeiro base de <strong>{espelho.cliente.nome_fantasia}</strong> será atualizado
                  conforme a configuração definida. O próximo boleto refletirá as alterações.
                </>
              ) : (
                <>
                  Será criado o contrato financeiro base e a primeira fatura para{" "}
                  <strong>{espelho.cliente.nome_fantasia}</strong>.
                  Esta ação não pode ser desfeita facilmente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); handleSave(form, espelho, contratoFinanceiroBase); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
