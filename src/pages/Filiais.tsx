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
import { Plus, Pencil, Building2, Loader2, Upload, X, Image, Search } from "lucide-react";
import { toast } from "sonner";

export default function Filiais() {
  const { isAdmin } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [nome, setNome] = useState("");
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

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function loadFiliais() {
    setLoading(true);
    const { data, error } = await supabase.from("filiais").select("*").order("nome");
    if (error) toast.error("Erro ao carregar filiais");
    else setFiliais(data as Filial[]);
    setLoading(false);
  }

  useEffect(() => { loadFiliais(); }, []);

  function resetForm() {
    setNome(""); setAtiva(true); setCnpj(""); setInscricaoEstadual(""); setIeIsento(false);
    setEndereco({ logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "" });
    setCnpjError(""); setCepError("");
    setLogoFile(null); setLogoPreview(null); setRemoveLogo(false);
  }

  function openCreate() {
    setEditing(null); resetForm(); setOpenDialog(true);
  }

  function openEdit(filial: Filial) {
    setEditing(filial);
    setNome(filial.nome);
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
      setNome(prev => prev || data.razao_social || data.nome_fantasia || "");
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
        const { error } = await supabase.from("filiais")
          .update({ nome: nome.trim(), ativa, logo_url, cnpj: cnpj.trim() || null, inscricao_estadual: ie, ...endereco })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Filial atualizada com sucesso");
      } else {
        const { data: inserted, error } = await supabase.from("filiais")
          .insert({ nome: nome.trim(), ativa, cnpj: cnpj.trim() || null, inscricao_estadual: ie, ...endereco })
          .select("id").single();
        if (error) throw error;
        if (logoFile && inserted) {
          const logo_url = await uploadLogo(inserted.id);
          await supabase.from("filiais").update({ logo_url }).eq("id", inserted.id);
        }
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

              <div className="space-y-1.5 col-span-2">
                <Label>Nome da filial *</Label>
                <Input placeholder="Ex: Filial São Paulo" value={nome} onChange={(e) => setNome(e.target.value)} required />
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

            <div className="flex items-center gap-3">
              <Switch checked={ativa} onCheckedChange={setAtiva} />
              <Label>Filial ativa</Label>
            </div>
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
