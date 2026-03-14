import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, XCircle, Loader2, FlaskConical, Building2,
  Copy, Zap, CreditCard, QrCode, Webhook,
} from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  time: string;
  type: "request" | "response" | "error" | "info";
  content: string;
}

function timestamp() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

export default function TesteAsaas() {
  const { isAdmin } = useAuth();
  const { filiaisDoUsuario } = useUserFiliais();

  const [filialId, setFilialId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [boletoPaymentId, setBoletoPaymentId] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [ultimoPaymentId, setUltimoPaymentId] = useState<string | null>(null);
  // Loading states
  const [testingConn, setTestingConn] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingBoleto, setCreatingBoleto] = useState(false);
  const [creatingPix, setCreatingPix] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Results
  const [connResult, setConnResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [customerResult, setCustomerResult] = useState<any>(null);
  const [boletoResult, setBoletoResult] = useState<any>(null);
  const [pixResult, setPixResult] = useState<any>(null);
  const [webhookResult, setWebhookResult] = useState<any>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  function addLog(type: LogEntry["type"], content: string) {
    setLogs((prev) => [{ time: timestamp(), type, content }, ...prev]);
  }

  function clearLogs() {
    setLogs([]);
    setConnResult(null);
    setCustomerResult(null);
    setBoletoResult(null);
    setPixResult(null);
    setWebhookResult(null);
    setCustomerId(null);
    setBoletoPaymentId(null);
    setPixPaymentId(null);
    setUltimoPaymentId(null);

  // ── SEÇÃO 1: Teste de Conexão ──────────────────────────────────────────
  async function testConnection() {
    if (!filialId) { toast.error("Selecione uma filial"); return; }
    setTestingConn(true);
    setConnResult(null);
    addLog("request", `GET /customers?limit=1 (filial: ${filialId})`);

    try {
      const { data, error } = await supabase.functions.invoke("asaas", {
        body: { action: "test_connection", filialId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const ambiente = data?.ambiente || "desconhecido";
      const totalCustomers = data?.totalCount ?? "?";
      setConnResult({ ok: true, msg: `Conectado — Ambiente: ${ambiente} — ${totalCustomers} cliente(s)` });
      addLog("response", `✅ Conexão OK — Ambiente: ${ambiente}`);
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      setConnResult({ ok: false, msg });
      addLog("error", `❌ ${msg}`);
    } finally {
      setTestingConn(false);
    }
  }

  // ── SEÇÃO 2: Criar Cliente Teste ───────────────────────────────────────
  async function createTestCustomer() {
    if (!filialId) { toast.error("Selecione uma filial"); return; }
    setCreatingCustomer(true);
    setCustomerResult(null);
    addLog("request", `POST /customers — name: "Heitor Aires", cpfCnpj: "24971563792"`);

    try {
      const { data, error } = await supabase.functions.invoke("asaas", {
        body: {
          action: "create_customer",
          filialId,
          name: "Heitor Aires",
          cpfCnpj: "24971563792",
          phone: "4799376637",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCustomerId(data.id);
      setCustomerResult(data);
      addLog("response", `✅ Customer criado — ID: ${data.id}`);
      addLog("info", JSON.stringify(data, null, 2));
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      setCustomerResult({ error: msg });
      addLog("error", `❌ ${msg}`);
    } finally {
      setCreatingCustomer(false);
    }
  }

  // ── SEÇÃO 3: Teste Boleto ──────────────────────────────────────────────
  async function createTestBoleto() {
    if (!filialId) { toast.error("Selecione uma filial"); return; }
    if (!customerId) { toast.error("Crie um cliente teste primeiro"); return; }
    setCreatingBoleto(true);
    setBoletoResult(null);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    addLog("request", `POST /payments — customer: ${customerId}, billingType: BOLETO, value: 5.00, dueDate: ${dueDateStr}`);

    try {
      const { data, error } = await supabase.functions.invoke("asaas", {
        body: {
          action: "test_create_payment",
          filialId,
          customer: customerId,
          billingType: "BOLETO",
          value: 5.00,
          dueDate: dueDateStr,
          description: "Teste Boleto Softflow",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBoletoPaymentId(data.payment?.id || null);
      setUltimoPaymentId(data.payment?.id || null);
      setBoletoResult(data);
      addLog("response", `✅ Boleto criado — Payment ID: ${data.payment?.id}`);
      if (data.details?.asaas_barcode) {
        addLog("info", `Linha digitável: ${data.details.asaas_barcode}`);
      }
      addLog("info", JSON.stringify(data, null, 2));
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      setBoletoResult({ error: msg });
      addLog("error", `❌ ${msg}`);
    } finally {
      setCreatingBoleto(false);
    }
  }

  // ── SEÇÃO 4: Teste PIX ─────────────────────────────────────────────────
  async function createTestPix() {
    if (!filialId) { toast.error("Selecione uma filial"); return; }
    if (!customerId) { toast.error("Crie um cliente teste primeiro"); return; }
    setCreatingPix(true);
    setPixResult(null);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    addLog("request", `POST /payments — customer: ${customerId}, billingType: PIX, value: 5.00, dueDate: ${dueDateStr}`);

    try {
      const { data, error } = await supabase.functions.invoke("asaas", {
        body: {
          action: "test_create_payment",
          filialId,
          customer: customerId,
          billingType: "PIX",
          value: 5.00,
          dueDate: dueDateStr,
          description: "Teste PIX Softflow",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixPaymentId(data.payment?.id || null);
      setUltimoPaymentId(data.payment?.id || null);
      setPixResult(data);
      addLog("response", `✅ PIX criado — Payment ID: ${data.payment?.id}`);
      if (data.details?.asaas_pix_qrcode) {
        addLog("info", `PIX Copia e Cola: ${data.details.asaas_pix_qrcode.substring(0, 60)}...`);
      }
      addLog("info", JSON.stringify(data, null, 2));
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      setPixResult({ error: msg });
      addLog("error", `❌ ${msg}`);
    } finally {
      setCreatingPix(false);
    }
  }

  // ── SEÇÃO 5: Simular Pagamento ─────────────────────────────────────────
  async function simulatePayment() {
    const paymentId = ultimoPaymentId || pixPaymentId || boletoPaymentId;
    if (!filialId) { toast.error("Selecione uma filial"); return; }
    if (!paymentId) { toast.error("Gere um boleto ou PIX primeiro"); return; }
    setSimulatingPayment(true);
    setWebhookResult(null);
    addLog("request", `POST /payments/${paymentId}/receiveInCash (simular pagamento sandbox)`);

    try {
      const { data, error } = await supabase.functions.invoke("asaas", {
        body: {
          action: "test_receive_in_cash",
          filialId,
          paymentId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      addLog("response", `✅ Pagamento simulado — status: ${data.payment?.status}`);
      addLog("info", `🔎 Aguardando webhook do payment ${paymentId} (até 30s)...`);

      let recentEvents: any[] = [];
      let webhookFound = false;

      for (let tentativa = 1; tentativa <= 10; tentativa++) {
        await new Promise((r) => setTimeout(r, 3000));

        const { data: webhookData, error: webhookError } = await supabase.functions.invoke("asaas", {
          body: {
            action: "test_check_webhook",
            filialId,
            paymentId,
          },
        });

        if (webhookError) throw webhookError;
        if (webhookData?.error) throw new Error(webhookData.error);

        recentEvents = webhookData?.events || [];
        webhookFound = webhookData?.webhookReceived === true;

        if (webhookFound) {
          addLog("info", `✅ Webhook encontrado na tentativa ${tentativa}/10`);
          break;
        }

        addLog("info", `⏳ Tentativa ${tentativa}/10: webhook ainda não chegou`);
      }

      setWebhookResult({
        paymentStatus: data.payment?.status,
        webhookReceived: webhookFound,
        recentEvents: recentEvents.slice(0, 3),
      });

      if (webhookFound) {
        addLog("response", "✅ Webhook recebido e processado!");
      } else {
        addLog("info", "⚠️ Webhook não encontrado após 30s. Verifique se o webhook do Asaas aponta para /functions/v1/asaas-webhook.");
      }

      addLog("info", JSON.stringify(data, null, 2));
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      setWebhookResult({ error: msg });
      addLog("error", `❌ ${msg}`);
    } finally {
      setSimulatingPayment(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Teste Asaas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Teste o fluxo completo de faturamento antes de usar em produção
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filialId} onValueChange={setFilialId}>
              <SelectTrigger className="h-9 w-56">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Selecione a filial" />
              </SelectTrigger>
              <SelectContent>
                {filiaisDoUsuario.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearLogs}>Limpar</Button>
          </div>
        </div>

        {!filialId && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
            ⚠️ Selecione uma filial acima para iniciar os testes. A filial precisa ter o Asaas configurado em Integrações.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Test Sections */}
          <div className="space-y-4">
            {/* SEÇÃO 1 — Conexão */}
            <TestSection
              title="1. Teste de Conexão"
              icon={<Zap className="h-4 w-4" />}
              description="Verifica se a API key do Asaas está válida"
            >
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={testConnection}
                disabled={testingConn || !filialId}
              >
                {testingConn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Testar Conexão
              </Button>
              {connResult && (
                <ResultBadge ok={connResult.ok} msg={connResult.msg} />
              )}
            </TestSection>

            {/* SEÇÃO 2 — Cliente */}
            <TestSection
              title="2. Criar Cliente Teste"
              icon={<Building2 className="h-4 w-4" />}
              description="Cria um cliente de teste no Asaas (sandbox)"
            >
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={createTestCustomer}
                disabled={creatingCustomer || !filialId}
              >
                {creatingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Criar Cliente Teste
              </Button>
              {customerResult && !customerResult.error && (
                <div className="space-y-1">
                  <ResultBadge ok msg={`Customer ID: ${customerResult.id}`} />
                  <button onClick={() => copyText(customerResult.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copiar ID
                  </button>
                </div>
              )}
              {customerResult?.error && <ResultBadge ok={false} msg={customerResult.error} />}
            </TestSection>

            {/* SEÇÃO 3 — Boleto */}
            <TestSection
              title="3. Teste de Boleto"
              icon={<CreditCard className="h-4 w-4" />}
              description="Gera boleto de R$ 5,00 e busca linha digitável"
            >
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={createTestBoleto}
                disabled={creatingBoleto || !filialId || !customerId}
              >
                {creatingBoleto ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Gerar Boleto Teste (R$ 5,00)
              </Button>
              {!customerId && <p className="text-xs text-muted-foreground">⬆️ Crie o cliente teste primeiro</p>}
              {boletoResult && !boletoResult.error && (
                <div className="space-y-2">
                  <ResultBadge ok msg={`Payment ID: ${boletoResult.payment?.id}`} />
                  {boletoResult.payment?.invoiceUrl && (
                    <a href={boletoResult.payment.invoiceUrl} target="_blank" rel="noopener" className="text-xs text-primary hover:underline block">
                      🔗 Abrir fatura no Asaas
                    </a>
                  )}
                  {boletoResult.payment?.bankSlipUrl && (
                    <a href={boletoResult.payment.bankSlipUrl} target="_blank" rel="noopener" className="text-xs text-primary hover:underline block">
                      🔗 Visualizar Boleto
                    </a>
                  )}
                  {boletoResult.details?.asaas_barcode && (
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Linha digitável:</p>
                      <p className="text-xs font-mono break-all">{boletoResult.details.asaas_barcode}</p>
                      <button onClick={() => copyText(boletoResult.details.asaas_barcode)} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <Copy className="h-3 w-3" /> Copiar
                      </button>
                    </div>
                  )}
                </div>
              )}
              {boletoResult?.error && <ResultBadge ok={false} msg={boletoResult.error} />}
            </TestSection>

            {/* SEÇÃO 4 — PIX */}
            <TestSection
              title="4. Teste de PIX"
              icon={<QrCode className="h-4 w-4" />}
              description="Gera cobrança PIX de R$ 5,00 e busca QR Code"
            >
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={createTestPix}
                disabled={creatingPix || !filialId || !customerId}
              >
                {creatingPix ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Gerar PIX Teste (R$ 5,00)
              </Button>
              {!customerId && <p className="text-xs text-muted-foreground">⬆️ Crie o cliente teste primeiro</p>}
              {pixResult && !pixResult.error && (
                <div className="space-y-2">
                  <ResultBadge ok msg={`Payment ID: ${pixResult.payment?.id}`} />
                  {pixResult.details?.asaas_pix_qrcode && (
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">PIX Copia e Cola:</p>
                      <p className="text-xs font-mono break-all max-h-20 overflow-y-auto">{pixResult.details.asaas_pix_qrcode}</p>
                      <button onClick={() => copyText(pixResult.details.asaas_pix_qrcode)} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <Copy className="h-3 w-3" /> Copiar
                      </button>
                    </div>
                  )}
                  {pixResult.details?.asaas_pix_image && (
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${pixResult.details.asaas_pix_image}`}
                        alt="QR Code PIX"
                        className="w-40 h-40 rounded border border-border"
                      />
                    </div>
                  )}
                </div>
              )}
              {pixResult?.error && <ResultBadge ok={false} msg={pixResult.error} />}
            </TestSection>

            {/* SEÇÃO 5 — Webhook */}
            <TestSection
              title="5. Simular Pagamento"
              icon={<Webhook className="h-4 w-4" />}
              description="Simula recebimento em dinheiro (sandbox) e verifica webhook"
            >
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={simulatePayment}
                disabled={simulatingPayment || !filialId || !ultimoPaymentId}
              >
                {simulatingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
                Simular Pagamento ({ultimoPaymentId ? "Último Gerado" : "—"})
              </Button>
              {!ultimoPaymentId && (
                <p className="text-xs text-muted-foreground">⬆️ Gere um boleto ou PIX primeiro</p>
              )}
              {webhookResult && !webhookResult.error && (
                <div className="space-y-2">
                  <ResultBadge ok msg={`Status: ${webhookResult.paymentStatus}`} />
                  {webhookResult.webhookReceived ? (
                    <ResultBadge ok msg="Webhook recebido e processado ✅" />
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ Webhook não encontrado ainda. Pode levar alguns segundos no sandbox.
                    </div>
                  )}
                  {webhookResult.recentEvents?.length > 0 && (
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Eventos recentes:</p>
                      {webhookResult.recentEvents.map((e: any, i: number) => (
                        <p key={i} className="text-xs font-mono truncate">
                          {e.event_type} — {e.event_id?.substring(0, 20)}...
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {webhookResult?.error && <ResultBadge ok={false} msg={webhookResult.error} />}
            </TestSection>
          </div>

          {/* Right: Debug Logs */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Debug Logs</h3>
            <div className="bg-zinc-950 dark:bg-zinc-900 rounded-lg border border-border p-3 h-[calc(100vh-200px)] overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 && (
                <p className="text-zinc-500">Nenhum log ainda. Execute um teste para ver os resultados aqui.</p>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-zinc-500 shrink-0">{log.time}</span>
                  <span className={
                    log.type === "request" ? "text-blue-400" :
                    log.type === "response" ? "text-emerald-400" :
                    log.type === "error" ? "text-red-400" :
                    "text-zinc-400"
                  }>
                    {log.type === "request" && "→ "}
                    {log.type === "response" && "← "}
                    {log.type === "error" && "✗ "}
                    {log.type === "info" && "ℹ "}
                    <span className="whitespace-pre-wrap break-all">{log.content}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function TestSection({ title, icon, description, children }: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {icon} {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ResultBadge({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-start gap-2 rounded p-2 text-xs ${
      ok
        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
        : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
    }`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
      <span className="break-all">{msg}</span>
    </div>
  );
}
