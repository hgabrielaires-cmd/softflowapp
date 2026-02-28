import { AppLayout } from "@/components/AppLayout";
import { ComingSoon } from "@/components/ComingSoon";

export default function DashboardAtendimento() {
  return (
    <AppLayout>
      <ComingSoon
        module="Dashboard"
        title="Dashboard Atendimento"
        description="Em desenvolvimento. Indicadores e métricas do painel de atendimento e onboarding."
      />
    </AppLayout>
  );
}
