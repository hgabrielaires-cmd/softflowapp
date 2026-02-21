import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, MessageCircle, Monitor, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "ativo" | "em-breve" | "configurado";
  statusLabel: string;
  details: string[];
  accentColor: string;
}

function IntegrationCard({ icon, title, description, status, statusLabel, details, accentColor }: IntegrationCardProps) {
  const statusConfig = {
    ativo: { variant: "default" as const, icon: <CheckCircle2 className="h-3 w-3" /> },
    configurado: { variant: "secondary" as const, icon: <CheckCircle2 className="h-3 w-3" /> },
    "em-breve": { variant: "outline" as const, icon: <Clock className="h-3 w-3" /> },
  };

  const config = statusConfig[status];

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-soft border-border/60">
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accentColor} text-white shadow-sm`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 shrink-0">
            {config.icon}
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="space-y-1.5">
          {details.map((detail, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === "em-breve" ? "bg-muted-foreground/40" : accentColor}`} />
              {detail}
            </li>
          ))}
        </ul>

        {status !== "em-breve" && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 px-0">
              <ExternalLink className="h-3 w-3" />
              Ver configurações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const integrations: IntegrationCardProps[] = [
  {
    icon: <FileSignature className="h-5 w-5" />,
    title: "ZapSign",
    description: "Assinatura eletrônica de contratos",
    status: "ativo",
    statusLabel: "Ativo",
    accentColor: "bg-emerald",
    details: [
      "Envio automático de contratos para assinatura",
      "Autenticação JWT com renovação automática",
      "Rastreamento de status em tempo real",
      "Identificação automática de signatários",
    ],
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "WhatsApp",
    description: "Comunicação com clientes via WhatsApp",
    status: "em-breve",
    statusLabel: "Em breve",
    accentColor: "bg-[hsl(142,70%,45%)]",
    details: [
      "Envio de notificações e lembretes",
      "Links de assinatura por WhatsApp",
      "Confirmações automáticas de agendamento",
      "Comunicação direta com clientes",
    ],
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Browserless (PDV)",
    description: "Geração de PDFs via renderização server-side",
    status: "ativo",
    statusLabel: "Ativo",
    accentColor: "gradient-brand",
    details: [
      "Renderização de alta fidelidade com headless Chrome",
      "Geração de contratos em PDF formato A4",
      "Substituição automática de variáveis",
      "Armazenamento seguro no storage",
    ],
  },
];

export default function Integracoes() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as integrações externas do sistema
          </p>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {integrations.filter((i) => i.status === "ativo").length}
              </span>{" "}
              ativas
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {integrations.filter((i) => i.status === "em-breve").length}
              </span>{" "}
              em breve
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.title} {...integration} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
