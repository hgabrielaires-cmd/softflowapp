import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportClientesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filialId: string;
  onSuccess: () => void;
}

const SYSTEM_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: "nome_fantasia", label: "Nome Fantasia", required: true },
  { key: "cnpj_cpf", label: "CNPJ / CPF", required: true },
  { key: "filial", label: "Filial", required: false },
  { key: "razao_social", label: "Razão Social", required: false },
  { key: "apelido", label: "Apelido", required: false },
  { key: "inscricao_estadual", label: "Inscrição Estadual", required: false },
  { key: "responsavel_nome", label: "Nome do Responsável", required: false },
  { key: "contato_nome", label: "Nome do Contato", required: false },
  { key: "telefone", label: "Telefone", required: false },
  { key: "email", label: "E-mail", required: false },
  { key: "cep", label: "CEP", required: false },
  { key: "logradouro", label: "Logradouro", required: false },
  { key: "numero", label: "Número", required: false },
  { key: "complemento", label: "Complemento", required: false },
  { key: "bairro", label: "Bairro", required: false },
  { key: "cidade", label: "Cidade", required: false },
  { key: "uf", label: "UF", required: false },
];

type Step = "upload" | "mapping" | "importing" | "done";

export function ImportClientesDialog({ open, onOpenChange, filialId, onSuccess }: ImportClientesDialogProps) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ total: 0, success: 0, errors: 0 });

  function reset() {
    setStep("upload");
    setFileName("");
    setSheetColumns([]);
    setSheetData([]);
    setMapping({});
    setImporting(false);
    setImportResult({ total: 0, success: 0, errors: 0 });
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Formato inválido. Use arquivos .xlsx, .xls ou .csv");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, {
          header: undefined,
          defval: "",
          raw: false,
        });

        if (jsonData.length === 0) {
          toast.error("Planilha vazia ou sem dados");
          return;
        }

        const cols = Object.keys(jsonData[0]);
        setSheetColumns(cols);
        setSheetData(jsonData);

        // Auto-map by similarity
        const autoMap: Record<string, string> = {};
        for (const field of SYSTEM_FIELDS) {
          const match = cols.find(
            (c) =>
              c.toLowerCase().trim() === field.label.toLowerCase().trim() ||
              c.toLowerCase().trim() === field.key.toLowerCase().replace(/_/g, " ") ||
              c.toLowerCase().trim() === field.key.toLowerCase()
          );
          if (match) autoMap[field.key] = match;
        }
        setMapping(autoMap);
        setStep("mapping");
      } catch {
        toast.error("Erro ao ler a planilha");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function setFieldMapping(systemField: string, sheetCol: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (sheetCol === "__none__") {
        delete next[systemField];
      } else {
        next[systemField] = sheetCol;
      }
      return next;
    });
  }

  const requiredMapped = SYSTEM_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);
  const mappedCount = Object.keys(mapping).length;

  async function handleImport() {
    if (!requiredMapped) {
      toast.error("Mapeie os campos obrigatórios (Nome Fantasia e CNPJ/CPF)");
      return;
    }

    setImporting(true);
    setStep("importing");

    // Load filiais for name resolution if filial column is mapped
    let filiaisMap: Record<string, string> = {};
    if (mapping["filial"]) {
      const { data: filiaisData } = await supabase.from("filiais").select("id, nome").eq("ativa", true);
      if (filiaisData) {
        for (const f of filiaisData) {
          filiaisMap[f.nome.trim().toUpperCase()] = f.id;
        }
      }
    }

    let success = 0;
    let errors = 0;

    for (const row of sheetData) {
      const getValue = (key: string): string | null => {
        const colName = mapping[key];
        if (!colName || row[colName] === undefined) return null;
        let val = String(row[colName]).trim();
        if (key === "cep") val = val.replace(/\D/g, "");
        return val || null;
      };

      const nomeFant = getValue("nome_fantasia");
      const cnpjCpf = getValue("cnpj_cpf");

      if (!nomeFant || !cnpjCpf) {
        errors++;
        continue;
      }

      // Resolve filial: from spreadsheet column or fallback to prop
      let resolvedFilialId: string | null = filialId || null;
      const filialNome = getValue("filial");
      if (filialNome) {
        const found = filiaisMap[filialNome.toUpperCase()];
        if (found) {
          resolvedFilialId = found;
        }
      }

      const { error } = await supabase.from("clientes").insert({
        nome_fantasia: nomeFant,
        cnpj_cpf: cnpjCpf,
        razao_social: getValue("razao_social"),
        apelido: getValue("apelido"),
        inscricao_estadual: getValue("inscricao_estadual"),
        responsavel_nome: getValue("responsavel_nome"),
        contato_nome: getValue("contato_nome"),
        telefone: getValue("telefone"),
        email: getValue("email"),
        cep: getValue("cep"),
        logradouro: getValue("logradouro"),
        numero: getValue("numero"),
        complemento: getValue("complemento"),
        bairro: getValue("bairro"),
        cidade: getValue("cidade"),
        uf: getValue("uf"),
        filial_id: resolvedFilialId,
        ativo: true,
      });
      if (error) {
        console.error("Import error:", error.message);
        errors++;
      } else {
        success++;
      }
    }

    setImportResult({ total: sheetData.length, success, errors });
    setImporting(false);
    setStep("done");
    if (success > 0) onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação de Clientes
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma planilha (.xlsx, .xls ou .csv) com a lista de clientes. A primeira linha deve conter os nomes das colunas.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Arquivo: {fileName}</p>
                <p className="text-xs text-muted-foreground">{sheetData.length} registros encontrados</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {mappedCount} campos vinculados
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Vincule as colunas da planilha aos campos do sistema. Campos com <span className="text-destructive font-medium">*</span> são obrigatórios.
            </p>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Campo do Sistema</TableHead>
                    <TableHead className="w-[10%] text-center"><ArrowRight className="h-4 w-4 mx-auto" /></TableHead>
                    <TableHead className="w-[45%]">Coluna da Planilha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SYSTEM_FIELDS.map((field) => (
                    <TableRow key={field.key}>
                      <TableCell className="py-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {mapping[field.key] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={mapping[field.key] || "__none__"}
                          onValueChange={(v) => setFieldMapping(field.key, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Não vincular —</SelectItem>
                            {sheetColumns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Preview */}
            {sheetData.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Prévia (primeiros 3 registros):</p>
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {sheetColumns.slice(0, 6).map((col) => (
                          <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetData.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {sheetColumns.slice(0, 6).map((col) => (
                            <TableCell key={col} className="text-xs py-1 whitespace-nowrap max-w-[150px] truncate">
                              {row[col] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Importando clientes...</p>
            <p className="text-xs text-muted-foreground">Aguarde, processando {sheetData.length} registros</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-lg font-semibold text-foreground">Importação concluída!</p>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{importResult.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              {importResult.errors > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              )}
            </div>
            {importResult.errors > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Registros com erro podem ter campos obrigatórios vazios ou CNPJ duplicado
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={handleImport} disabled={!requiredMapped} className="gap-2">
                <Upload className="h-4 w-4" />
                Importar {sheetData.length} registros
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
