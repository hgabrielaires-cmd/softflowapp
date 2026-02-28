import { AppLayout } from "@/components/AppLayout";
import { ComingSoon } from "@/components/ComingSoon";

export default function DashboardFinanceiro() {
  return (
    <AppLayout>
      <ComingSoon
        module="Dashboard"
        title="Dashboard Financeiro"
        description="Em desenvolvimento. Indicadores e métricas financeiras consolidadas."
      />
    </AppLayout>
  );
}
