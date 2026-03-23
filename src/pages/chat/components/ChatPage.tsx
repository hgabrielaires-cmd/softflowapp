import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import ChatConversaList from "./ChatConversaList";
import ChatMessageArea from "./ChatMessageArea";
import ChatClientePanel from "./ChatClientePanel";
import TransferirDialog from "./TransferirDialog";
import { useChatConversas, useChatMensagens } from "../useChatQueries";
import { useChatActions } from "../useChatActions";
import { ChatConversa } from "../types";
import { useNotificacaoChat } from "@/hooks/useNotificacaoChat";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("fila");
  const [search, setSearch] = useState("");
  const [selectedConversa, setSelectedConversa] = useState<ChatConversa | null>(null);
  const [showTransferir, setShowTransferir] = useState(false);

  const { data: conversas = [] } = useChatConversas(tab, user?.id, search);
  const { data: mensagens = [] } = useChatMensagens(selectedConversa?.id || null);
  const actions = useChatActions();

  // Counts per tab
  const { data: filaConversas = [] } = useChatConversas("fila", user?.id, "");
  const { data: meusConversas = [] } = useChatConversas("meus", user?.id, "");

  const counts = useMemo(() => ({
    fila: filaConversas.length,
    meus: meusConversas.length,
    todos: 0,
    encerrados: 0,
  }), [filaConversas, meusConversas]);

  // Sync selected conversa with latest data
  const conversaAtual = useMemo(() => {
    if (!selectedConversa) return null;
    return conversas.find((c) => c.id === selectedConversa.id) || selectedConversa;
  }, [conversas, selectedConversa]);

  const userName = (profile as any)?.full_name || "Atendente";

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Col 1 - Conversations List */}
        <div className="w-[280px] flex-shrink-0">
          <ChatConversaList
            conversas={conversas as ChatConversa[]}
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
            selectedId={selectedConversa?.id || null}
            onSelect={(c) => setSelectedConversa(c)}
            counts={counts}
          />
        </div>

        {/* Col 2 - Chat Window */}
        <ChatMessageArea
          conversa={conversaAtual as ChatConversa | null}
          mensagens={mensagens as any[]}
          userId={user?.id || null}
          userName={userName}
          onSend={(texto, tipo) => {
            if (!conversaAtual || !user?.id) return;
            actions.enviarMensagem.mutate({
              conversaId: conversaAtual.id,
              texto,
              tipo,
              atendenteId: user.id,
              numero: conversaAtual.numero_cliente,
              instanceName: conversaAtual.canal_instancia || undefined,
            });
          }}
          onIniciarAtendimento={() => {
            if (!conversaAtual || !user?.id) return;
            actions.iniciarAtendimento.mutate({
              conversaId: conversaAtual.id,
              userId: user.id,
              userName,
              numero: conversaAtual.numero_cliente,
              instanceName: conversaAtual.canal_instancia || undefined,
            });
          }}
          onEncerrar={() => {
            if (!conversaAtual || !user?.id) return;
            actions.encerrarConversa.mutate({
              conversaId: conversaAtual.id,
              userId: user.id,
              userName,
              numero: conversaAtual.numero_cliente,
              instanceName: conversaAtual.canal_instancia || undefined,
            });
          }}
          onTransferir={() => setShowTransferir(true)}
        />

        {/* Col 3 - Client Panel */}
        <div className="w-[320px] flex-shrink-0 hidden xl:block">
          <ChatClientePanel conversa={conversaAtual as ChatConversa | null} />
        </div>

        {/* Transfer Dialog */}
        <TransferirDialog
          open={showTransferir}
          onClose={() => setShowTransferir(false)}
          onConfirm={(setorId, atendenteId, motivo, setorNome) => {
            if (!conversaAtual) return;
            actions.transferirConversa.mutate({
              conversaId: conversaAtual.id,
              novoSetorId: setorId,
              novoAtendenteId: atendenteId,
              motivo,
              setorNome,
            });
          }}
        />
      </div>
    </AppLayout>
  );
}
