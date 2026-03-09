import { Package, ArrowUpCircle, Layers, FileText, Wrench, GraduationCap } from "lucide-react";

export const TIPO_ICONS: Record<string, React.ReactNode> = {
  "Implantação": <Package className="h-3.5 w-3.5" />,
  "Upgrade": <ArrowUpCircle className="h-3.5 w-3.5" />,
  "Módulo Adicional": <Layers className="h-3.5 w-3.5" />,
  "Ordem de Atendimento": <FileText className="h-3.5 w-3.5" />,
  "Serviço": <Wrench className="h-3.5 w-3.5" />,
  "Treinamento": <GraduationCap className="h-3.5 w-3.5" />,
};

export const TIPO_COLORS: Record<string, string> = {
  "Implantação": "bg-blue-100 text-blue-700 border-blue-200",
  "Upgrade": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Módulo Adicional": "bg-violet-100 text-violet-700 border-violet-200",
  "Ordem de Atendimento": "bg-teal-100 text-teal-700 border-teal-200",
  "Serviço": "bg-amber-100 text-amber-700 border-amber-200",
  "Treinamento": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const TIPOS_UNICOS = ["Implantação", "Upgrade", "Módulo Adicional", "Ordem de Atendimento", "Serviço"];
