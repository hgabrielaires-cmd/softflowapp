import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

export default function ConfigurarFaturamento() {
  const { contratoId } = useParams();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/faturamento")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurar Faturamento</h1>
            <p className="text-sm text-muted-foreground">Contrato: {contratoId}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Construction className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">Em Desenvolvimento</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            A tela de configuração de faturamento com layout de 3 colunas será implementada na Fase 2.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/faturamento")}>
            Voltar para Faturamento
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
