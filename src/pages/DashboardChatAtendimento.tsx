import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import ChatDashboard from "./chat/components/ChatDashboard";
import ChatHistoricoDrawer from "./chat/components/ChatHistoricoDrawer";

export default function DashboardChatAtendimento() {
  const [drawerConversa, setDrawerConversa] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
          <h1 className="text-xl font-bold text-foreground">Dashboard Atendimento</h1>
          <p className="text-sm text-muted-foreground">Métricas e indicadores do chat de atendimento</p>
        </div>
        <ChatDashboard onVerConversa={(id) => setDrawerConversa(id)} />
        <ChatHistoricoDrawer
          conversaId={drawerConversa}
          open={!!drawerConversa}
          onClose={() => setDrawerConversa(null)}
        />
      </div>
    </AppLayout>
  );
}
