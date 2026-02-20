import { substituirVariaveis, getExampleData } from "@/lib/contract-variables";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface ContractPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  dados?: Record<string, string>; // dados reais; se null, usa exemplo
  title?: string;
}

export function ContractPreview({ open, onOpenChange, html, dados, title }: ContractPreviewProps) {
  const dataToUse = dados || getExampleData();
  // Garantir que variáveis de logo no exemplo tenham um placeholder visual válido
  if (!dados) {
    if (!dataToUse["logo.url"]?.startsWith("http")) {
      dataToUse["logo.url"] = "";
    }
    if (!dataToUse["empresa.logo"]?.startsWith("http")) {
      dataToUse["empresa.logo"] = "";
    }
  }
  const rendered = substituirVariaveis(html, dataToUse);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {title || "Preview do Contrato"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
          <iframe
            title="contract-preview"
            srcDoc={rendered}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
