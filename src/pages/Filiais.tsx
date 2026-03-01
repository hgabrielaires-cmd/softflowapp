import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Building2, Loader2, Upload, X, Image, Search, Settings, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Filiais() {
  const { isAdmin } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [nome, setNome] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [ativa, setAtiva] = useState(true);
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [ieIsento, setIeIsento] = useState(false);
  const [endereco, setEndereco] = useState({
    logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "",
  });
  const [saving, setSaving] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cnpjError, setCnpjError] = useState("");
  const [cepError, setCepError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assinaturaFile, setAssinaturaFile] = useState<File | null>(null);
  const [assinaturaPreview, setAssinaturaPreview] = useState<string | null>(null);
  const [removeAssinatura, setRemoveAssinatura] = useState(false);
  const assinaturaInputRef = useRef<HTMLInputElement>(null);
  const [etapaInicialId, setEtapaInicialId] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<{ id: string; nome: string; ordem: number }[]>([]);
  const [activeTab, setActiveTab] = useState("geral");

  // CRM - Segmentos
  const [segmentos, setSegmentos] = useState<{ id: string; nome: string; ativo: boolean; created_at: string }[]>([]);
  const [loadingSegmentos, setLoadingSegmentos] = useState(false);
  const [novoSegmento, setNovoSegmento] = useState("");
  const [savingSegmento, setSavingSegmento] = useState(false);

  // Parâmetros da filial
  const [parcelasMaximasCartao, setParcelasMaximasCartao] = useState(12);
  const [pixDescontoPercentual, setPixDescontoPercentual] = useState(0);
  const [regrasPadraoImplantacao, setRegrasPadraoImplantacao] = useState("");
  const [regrasPadraoMensalidade, setRegrasPadraoMensalidade] = useState("");
  const [congelarAcao, setCongelarAcao] = useState("manter");
  const [congelarEtapaId, setCongelarEtapaId] = useState<string | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    setLoading(true);
    const { data, error } = await supabase.from("filiais").select("*").order("nome");
    if (error) toast.error("Erro ao carregar filiais");
    else setFiliais(data as Filial[]);
    setLoading(false);
  }

  async function loadEtapas() {
    const { data } = await supabase.from("painel_etapas").select("id, nome, ordem").eq("ativo", true).order("ordem");
    if (data) setEtapas(data);
  }

  async function loadSegmentos(filialId: string) {
    setLoadingSegmentos(true);
    const { data } = await supabase.from("segmentos").select("*").eq("filial_id", filialId).order("nome");
    if (data) setSegmentos(data as any);
    setLoadingSegmentos(false);
  }

  async function handleAddSegmento(filialId: string) {
    if (!novoSegmento.trim()) return;
    setSavingSegmento(true);
    const { error } = await supabase.from("segmentos").insert({ nome: novoSegmento.trim(), filial_id: filialId });
    if (error) toast.error("Erro ao adicionar segmento");
    else { toast.success("Segmento adicionado"); setNovoSegmento(""); loadSegmentos(filialId); }
    setSavingSegmento(false);
  }

  async function toggleSegmento(seg: { id: string; ativo: boolean }, filialId: string) {
    await supabase.from("segmentos").update({ ativo: !seg.ativo }).eq("id", seg.id);
    loadSegmentos(filialId);
  }

  async function deleteSegmento(segId: string, filialId: string) {
    const { error } = await supabase.from("segmentos").delete().eq("id", segId);
    if (error) toast.error("Erro ao remover segmento");
    else { toast.success("Segmento removido"); loadSegmentos(filialId); }
  }

  useEffect(() => { loadFiliais(); loadEtapas(); }, []);

  function resetForm() {
    setNome(""); setRazaoSocial(""); setResponsavel(""); setAtiva(true); setCnpj(""); setInscricaoEstadual(""); setIeIsento(false);
    setEndereco({ logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "" });
    setCnpjError(""); setCepError("");
    setLogoFile(null); setLogoPreview(null); setRemoveLogo(false);
    setAssinaturaFile(null); setAssinaturaPreview(null); setRemoveAssinatura(false);
    setEtapaInicialId(null);
    setActiveTab("geral");
    setSegmentos([]);
    setNovoSegmento("");
    setParcelasMaximasCartao(12);
    setPixDescontoPercentual(0);
    setRegrasPadraoImplantacao("");
    setRegrasPadraoMensalidade("");
    setCongelarAcao("manter");
    setCongelarEtapaId(null);
  }

  function openCreate() {
    setEditing(null); resetForm(); setOpenDialog(true);
  }

  async function loadParametros(filialId: string) {
    const { data } = await supabase.from("filial_parametros").select("*").eq("filial_id", filialId).maybeSingle();
    if (data) {
      setParcelasMaximasCartao(data.parcelas_maximas_cartao ?? 12);
      setPixDescontoPercentual(data.pix_desconto_percentual ?? 0);
      setRegrasPadraoImplantacao(data.regras_padrao_implantacao ?? "");
      setRegrasPadraoMensalidade(data.regras_padrao_mensalidade ?? "");
      setCongelarAcao((data as any).congelar_acao ?? "manter");
      setCongelarEtapaId((data as any).congelar_etapa_id ?? null);
    }
  }

  function openEdit(filial: Filial) {
    setEditing(filial);
    setNome(filial.nome);
    setRazaoSocial(filial.razao_social || "");
    setResponsavel(filial.responsavel || "");
    setAtiva(filial.ativa);
    setCnpj(filial.cnpj || "");
    const isIsento = filial.inscricao_estadual === "ISENTO";
    setIeIsento(isIsento);
    setInscricaoEstadual(isIsento ? "" : (filial.inscricao_estadual || ""));
    setEndereco({
      logradouro: filial.logradouro || "", numero: filial.numero || "", complemento: filial.complemento || "",
      bairro: filial.bairro || "", cidade: filial.cidade || "", uf: filial.uf || "", cep: filial.cep || "",
      telefone: filial.telefone || "", email: filial.email || "",
    });
    setCnpjError(""); setCepError("");
    setLogoFile(null); setLogoPreview(filial.logo_url || null); setRemoveLogo(false);
    setAssinaturaFile(null); setAssinaturaPreview((filial as any).assinatura_url || null); setRemoveAssinatura(false);
    setEtapaInicialId(filial.etapa_inicial_id || null);
    setActiveTab("geral");
    // Reset params then load
    setParcelasMaximasCartao(12);
    setPixDescontoPercentual(0);
    setRegrasPadraoImplantacao("");
    setRegrasPadraoMensalidade("");
    setCongelarAcao("manter");
    setCongelarEtapaId(null);
    loadParametros(filial.id);
    loadSegmentos(filial.id);
    setOpenDialog(true);
  }

  async function handleCnpjBlur() {
    const raw = cnpj.replace(/\D/g, "");
    if (raw.length !== 14) return;
    setCnpjError(""); setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
      if (!res.ok) { setCnpjError("CNPJ não encontrado"); return; }
      const data = await res.json();
      const tel = data.ddd_telefone_1 ? `(${data.ddd_telefone_1})`.trim() : "";
      const logr = data.logradouro ? `${data.tipo_logradouro || ""} ${data.logradouro}`.trim() : "";
      setNome(prev => prev || data.nome_fantasia || data.razao_social || "");
      setRazaoSocial(prev => prev || data.razao_social || "");
      setEndereco(p => ({
        ...p,
        logradouro: p.logradouro || logr,
        bairro: p.bairro || data.bairro || "",
        cidade: p.cidade || data.municipio || "",
        uf: p.uf || data.uf || "",
        cep: p.cep || (data.cep ? data.cep.replace(/\D/g, "") : ""),
        telefone: p.telefone || tel,
        email: p.email || data.email || "",
      }));
    } catch { setCnpjError("Erro ao consultar CNPJ"); }
    finally { setLoadingCnpj(false); }
  }

  async function handleCepBlur() {
    const raw = endereco.cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setCepError(""); setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); return; }
      setEndereco(p => ({
        ...p,
        logradouro: p.logradouro || data.logradouro || "",
        bairro: p.bairro || data.bairro || "",
        cidade: p.cidade || data.localidade || "",
        uf: p.uf || data.uf || "",
      }));
    } catch { setCepError("Erro ao consultar CEP"); }
    finally { setLoadingCep(false); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }
    setLogoFile(file); setRemoveLogo(false);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadLogo(filialId: string): Promise<string | null> {
    if (!logoFile) return null;
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `${filialId}/logo.${ext}`;
    const { error } = await supabase.storage.from("filiais-logos").upload(path, logoFile, { upsert: true });
    if (error) throw new Error("Erro ao enviar logo: " + error.message);
    const { data: urlData } = supabase.storage.from("filiais-logos").getPublicUrl(path);
    return urlData.publicUrl;
  }

  function handleAssinaturaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }
    setAssinaturaFile(file); setRemoveAssinatura(false);
    const reader = new FileReader();
    reader.onload = () => setAssinaturaPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadAssinatura(filialId: string): Promise<string | null> {
    if (!assinaturaFile) return null;
    const ext = assinaturaFile.name.split(".").pop() || "png";
    const path = `${filialId}/assinatura.${ext}`;
    const { error } = await supabase.storage.from("filiais-logos").upload(path, assinaturaFile, { upsert: true });
    if (error) throw new Error("Erro ao enviar assinatura: " + error.message);
    const { data: urlData } = supabase.storage.from("filiais-logos").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function saveParametros(filialId: string) {
    const paramData = {
      filial_id: filialId,
      parcelas_maximas_cartao: parcelasMaximasCartao,
      pix_desconto_percentual: pixDescontoPercentual,
      regras_padrao_implantacao: regrasPadraoImplantacao.trim() || null,
      regras_padrao_mensalidade: regrasPadraoMensalidade.trim() || null,
      congelar_acao: congelarAcao,
      congelar_etapa_id: congelarAcao === "mover" ? congelarEtapaId : null,
    };
    // Check if exists
    const { data: existing } = await supabase.from("filial_parametros").select("id").eq("filial_id", filialId).maybeSingle();
    if (existing) {
      await supabase.from("filial_parametros").update(paramData).eq("filial_id", filialId);
    } else {
      await supabase.from("filial_parametros").insert(paramData);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const ie = ieIsento ? "ISENTO" : (inscricaoEstadual.trim() || null);
    try {
      if (editing) {
        let logo_url = editing.logo_url;
        if (logoFile) logo_url = await uploadLogo(editing.id);
        else if (removeLogo) logo_url = null;
        let assinatura_url = (editing as any).assinatura_url;
        if (assinaturaFile) assinatura_url = await uploadAssinatura(editing.id);
        else if (removeAssinatura) assinatura_url = null;
        const { error } = await supabase.from("filiais")
          .update({ nome: nome.trim(), razao_social: razaoSocial.trim() || null, responsavel: responsavel.trim() || null, ativa, logo_url, assinatura_url, cnpj: cnpj.trim() || null, inscricao_estadual: ie, etapa_inicial_id: etapaInicialId, ...endereco })
          .eq("id", editing.id);
        if (error) throw error;
        await saveParametros(editing.id);
        toast.success("Filial atualizada com sucesso");
      } else {
        const { data: inserted, error } = await supabase.from("filiais")
          .insert({ nome: nome.trim(), razao_social: razaoSocial.trim() || null, responsavel: responsavel.trim() || null, ativa, cnpj: cnpj.trim() || null, inscricao_estadual: ie, etapa_inicial_id: etapaInicialId, ...endereco })
          .select("id").single();
        if (error) throw error;
        if (inserted) {
          const updates: any = {};
          if (logoFile) updates.logo_url = await uploadLogo(inserted.id);
          if (assinaturaFile) updates.assinatura_url = await uploadAssinatura(inserted.id);
          if (Object.keys(updates).length > 0) await supabase.from("filiais").update(updates).eq("id", inserted.id);
        }
        if (inserted) await saveParametros(inserted.id);
        toast.success("Filial criada com sucesso");
      }
      setOpenDialog(false); loadFiliais();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar filial");
    }
    setSaving(false);
  }

  async function toggleAtiva(filial: Filial) {
    const { error } = await supabase.from("filiais").update({ ativa: !filial.ativa }).eq("id", filial.id);
    if (error) toast.error("Erro ao atualizar filial");
    else { toast.success(filial.ativa ? "Filial desativada" : "Filial ativada"); loadFiliais(); }
  }

  const isQuerying = loadingCnpj || loadingCep;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Filiais</h1>
            <p className="text-sm text-muted-foreground">Gerencie as unidades da Softflow</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova filial
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filiais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhuma filial cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                filiais.map((filial) => (
                  <TableRow key={filial.id}>
                    <TableCell>
                      {filial.logo_url ? (
                        <img src={filial.logo_url} alt={`Logo ${filial.nome}`} className="h-8 w-8 rounded object-contain bg-muted" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{filial.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{filial.cnpj || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={filial.ativa} onCheckedChange={() => toggleAtiva(filial)} />
                        <span className={`text-xs font-medium ${filial.ativa ? "text-primary" : "text-muted-foreground"}`}>
                          {filial.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(filial.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(filial)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {filiais.length} filial(is) cadastrada(s)
            </div>
          )}
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar filial" : "Nova filial"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="parametros" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Parâmetros
                </TabsTrigger>
                <TabsTrigger value="crm" className="gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  CRM
                </TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* CNPJ com busca */}
                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <div className="relative">
                      <Input
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        onBlur={handleCnpjBlur}
                      />
                      {loadingCnpj && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
                  </div>

                  {/* IE */}
                  <div className="space-y-1.5">
                    <Label>Inscrição Estadual</Label>
                    <Input
                      placeholder={ieIsento ? "ISENTO" : "Inscrição Estadual"}
                      value={ieIsento ? "ISENTO" : inscricaoEstadual}
                      onChange={(e) => setInscricaoEstadual(e.target.value)}
                      disabled={ieIsento}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox id="ie-isento" checked={ieIsento} onCheckedChange={(v) => { setIeIsento(!!v); if (v) setInscricaoEstadual(""); }} />
                      <label htmlFor="ie-isento" className="text-xs text-muted-foreground cursor-pointer">Isento</label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Nome da filial *</Label>
                    <Input placeholder="Ex: Filial São Paulo" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Razão Social</Label>
                    <Input placeholder="Ex: Softflow Tecnologia Ltda" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Responsável (quem assina o contrato)</Label>
                    <Input placeholder="Ex: José da Silva" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
                  </div>

                  {/* CEP com busca */}
                  <div className="space-y-1.5">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        placeholder="01310-100"
                        value={endereco.cep}
                        onChange={(e) => setEndereco(p => ({ ...p, cep: e.target.value }))}
                        onBlur={handleCepBlur}
                      />
                      {loadingCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {cepError && <p className="text-xs text-destructive">{cepError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Logradouro</Label>
                    <Input placeholder="Av. Paulista" value={endereco.logradouro} onChange={(e) => setEndereco(p => ({ ...p, logradouro: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label>Número</Label>
                      <Input placeholder="1000" value={endereco.numero} onChange={(e) => setEndereco(p => ({ ...p, numero: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>Complemento</Label>
                      <Input placeholder="Sala 501" value={endereco.complemento} onChange={(e) => setEndereco(p => ({ ...p, complemento: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input placeholder="Centro" value={endereco.bairro} onChange={(e) => setEndereco(p => ({ ...p, bairro: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input placeholder="São Paulo" value={endereco.cidade} onChange={(e) => setEndereco(p => ({ ...p, cidade: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UF</Label>
                    <Input placeholder="SP" maxLength={2} value={endereco.uf} onChange={(e) => setEndereco(p => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input placeholder="(11) 3000-0000" value={endereco.telefone} onChange={(e) => setEndereco(p => ({ ...p, telefone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="filial@empresa.com" value={endereco.email} onChange={(e) => setEndereco(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>

                {/* Logo upload */}
                <div className="space-y-1.5">
                  <Label>Logo da filial</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  {logoPreview && !removeLogo ? (
                    <div className="relative inline-block">
                      <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-contain border border-border bg-muted p-1" />
                      <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center" onClick={() => { setLogoFile(null); setLogoPreview(null); setRemoveLogo(true); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" /> Enviar logo
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
                </div>

                {/* Assinatura upload */}
                <div className="space-y-1.5">
                  <Label>Assinatura do representante</Label>
                  <p className="text-xs text-muted-foreground">Imagem da assinatura que será embutida nos contratos. Use fundo transparente (PNG) para melhor resultado.</p>
                  <input ref={assinaturaInputRef} type="file" accept="image/*" className="hidden" onChange={handleAssinaturaChange} />
                  {assinaturaPreview && !removeAssinatura ? (
                    <div className="relative inline-block">
                      <img src={assinaturaPreview} alt="Assinatura preview" className="h-16 w-40 rounded-lg object-contain border border-border bg-white p-1" />
                      <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center" onClick={() => { setAssinaturaFile(null); setAssinaturaPreview(null); setRemoveAssinatura(true); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => assinaturaInputRef.current?.click()}>
                      <Upload className="h-4 w-4" /> Enviar assinatura
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={ativa} onCheckedChange={setAtiva} />
                  <Label>Filial ativa</Label>
                </div>
              </TabsContent>

              <TabsContent value="parametros" className="space-y-4 mt-4">
                {/* Etapa inicial */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Onboarding</h3>
                  <div className="space-y-1.5">
                    <Label>Etapa inicial após contrato assinado</Label>
                    <Select value={etapaInicialId || ""} onValueChange={(v) => setEtapaInicialId(v || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        {etapas.map((et) => (
                          <SelectItem key={et.id} value={et.id}>{et.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Define em qual etapa do painel o contrato será inserido ao ser assinado.</p>
                  </div>
                </div>

                {/* Financeiro */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Financeiro</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Parcelas máximas no cartão</Label>
                      <Input
                        type="number"
                        min={1}
                        max={48}
                        value={parcelasMaximasCartao}
                        onChange={(e) => setParcelasMaximasCartao(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Desconto PIX (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={pixDescontoPercentual}
                        onChange={(e) => setPixDescontoPercentual(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Regras padrão */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Regras Padrão de Pagamento</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Regra padrão - Implantação</Label>
                      <Input
                        placeholder="Ex: Boleto 30/60/90 dias"
                        value={regrasPadraoImplantacao}
                        onChange={(e) => setRegrasPadraoImplantacao(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Condição de pagamento padrão para implantação desta filial.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Regra padrão - Mensalidade</Label>
                      <Input
                        placeholder="Ex: Boleto mensal"
                        value={regrasPadraoMensalidade}
                        onChange={(e) => setRegrasPadraoMensalidade(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Condição de pagamento padrão para mensalidade desta filial.</p>
                    </div>
                  </div>
                </div>

                {/* Card Atendimento ao Congelar */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Card Atendimento ao Congelar</h3>
                  <p className="text-xs text-muted-foreground">Define o comportamento do card no painel de atendimento quando um projeto for congelado/pausado.</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Ação ao congelar</Label>
                      <Select value={congelarAcao} onValueChange={(v) => { setCongelarAcao(v); if (v === "manter") setCongelarEtapaId(null); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manter">Manter na mesma etapa</SelectItem>
                          <SelectItem value="mover">Mover para outra etapa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {congelarAcao === "mover" && (
                      <div className="space-y-1.5">
                        <Label>Etapa de destino ao congelar</Label>
                        <Select value={congelarEtapaId || ""} onValueChange={(v) => setCongelarEtapaId(v || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {etapas.map((et) => (
                              <SelectItem key={et.id} value={et.id}>{et.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">O card será movido para esta etapa quando o projeto for congelado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="crm" className="space-y-4 mt-4">
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    Segmentos
                  </h3>
                  <p className="text-xs text-muted-foreground">Cadastre os segmentos de mercado dos clientes desta filial. Serão utilizados no CRM e no cadastro de contratos.</p>

                  {editing && (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome do segmento..."
                          value={novoSegmento}
                          onChange={(e) => setNovoSegmento(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSegmento(editing.id); } }}
                        />
                        <Button type="button" size="sm" className="gap-1.5 shrink-0" disabled={!novoSegmento.trim() || savingSegmento}
                          onClick={() => handleAddSegmento(editing.id)}>
                          {savingSegmento ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Adicionar
                        </Button>
                      </div>

                      {loadingSegmentos ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : segmentos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum segmento cadastrado</p>
                      ) : (
                        <div className="divide-y divide-border rounded-lg border border-border">
                          {segmentos.map((seg) => (
                            <div key={seg.id} className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={seg.ativo ? "default" : "secondary"} className="text-xs">
                                  {seg.nome}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Switch checked={seg.ativo} onCheckedChange={() => toggleSegmento(seg, editing.id)} />
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteSegmento(seg.id, editing.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!editing && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg px-3 py-2">
                      Salve a filial primeiro para gerenciar os segmentos.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || isQuerying}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Salvar" : "Criar filial"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
