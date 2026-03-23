export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asaas_config: {
        Row: {
          ambiente: string
          ativo: boolean
          created_at: string | null
          filial_id: string
          id: string
          token: string
          updated_at: string | null
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          created_at?: string | null
          filial_id: string
          id?: string
          token: string
          updated_at?: string | null
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          created_at?: string | null
          filial_id?: string
          id?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_config_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: true
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automacoes: {
        Row: {
          acao_config: Json
          acao_tipo: string
          ativo: boolean
          created_at: string
          descricao: string | null
          gatilho_config: Json
          gatilho_tipo: string
          id: string
          lembrete_ativo: boolean
          lembrete_intervalo_horas: number | null
          lembrete_maximo: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          acao_config?: Json
          acao_tipo: string
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          gatilho_config?: Json
          gatilho_tipo: string
          id?: string
          lembrete_ativo?: boolean
          lembrete_intervalo_horas?: number | null
          lembrete_maximo?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          acao_config?: Json
          acao_tipo?: string
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          gatilho_config?: Json
          gatilho_tipo?: string
          id?: string
          lembrete_ativo?: boolean
          lembrete_intervalo_horas?: number | null
          lembrete_maximo?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      automacoes_log: {
        Row: {
          automacao_id: string
          canal: string
          detalhes: Json
          executado_em: string
          id: string
          nivel: number
          referencia_id: string
          referencia_tipo: string
        }
        Insert: {
          automacao_id: string
          canal: string
          detalhes?: Json
          executado_em?: string
          id?: string
          nivel?: number
          referencia_id: string
          referencia_tipo: string
        }
        Update: {
          automacao_id?: string
          canal?: string
          detalhes?: Json
          executado_em?: string
          id?: string
          nivel?: number
          referencia_id?: string
          referencia_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacoes_log_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_contatos: {
        Row: {
          ativo: boolean
          cargo: string | null
          cliente_id: string
          created_at: string
          decisor: boolean
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cliente_id: string
          created_at?: string
          decisor?: boolean
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cliente_id?: string
          created_at?: string
          decisor?: boolean
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apelido: string | null
          ativo: boolean
          atualizado_por: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          contato_nome: string | null
          created_at: string
          criado_por: string | null
          email: string | null
          filial_id: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          razao_social: string | null
          responsavel_nome: string | null
          status_financeiro: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          ativo?: boolean
          atualizado_por?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          filial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          razao_social?: string | null
          responsavel_nome?: string | null
          status_financeiro?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          ativo?: boolean
          atualizado_por?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          filial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          razao_social?: string | null
          responsavel_nome?: string | null
          status_financeiro?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      cobranca_config: {
        Row: {
          created_at: string | null
          dias_atraso_alerta: number
          dias_atraso_suspensao: number
          dias_lembrete_1: number
          dias_lembrete_vencimento: boolean
          filial_id: string
          id: string
          regua_ativa: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dias_atraso_alerta?: number
          dias_atraso_suspensao?: number
          dias_lembrete_1?: number
          dias_lembrete_vencimento?: boolean
          filial_id: string
          id?: string
          regua_ativa?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dias_atraso_alerta?: number
          dias_atraso_suspensao?: number
          dias_lembrete_1?: number
          dias_lembrete_vencimento?: boolean
          filial_id?: string
          id?: string
          regua_ativa?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobranca_config_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: true
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          ativo: boolean
          conteudo_html: string
          created_at: string
          id: string
          ordem_padrao: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo_html?: string
          created_at?: string
          id?: string
          ordem_padrao?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo_html?: string
          created_at?: string
          id?: string
          ordem_padrao?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      contrato_financeiro_historico: {
        Row: {
          contrato_financeiro_id: string
          contrato_origem_id: string | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string
          id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          contrato_financeiro_id: string
          contrato_origem_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao: string
          id?: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          contrato_financeiro_id?: string
          contrato_origem_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string
          id?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_financeiro_historico_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_financeiro_historico_contrato_origem_id_fkey"
            columns: ["contrato_origem_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_financeiro_modulos: {
        Row: {
          ativo: boolean
          contrato_financeiro_id: string
          contrato_origem_id: string | null
          created_at: string
          data_inicio: string
          id: string
          nome: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          contrato_financeiro_id: string
          contrato_origem_id?: string | null
          created_at?: string
          data_inicio?: string
          id?: string
          nome: string
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          contrato_financeiro_id?: string
          contrato_origem_id?: string | null
          created_at?: string
          data_inicio?: string
          id?: string
          nome?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_financeiro_modulos_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_financeiro_modulos_contrato_origem_id_fkey"
            columns: ["contrato_origem_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_financeiro_oas: {
        Row: {
          ano_referencia: number
          contrato_financeiro_id: string
          contrato_oa_id: string | null
          created_at: string
          descricao: string
          faturada: boolean
          id: string
          mes_referencia: number
          observacoes: string | null
          valor: number
        }
        Insert: {
          ano_referencia: number
          contrato_financeiro_id: string
          contrato_oa_id?: string | null
          created_at?: string
          descricao: string
          faturada?: boolean
          id?: string
          mes_referencia: number
          observacoes?: string | null
          valor?: number
        }
        Update: {
          ano_referencia?: number
          contrato_financeiro_id?: string
          contrato_oa_id?: string | null
          created_at?: string
          descricao?: string
          faturada?: boolean
          id?: string
          mes_referencia?: number
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_financeiro_oas_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_financeiro_oas_contrato_oa_id_fkey"
            columns: ["contrato_oa_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string
          contrato_origem_id: string | null
          created_at: string
          id: string
          numero_exibicao: string
          numero_registro: number
          pdf_url: string | null
          pedido_id: string | null
          plano_id: string | null
          segmento_id: string | null
          status: string
          status_geracao: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          contrato_origem_id?: string | null
          created_at?: string
          id?: string
          numero_exibicao?: string
          numero_registro?: number
          pdf_url?: string | null
          pedido_id?: string | null
          plano_id?: string | null
          segmento_id?: string | null
          status?: string
          status_geracao?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          contrato_origem_id?: string | null
          created_at?: string
          id?: string
          numero_exibicao?: string
          numero_registro?: number
          pdf_url?: string | null
          pedido_id?: string | null
          plano_id?: string | null
          segmento_id?: string | null
          status?: string
          status_geracao?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_cancelados: {
        Row: {
          cancelado_em: string
          cancelado_por: string
          cliente_id: string
          cliente_nome: string | null
          contrato_base_id: string | null
          contrato_base_numero: string | null
          contrato_id: string
          contrato_numero: string
          contrato_tipo: string
          created_at: string
          filial_id: string | null
          id: string
          motivo: string | null
          plano_nome: string | null
          tipo_pedido: string | null
        }
        Insert: {
          cancelado_em?: string
          cancelado_por: string
          cliente_id: string
          cliente_nome?: string | null
          contrato_base_id?: string | null
          contrato_base_numero?: string | null
          contrato_id: string
          contrato_numero: string
          contrato_tipo: string
          created_at?: string
          filial_id?: string | null
          id?: string
          motivo?: string | null
          plano_nome?: string | null
          tipo_pedido?: string | null
        }
        Update: {
          cancelado_em?: string
          cancelado_por?: string
          cliente_id?: string
          cliente_nome?: string | null
          contrato_base_id?: string | null
          contrato_base_numero?: string | null
          contrato_id?: string
          contrato_numero?: string
          contrato_tipo?: string
          created_at?: string
          filial_id?: string | null
          id?: string
          motivo?: string | null
          plano_nome?: string | null
          tipo_pedido?: string | null
        }
        Relationships: []
      }
      contratos_financeiros: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          cliente_id: string
          contrato_base_id: string | null
          contrato_id: string
          created_at: string
          data_inicio: string
          dia_vencimento: number
          email_cobranca: string | null
          filial_id: string | null
          forma_pagamento: string
          id: string
          implantacao_ja_cobrada: boolean
          observacoes: string | null
          parcelas_implantacao: number
          parcelas_pagas: number
          pedido_id: string | null
          plano_id: string | null
          status: string
          tipo: string
          updated_at: string
          valor_implantacao: number
          valor_mensalidade: number
          whatsapp_cobranca: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cliente_id: string
          contrato_base_id?: string | null
          contrato_id: string
          created_at?: string
          data_inicio?: string
          dia_vencimento?: number
          email_cobranca?: string | null
          filial_id?: string | null
          forma_pagamento?: string
          id?: string
          implantacao_ja_cobrada?: boolean
          observacoes?: string | null
          parcelas_implantacao?: number
          parcelas_pagas?: number
          pedido_id?: string | null
          plano_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_implantacao?: number
          valor_mensalidade?: number
          whatsapp_cobranca?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cliente_id?: string
          contrato_base_id?: string | null
          contrato_id?: string
          created_at?: string
          data_inicio?: string
          dia_vencimento?: number
          email_cobranca?: string | null
          filial_id?: string | null
          forma_pagamento?: string
          id?: string
          implantacao_ja_cobrada?: boolean
          observacoes?: string | null
          parcelas_implantacao?: number
          parcelas_pagas?: number
          pedido_id?: string | null
          plano_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_implantacao?: number
          valor_mensalidade?: number
          whatsapp_cobranca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_contrato_base_id_fkey"
            columns: ["contrato_base_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_vendedor_lembretes: {
        Row: {
          cliente_nome: string
          contrato_id: string
          contrato_numero: string
          created_at: string
          decisor_nome: string
          enviado_em: string
          id: string
          lembrete_24h_em: string | null
          lembrete_24h_enviado: boolean
          sign_url: string | null
          vendedor_user_id: string
        }
        Insert: {
          cliente_nome: string
          contrato_id: string
          contrato_numero: string
          created_at?: string
          decisor_nome: string
          enviado_em?: string
          id?: string
          lembrete_24h_em?: string | null
          lembrete_24h_enviado?: boolean
          sign_url?: string | null
          vendedor_user_id: string
        }
        Update: {
          cliente_nome?: string
          contrato_id?: string
          contrato_numero?: string
          created_at?: string
          decisor_nome?: string
          enviado_em?: string
          id?: string
          lembrete_24h_em?: string | null
          lembrete_24h_enviado?: boolean
          sign_url?: string | null
          vendedor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_vendedor_lembretes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_zapsign: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          sign_url: string | null
          signers: Json | null
          status: string
          updated_at: string
          zapsign_doc_id: string | null
          zapsign_doc_token: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          sign_url?: string | null
          signers?: Json | null
          status?: string
          updated_at?: string
          zapsign_doc_id?: string | null
          zapsign_doc_token: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          sign_url?: string | null
          signers?: Json | null
          status?: string
          updated_at?: string
          zapsign_doc_id?: string | null
          zapsign_doc_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_zapsign_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campos_personalizados: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          obrigatorio: boolean
          opcoes: Json
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          opcoes?: Json
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          opcoes?: Json
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_cargos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_comentarios: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          created_at: string
          id: string
          oportunidade_id: string
          parent_id: string | null
          prioridade: string
          texto: string
          user_id: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          created_at?: string
          id?: string
          oportunidade_id: string
          parent_id?: string | null
          prioridade?: string
          texto: string
          user_id: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          created_at?: string
          id?: string
          oportunidade_id?: string
          parent_id?: string | null
          prioridade?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_comentarios_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "crm_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_curtidas: {
        Row: {
          comentario_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comentario_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comentario_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_curtidas_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "crm_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_etapas: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          funil_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          funil_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_etapas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "crm_funis"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funis: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          exibe_cliente: boolean
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          exibe_cliente?: boolean
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          exibe_cliente?: boolean
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_historico: {
        Row: {
          created_at: string
          descricao: string
          id: string
          oportunidade_id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          oportunidade_id: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          oportunidade_id?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_historico_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_motivos_perda: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_oportunidade_contatos: {
        Row: {
          cargo_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          oportunidade_id: string
          telefone: string
        }
        Insert: {
          cargo_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          oportunidade_id: string
          telefone: string
        }
        Update: {
          cargo_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          oportunidade_id?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidade_contatos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "crm_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidade_contatos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_oportunidade_produtos: {
        Row: {
          created_at: string
          id: string
          oportunidade_id: string
          quantidade: number
          referencia_id: string
          tipo: string
          valor_implantacao: number
          valor_mensalidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          oportunidade_id: string
          quantidade?: number
          referencia_id: string
          tipo: string
          valor_implantacao?: number
          valor_mensalidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          oportunidade_id?: string
          quantidade?: number
          referencia_id?: string
          tipo?: string
          valor_implantacao?: number
          valor_mensalidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidade_produtos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_oportunidades: {
        Row: {
          campos_personalizados: Json
          classificacao: number
          cliente_id: string | null
          concorrente: string | null
          contato_id: string | null
          created_at: string
          data_fechamento: string | null
          data_perda: string | null
          data_previsao_fechamento: string | null
          desconto_implantacao: number
          desconto_implantacao_tipo: string
          desconto_mensalidade: number
          desconto_mensalidade_tipo: string
          etapa_id: string
          etapa_perda_id: string | null
          funil_id: string
          id: string
          motivo_perda: string | null
          motivo_perda_id: string | null
          observacao_perda: string | null
          observacoes: string | null
          ordem: number
          origem: string | null
          pedido_id: string | null
          responsavel_id: string | null
          segmento_ids: string[] | null
          status: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          campos_personalizados?: Json
          classificacao?: number
          cliente_id?: string | null
          concorrente?: string | null
          contato_id?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_perda?: string | null
          data_previsao_fechamento?: string | null
          desconto_implantacao?: number
          desconto_implantacao_tipo?: string
          desconto_mensalidade?: number
          desconto_mensalidade_tipo?: string
          etapa_id: string
          etapa_perda_id?: string | null
          funil_id: string
          id?: string
          motivo_perda?: string | null
          motivo_perda_id?: string | null
          observacao_perda?: string | null
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          pedido_id?: string | null
          responsavel_id?: string | null
          segmento_ids?: string[] | null
          status?: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          campos_personalizados?: Json
          classificacao?: number
          cliente_id?: string | null
          concorrente?: string | null
          contato_id?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_perda?: string | null
          data_previsao_fechamento?: string | null
          desconto_implantacao?: number
          desconto_implantacao_tipo?: string
          desconto_mensalidade?: number
          desconto_mensalidade_tipo?: string
          etapa_id?: string
          etapa_perda_id?: string | null
          funil_id?: string
          id?: string
          motivo_perda?: string | null
          motivo_perda_id?: string | null
          observacao_perda?: string | null
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          pedido_id?: string | null
          responsavel_id?: string | null
          segmento_ids?: string[] | null
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "cliente_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_etapa_perda_id_fkey"
            columns: ["etapa_perda_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "crm_funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "crm_motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_oportunidades_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposta_envios: {
        Row: {
          contato_nome: string | null
          created_at: string
          erro: string | null
          id: string
          instancia_usada: string
          numero_destino: string
          oportunidade_id: string
          setor_nome: string | null
          status_envio: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          contato_nome?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          instancia_usada: string
          numero_destino: string
          oportunidade_id: string
          setor_nome?: string | null
          status_envio?: string
          tipo?: string
          usuario_id: string
        }
        Update: {
          contato_nome?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          instancia_usada?: string
          numero_destino?: string
          oportunidade_id?: string
          setor_nome?: string | null
          status_envio?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposta_envios_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tarefas: {
        Row: {
          canal: string
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          criado_por: string
          data_reuniao: string | null
          descricao: string
          id: string
          oportunidade_id: string
          tipo_atendimento: string
          updated_at: string
        }
        Insert: {
          canal?: string
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por: string
          data_reuniao?: string | null
          descricao?: string
          id?: string
          oportunidade_id: string
          tipo_atendimento?: string
          updated_at?: string
        }
        Update: {
          canal?: string
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por?: string
          data_reuniao?: string | null
          descricao?: string
          id?: string
          oportunidade_id?: string
          tipo_atendimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tarefas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "crm_oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tarefas_historico: {
        Row: {
          created_at: string
          data_anterior: string | null
          data_nova: string | null
          id: string
          resposta: string
          tarefa_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_anterior?: string | null
          data_nova?: string | null
          id?: string
          resposta: string
          tarefa_id: string
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_anterior?: string | null
          data_nova?: string | null
          id?: string
          resposta?: string
          tarefa_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tarefas_historico_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "crm_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      custos: {
        Row: {
          created_at: string
          despesas_adicionais: number
          despesas_adicionais_descricao: string | null
          id: string
          imposto_base: string
          imposto_tipo: string
          imposto_valor: number
          modulo_id: string | null
          plano_id: string | null
          preco_fornecedor: number
          taxa_boleto: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          despesas_adicionais?: number
          despesas_adicionais_descricao?: string | null
          id?: string
          imposto_base?: string
          imposto_tipo?: string
          imposto_valor?: number
          modulo_id?: string | null
          plano_id?: string | null
          preco_fornecedor?: number
          taxa_boleto?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          despesas_adicionais?: number
          despesas_adicionais_descricao?: string | null
          id?: string
          imposto_base?: string
          imposto_tipo?: string
          imposto_valor?: number
          modulo_id?: string | null
          plano_id?: string | null
          preco_fornecedor?: number
          taxa_boleto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          ativo: boolean
          conteudo_html: string
          created_at: string
          filial_id: string | null
          id: string
          logo_url: string | null
          message_template_id: string | null
          nome: string
          tipo: string
          updated_at: string
          usa_clausulas: boolean
          versao: number
        }
        Insert: {
          ativo?: boolean
          conteudo_html?: string
          created_at?: string
          filial_id?: string | null
          id?: string
          logo_url?: string | null
          message_template_id?: string | null
          nome: string
          tipo: string
          updated_at?: string
          usa_clausulas?: boolean
          versao?: number
        }
        Update: {
          ativo?: boolean
          conteudo_html?: string
          created_at?: string
          filial_id?: string | null
          id?: string
          logo_url?: string | null
          message_template_id?: string | null
          nome?: string
          tipo?: string
          updated_at?: string
          usa_clausulas?: boolean
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_message_template_id_fkey"
            columns: ["message_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_cron_logs: {
        Row: {
          ano: number
          detalhes: Json | null
          executado_em: string
          id: string
          mes: number
          total_contratos: number
          total_erros: number
          total_faturados: number
          total_ja_faturados: number
        }
        Insert: {
          ano: number
          detalhes?: Json | null
          executado_em?: string
          id?: string
          mes: number
          total_contratos?: number
          total_erros?: number
          total_faturados?: number
          total_ja_faturados?: number
        }
        Update: {
          ano?: number
          detalhes?: Json | null
          executado_em?: string
          id?: string
          mes?: number
          total_contratos?: number
          total_erros?: number
          total_faturados?: number
          total_ja_faturados?: number
        }
        Relationships: []
      }
      faturamento_logs: {
        Row: {
          ano: number
          contrato_financeiro_id: string | null
          created_at: string
          erro: string | null
          fatura_id: string | null
          id: string
          mes: number
          status: string
          valor: number
        }
        Insert: {
          ano: number
          contrato_financeiro_id?: string | null
          created_at?: string
          erro?: string | null
          fatura_id?: string | null
          id?: string
          mes: number
          status?: string
          valor?: number
        }
        Update: {
          ano?: number
          contrato_financeiro_id?: string | null
          created_at?: string
          erro?: string | null
          fatura_id?: string | null
          id?: string
          mes?: number
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_logs_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamento_logs_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_sync_log: {
        Row: {
          asaas_payment_id: string
          fatura_id: string | null
          id: string
          sincronizado_em: string
          status_anterior: string
          status_novo: string
        }
        Insert: {
          asaas_payment_id: string
          fatura_id?: string | null
          id?: string
          sincronizado_em?: string
          status_anterior: string
          status_novo: string
        }
        Update: {
          asaas_payment_id?: string
          fatura_id?: string | null
          id?: string
          sincronizado_em?: string
          status_anterior?: string
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_sync_log_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          asaas_bank_slip_url: string | null
          asaas_barcode: string | null
          asaas_payment_id: string | null
          asaas_pix_image: string | null
          asaas_pix_qrcode: string | null
          asaas_url: string | null
          cliente_id: string
          contrato_financeiro_id: string | null
          contrato_id: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          filial_id: string | null
          forma_pagamento: string | null
          gerado_automaticamente: boolean
          id: string
          numero_fatura: string
          observacoes: string | null
          pedido_id: string | null
          referencia_ano: number | null
          referencia_mes: number | null
          status: string
          tipo: string
          updated_at: string
          valor: number
          valor_desconto: number
          valor_final: number
        }
        Insert: {
          asaas_bank_slip_url?: string | null
          asaas_barcode?: string | null
          asaas_payment_id?: string | null
          asaas_pix_image?: string | null
          asaas_pix_qrcode?: string | null
          asaas_url?: string | null
          cliente_id: string
          contrato_financeiro_id?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          filial_id?: string | null
          forma_pagamento?: string | null
          gerado_automaticamente?: boolean
          id?: string
          numero_fatura?: string
          observacoes?: string | null
          pedido_id?: string | null
          referencia_ano?: number | null
          referencia_mes?: number | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          valor_desconto?: number
          valor_final?: number
        }
        Update: {
          asaas_bank_slip_url?: string | null
          asaas_barcode?: string | null
          asaas_payment_id?: string | null
          asaas_pix_image?: string | null
          asaas_pix_qrcode?: string | null
          asaas_url?: string | null
          cliente_id?: string
          contrato_financeiro_id?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          filial_id?: string | null
          forma_pagamento?: string | null
          gerado_automaticamente?: boolean
          id?: string
          numero_fatura?: string
          observacoes?: string | null
          pedido_id?: string | null
          referencia_ano?: number | null
          referencia_mes?: number | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          valor_desconto?: number
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          assinatura_url: string | null
          ativa: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          etapa_inicial_id: string | null
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          logradouro: string | null
          nome: string
          numero: string | null
          razao_social: string | null
          responsavel: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          assinatura_url?: string | null
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          etapa_inicial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome: string
          numero?: string | null
          razao_social?: string | null
          responsavel?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          assinatura_url?: string | null
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          etapa_inicial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome?: string
          numero?: string | null
          razao_social?: string | null
          responsavel?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filiais_etapa_inicial_id_fkey"
            columns: ["etapa_inicial_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      filial_parametros: {
        Row: {
          congelar_acao: string
          congelar_etapa_id: string | null
          created_at: string
          filial_id: string
          id: string
          margem_venda_ideal: number
          parcelas_maximas_cartao: number
          pix_desconto_percentual: number
          regras_padrao_implantacao: string | null
          regras_padrao_mensalidade: string | null
          updated_at: string
        }
        Insert: {
          congelar_acao?: string
          congelar_etapa_id?: string | null
          created_at?: string
          filial_id: string
          id?: string
          margem_venda_ideal?: number
          parcelas_maximas_cartao?: number
          pix_desconto_percentual?: number
          regras_padrao_implantacao?: string | null
          regras_padrao_mensalidade?: string | null
          updated_at?: string
        }
        Update: {
          congelar_acao?: string
          congelar_etapa_id?: string | null
          created_at?: string
          filial_id?: string
          id?: string
          margem_venda_ideal?: number
          parcelas_maximas_cartao?: number
          pix_desconto_percentual?: number
          regras_padrao_implantacao?: string | null
          regras_padrao_mensalidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filial_parametros_congelar_etapa_id_fkey"
            columns: ["congelar_etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filial_parametros_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: true
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          contato_nome: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      helpdesk_modelos_ticket: {
        Row: {
          ativo: boolean
          corpo_html: string
          created_at: string
          id: string
          nome: string
          tipo_atendimento_id: string | null
          titulo_padrao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          corpo_html?: string
          created_at?: string
          id?: string
          nome: string
          tipo_atendimento_id?: string | null
          titulo_padrao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          corpo_html?: string
          created_at?: string
          id?: string
          nome?: string
          tipo_atendimento_id?: string | null
          titulo_padrao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_modelos_ticket_tipo_atendimento_id_fkey"
            columns: ["tipo_atendimento_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tipos_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_tags: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      helpdesk_tipos_atendimento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          mesa_padrao: string
          nome: string
          sla_horas: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          mesa_padrao?: string
          nome: string
          sla_horas?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          mesa_padrao?: string
          nome?: string
          sla_horas?: number
          updated_at?: string
        }
        Relationships: []
      }
      integracoes_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          server_url: string | null
          token: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          server_url?: string | null
          token?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          server_url?: string | null
          token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jornada_atividades: {
        Row: {
          checklist: Json
          created_at: string
          descricao: string | null
          etapa_id: string
          horas_estimadas: number
          id: string
          mesa_atendimento_id: string | null
          nome: string
          ordem: number
          tipo_responsabilidade: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          descricao?: string | null
          etapa_id: string
          horas_estimadas?: number
          id?: string
          mesa_atendimento_id?: string | null
          nome: string
          ordem?: number
          tipo_responsabilidade?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          descricao?: string | null
          etapa_id?: string
          horas_estimadas?: number
          id?: string
          mesa_atendimento_id?: string | null
          nome?: string
          ordem?: number
          tipo_responsabilidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jornada_atividades_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "jornada_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornada_atividades_mesa_atendimento_id_fkey"
            columns: ["mesa_atendimento_id"]
            isOneToOne: false
            referencedRelation: "mesas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      jornada_etapas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          jornada_id: string
          mesa_atendimento_id: string | null
          nome: string
          ordem: number
          permite_clonar: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          jornada_id: string
          mesa_atendimento_id?: string | null
          nome: string
          ordem?: number
          permite_clonar?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          jornada_id?: string
          mesa_atendimento_id?: string | null
          nome?: string
          ordem?: number
          permite_clonar?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jornada_etapas_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornada_etapas_mesa_atendimento_id_fkey"
            columns: ["mesa_atendimento_id"]
            isOneToOne: false
            referencedRelation: "mesas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      jornadas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          filial_id: string | null
          id: string
          nome: string
          updated_at: string
          vinculo_id: string
          vinculo_tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          filial_id?: string | null
          id?: string
          nome: string
          updated_at?: string
          vinculo_id: string
          vinculo_tipo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          filial_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
          vinculo_id?: string
          vinculo_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "jornadas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      mesas_atendimento: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          ativo: boolean
          categoria: string
          conteudo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          setor_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          setor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          setor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_contrato: {
        Row: {
          arquivo_docx_url: string | null
          ativo: boolean
          created_at: string
          filial_id: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_docx_url?: string | null
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          arquivo_docx_url?: string | null
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_contrato_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          created_at: string
          fornecedor_id: string | null
          id: string
          nome: string
          permite_revenda: boolean
          quantidade_maxima: number | null
          valor_implantacao_modulo: number | null
          valor_mensalidade_modulo: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome: string
          permite_revenda?: boolean
          quantidade_maxima?: number | null
          valor_implantacao_modulo?: number | null
          valor_mensalidade_modulo?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome?: string
          permite_revenda?: boolean
          quantidade_maxima?: number | null
          valor_implantacao_modulo?: number | null
          valor_mensalidade_modulo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          cliente_id: string
          created_at: string
          data_emissao: string
          fatura_id: string | null
          filial_id: string | null
          id: string
          numero_nf: string
          observacoes: string | null
          pdf_url: string | null
          serie: string | null
          status: string
          updated_at: string
          valor: number
          xml_url: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_emissao?: string
          fatura_id?: string | null
          filial_id?: string | null
          id?: string
          numero_nf: string
          observacoes?: string | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor?: number
          xml_url?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_emissao?: string
          fatura_id?: string | null
          filial_id?: string | null
          id?: string
          numero_nf?: string
          observacoes?: string | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          criado_por: string
          destinatario_role: string | null
          destinatario_user_id: string | null
          id: string
          mensagem: string
          metadata: Json | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          destinatario_role?: string | null
          destinatario_user_id?: string | null
          id?: string
          mensagem: string
          metadata?: Json | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          destinatario_role?: string | null
          destinatario_user_id?: string | null
          id?: string
          mensagem?: string
          metadata?: Json | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes_cobranca_log: {
        Row: {
          canal: string
          cliente_id: string
          enviado_em: string
          fatura_id: string
          id: string
          status_envio: string
          tipo_gatilho: string
        }
        Insert: {
          canal?: string
          cliente_id: string
          enviado_em?: string
          fatura_id: string
          id?: string
          status_envio?: string
          tipo_gatilho: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          enviado_em?: string
          fatura_id?: string
          id?: string
          status_envio?: string
          tipo_gatilho?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_cobranca_log_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_lidas: {
        Row: {
          id: string
          lido_em: string
          notificacao_id: string
          user_id: string
        }
        Insert: {
          id?: string
          lido_em?: string
          notificacao_id: string
          user_id: string
        }
        Update: {
          id?: string
          lido_em?: string
          notificacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_lidas_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_agendamentos: {
        Row: {
          atividade_id: string | null
          card_id: string | null
          checklist_index: number
          cor_evento: string | null
          created_at: string
          criado_por: string | null
          data: string
          etapa_execucao_id: string | null
          etapa_id: string | null
          filial_id: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          iniciado_em: string | null
          iniciado_por: string | null
          mesa_id: string | null
          observacao: string | null
          origem: string
          status: string
          ticket_id: string | null
          titulo: string | null
        }
        Insert: {
          atividade_id?: string | null
          card_id?: string | null
          checklist_index: number
          cor_evento?: string | null
          created_at?: string
          criado_por?: string | null
          data: string
          etapa_execucao_id?: string | null
          etapa_id?: string | null
          filial_id?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          mesa_id?: string | null
          observacao?: string | null
          origem?: string
          status?: string
          ticket_id?: string | null
          titulo?: string | null
        }
        Update: {
          atividade_id?: string | null
          card_id?: string | null
          checklist_index?: number
          cor_evento?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          etapa_execucao_id?: string | null
          etapa_id?: string | null
          filial_id?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          mesa_id?: string | null
          observacao?: string | null
          origem?: string
          status?: string
          ticket_id?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "painel_agendamentos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "jornada_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_etapa_execucao_id_fkey"
            columns: ["etapa_execucao_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_agendamentos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_alertas_enviados: {
        Row: {
          alerta_id: string
          canal: string
          card_id: string
          detalhes: Json
          enviado_em: string
          id: string
          nivel: number
        }
        Insert: {
          alerta_id: string
          canal: string
          card_id: string
          detalhes?: Json
          enviado_em?: string
          id?: string
          nivel: number
        }
        Update: {
          alerta_id?: string
          canal?: string
          card_id?: string
          detalhes?: Json
          enviado_em?: string
          id?: string
          nivel?: number
        }
        Relationships: [
          {
            foreignKeyName: "painel_alertas_enviados_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "painel_etapa_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_alertas_enviados_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_apontamentos: {
        Row: {
          apontado_por: string
          card_id: string
          created_at: string
          id: string
          motivo: string | null
          usuario_id: string
        }
        Insert: {
          apontado_por: string
          card_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          usuario_id: string
        }
        Update: {
          apontado_por?: string
          card_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_apontamentos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_apontamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_atendimento: {
        Row: {
          aponta_tecnico_agenda: boolean
          cliente_id: string
          comentario: string | null
          contrato_id: string
          created_at: string
          etapa_id: string
          etapa_origem_id: string | null
          filial_id: string
          id: string
          iniciado_em: string | null
          iniciado_por: string | null
          jornada_id: string | null
          observacoes: string | null
          pausado: boolean
          pausado_em: string | null
          pausado_motivo: string | null
          pausado_por: string | null
          pedido_id: string | null
          plano_id: string | null
          responsavel_id: string | null
          sla_horas: number
          status_projeto: string
          tipo_atendimento_local: string | null
          tipo_operacao: string
          updated_at: string
        }
        Insert: {
          aponta_tecnico_agenda?: boolean
          cliente_id: string
          comentario?: string | null
          contrato_id: string
          created_at?: string
          etapa_id: string
          etapa_origem_id?: string | null
          filial_id: string
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          jornada_id?: string | null
          observacoes?: string | null
          pausado?: boolean
          pausado_em?: string | null
          pausado_motivo?: string | null
          pausado_por?: string | null
          pedido_id?: string | null
          plano_id?: string | null
          responsavel_id?: string | null
          sla_horas?: number
          status_projeto?: string
          tipo_atendimento_local?: string | null
          tipo_operacao: string
          updated_at?: string
        }
        Update: {
          aponta_tecnico_agenda?: boolean
          cliente_id?: string
          comentario?: string | null
          contrato_id?: string
          created_at?: string
          etapa_id?: string
          etapa_origem_id?: string | null
          filial_id?: string
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          jornada_id?: string | null
          observacoes?: string | null
          pausado?: boolean
          pausado_em?: string | null
          pausado_motivo?: string | null
          pausado_por?: string | null
          pedido_id?: string | null
          plano_id?: string | null
          responsavel_id?: string | null
          sla_horas?: number
          status_projeto?: string
          tipo_atendimento_local?: string | null
          tipo_operacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_atendimento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atendimento_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_atividade_execucao: {
        Row: {
          atividade_id: string | null
          card_id: string
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          etapa_id: string | null
          finalizado_em_atraso: boolean | null
          id: string
          iniciado_em: string | null
          iniciado_por: string | null
          status: string
          updated_at: string
        }
        Insert: {
          atividade_id?: string | null
          card_id: string
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          etapa_id?: string | null
          finalizado_em_atraso?: boolean | null
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          atividade_id?: string | null
          card_id?: string
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          etapa_id?: string | null
          finalizado_em_atraso?: boolean | null
          id?: string
          iniciado_em?: string | null
          iniciado_por?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_atividade_execucao_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "jornada_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atividade_execucao_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_atividade_execucao_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_checklist_progresso: {
        Row: {
          atividade_id: string | null
          card_id: string
          checklist_index: number
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          id: string
          updated_at: string
          valor_data: string | null
          valor_texto: string | null
        }
        Insert: {
          atividade_id?: string | null
          card_id: string
          checklist_index: number
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          valor_data?: string | null
          valor_texto?: string | null
        }
        Update: {
          atividade_id?: string | null
          card_id?: string
          checklist_index?: number
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          valor_data?: string | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "painel_checklist_progresso_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "jornada_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_checklist_progresso_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_comentarios: {
        Row: {
          card_id: string
          created_at: string
          criado_por: string
          etapa_id: string | null
          id: string
          parent_id: string | null
          texto: string
        }
        Insert: {
          card_id: string
          created_at?: string
          criado_por: string
          etapa_id?: string | null
          id?: string
          parent_id?: string | null
          texto: string
        }
        Update: {
          card_id?: string
          created_at?: string
          criado_por?: string
          etapa_id?: string | null
          id?: string
          parent_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_comentarios_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_comentarios_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "painel_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_curtidas: {
        Row: {
          comentario_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comentario_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comentario_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_curtidas_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "painel_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_etapa_alertas: {
        Row: {
          ativo: boolean
          canal: string
          created_at: string
          etapa_id: string
          filial_id: string | null
          horas_apos_sla: number
          id: string
          nivel: number
          notificar_vendedor: boolean
          template_id: string | null
          updated_at: string
          usuario_ids: string[] | null
        }
        Insert: {
          ativo?: boolean
          canal?: string
          created_at?: string
          etapa_id: string
          filial_id?: string | null
          horas_apos_sla?: number
          id?: string
          nivel?: number
          notificar_vendedor?: boolean
          template_id?: string | null
          updated_at?: string
          usuario_ids?: string[] | null
        }
        Update: {
          ativo?: boolean
          canal?: string
          created_at?: string
          etapa_id?: string
          filial_id?: string | null
          horas_apos_sla?: number
          id?: string
          nivel?: number
          notificar_vendedor?: boolean
          template_id?: string | null
          updated_at?: string
          usuario_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "painel_etapa_alertas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_etapa_alertas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_etapa_alertas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_etapas: {
        Row: {
          alerta_notificacoes: boolean
          alerta_notificacoes_template_id: string | null
          alerta_notificacoes_usuario_id: string | null
          alerta_whatsapp: boolean
          alerta_whatsapp_template_id: string | null
          alerta_whatsapp_usuario_id: string | null
          ativo: boolean
          controla_sla: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          ordem_entrada: string
          prazo_maximo_horas: number | null
          updated_at: string
        }
        Insert: {
          alerta_notificacoes?: boolean
          alerta_notificacoes_template_id?: string | null
          alerta_notificacoes_usuario_id?: string | null
          alerta_whatsapp?: boolean
          alerta_whatsapp_template_id?: string | null
          alerta_whatsapp_usuario_id?: string | null
          ativo?: boolean
          controla_sla?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          ordem_entrada?: string
          prazo_maximo_horas?: number | null
          updated_at?: string
        }
        Update: {
          alerta_notificacoes?: boolean
          alerta_notificacoes_template_id?: string | null
          alerta_notificacoes_usuario_id?: string | null
          alerta_whatsapp?: boolean
          alerta_whatsapp_template_id?: string | null
          alerta_whatsapp_usuario_id?: string | null
          ativo?: boolean
          controla_sla?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          ordem_entrada?: string
          prazo_maximo_horas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_etapas_alerta_notificacoes_template_id_fkey"
            columns: ["alerta_notificacoes_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_etapas_alerta_notificacoes_usuario_id_fkey"
            columns: ["alerta_notificacoes_usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_etapas_alerta_whatsapp_template_id_fkey"
            columns: ["alerta_whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_etapas_alerta_whatsapp_usuario_id_fkey"
            columns: ["alerta_whatsapp_usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_historico_etapas: {
        Row: {
          atraso_inicio_horas: number | null
          card_id: string
          created_at: string
          entrada_em: string
          etapa_id: string
          etapa_nome: string
          id: string
          saida_em: string | null
          sla_cumprido: boolean | null
          sla_previsto_horas: number | null
          tempo_real_horas: number | null
          usuario_id: string | null
        }
        Insert: {
          atraso_inicio_horas?: number | null
          card_id: string
          created_at?: string
          entrada_em?: string
          etapa_id: string
          etapa_nome: string
          id?: string
          saida_em?: string | null
          sla_cumprido?: boolean | null
          sla_previsto_horas?: number | null
          tempo_real_horas?: number | null
          usuario_id?: string | null
        }
        Update: {
          atraso_inicio_horas?: number | null
          card_id?: string
          created_at?: string
          entrada_em?: string
          etapa_id?: string
          etapa_nome?: string
          id?: string
          saida_em?: string | null
          sla_cumprido?: boolean | null
          sla_previsto_horas?: number | null
          tempo_real_horas?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "painel_historico_etapas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_historico_etapas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "painel_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_mencoes: {
        Row: {
          card_id: string
          comentario_id: string
          created_at: string
          id: string
          lido: boolean
          mencionado_por: string
          mencionado_user_id: string
        }
        Insert: {
          card_id: string
          comentario_id: string
          created_at?: string
          id?: string
          lido?: boolean
          mencionado_por: string
          mencionado_user_id: string
        }
        Update: {
          card_id?: string
          comentario_id?: string
          created_at?: string
          id?: string
          lido?: boolean
          mencionado_por?: string
          mencionado_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_mencoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_mencoes_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "painel_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_seguidores: {
        Row: {
          card_id: string
          created_at: string
          id: string
          unfollowed_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          unfollowed_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          unfollowed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_seguidores_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      painel_tecnicos: {
        Row: {
          card_id: string
          created_at: string
          id: string
          tecnico_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          tecnico_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          tecnico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painel_tecnicos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "painel_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "painel_tecnicos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_implantacao: {
        Row: {
          contrato_financeiro_id: string
          contrato_origem_id: string | null
          created_at: string
          descricao: string
          id: string
          numero_parcelas: number
          observacao: string | null
          parcelas_pagas: number
          status: string
          valor_por_parcela: number
          valor_total: number
        }
        Insert: {
          contrato_financeiro_id: string
          contrato_origem_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          numero_parcelas?: number
          observacao?: string | null
          parcelas_pagas?: number
          status?: string
          valor_por_parcela?: number
          valor_total?: number
        }
        Update: {
          contrato_financeiro_id?: string
          contrato_origem_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          numero_parcelas?: number
          observacao?: string | null
          parcelas_pagas?: number
          status?: string
          valor_por_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_implantacao_contrato_financeiro_id_fkey"
            columns: ["contrato_financeiro_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_implantacao_contrato_origem_id_fkey"
            columns: ["contrato_origem_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_comentarios: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          created_at: string
          id: string
          parent_id: string | null
          pedido_id: string
          prioridade: string
          texto: string
          user_id: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          pedido_id: string
          prioridade?: string
          texto: string
          user_id: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          pedido_id?: string
          prioridade?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pedido_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_comentarios_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_curtidas: {
        Row: {
          comentario_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comentario_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comentario_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_curtidas_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "pedido_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          acrescimo_implantacao_tipo: string
          acrescimo_implantacao_valor: number
          acrescimo_mensalidade_tipo: string
          acrescimo_mensalidade_valor: number
          cliente_id: string
          comissao_implantacao_percentual: number | null
          comissao_implantacao_valor: number | null
          comissao_mensalidade_percentual: number | null
          comissao_mensalidade_valor: number | null
          comissao_percentual: number
          comissao_servico_percentual: number | null
          comissao_servico_valor: number | null
          comissao_valor: number
          contrato_id: string | null
          contrato_liberado: boolean
          created_at: string
          data_entrada_fila: string | null
          desconto_implantacao_tipo: string
          desconto_implantacao_valor: number
          desconto_mensalidade_tipo: string
          desconto_mensalidade_valor: number
          dia_mensalidade: number | null
          filial_id: string
          financeiro_aprovado_em: string | null
          financeiro_aprovado_por: string | null
          financeiro_motivo: string | null
          financeiro_status: string
          id: string
          modulos_adicionais: Json | null
          motivo_desconto: string | null
          numero_exibicao: string
          numero_registro: number
          observacoes: string | null
          pagamento_implantacao_desconto_percentual: number | null
          pagamento_implantacao_forma: string | null
          pagamento_implantacao_observacao: string | null
          pagamento_implantacao_parcelas: number | null
          pagamento_mensalidade_desconto_percentual: number | null
          pagamento_mensalidade_forma: string | null
          pagamento_mensalidade_observacao: string | null
          pagamento_mensalidade_parcelas: number | null
          plano_id: string
          segmento_id: string | null
          servicos_pedido: Json | null
          status_pedido: string
          tipo_atendimento: string | null
          tipo_pedido: string
          updated_at: string
          valor_implantacao: number
          valor_implantacao_final: number
          valor_implantacao_original: number
          valor_mensalidade: number
          valor_mensalidade_final: number
          valor_mensalidade_original: number
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          acrescimo_implantacao_tipo?: string
          acrescimo_implantacao_valor?: number
          acrescimo_mensalidade_tipo?: string
          acrescimo_mensalidade_valor?: number
          cliente_id: string
          comissao_implantacao_percentual?: number | null
          comissao_implantacao_valor?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_mensalidade_valor?: number | null
          comissao_percentual?: number
          comissao_servico_percentual?: number | null
          comissao_servico_valor?: number | null
          comissao_valor?: number
          contrato_id?: string | null
          contrato_liberado?: boolean
          created_at?: string
          data_entrada_fila?: string | null
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          dia_mensalidade?: number | null
          filial_id: string
          financeiro_aprovado_em?: string | null
          financeiro_aprovado_por?: string | null
          financeiro_motivo?: string | null
          financeiro_status?: string
          id?: string
          modulos_adicionais?: Json | null
          motivo_desconto?: string | null
          numero_exibicao?: string
          numero_registro?: number
          observacoes?: string | null
          pagamento_implantacao_desconto_percentual?: number | null
          pagamento_implantacao_forma?: string | null
          pagamento_implantacao_observacao?: string | null
          pagamento_implantacao_parcelas?: number | null
          pagamento_mensalidade_desconto_percentual?: number | null
          pagamento_mensalidade_forma?: string | null
          pagamento_mensalidade_observacao?: string | null
          pagamento_mensalidade_parcelas?: number | null
          plano_id: string
          segmento_id?: string | null
          servicos_pedido?: Json | null
          status_pedido?: string
          tipo_atendimento?: string | null
          tipo_pedido?: string
          updated_at?: string
          valor_implantacao?: number
          valor_implantacao_final?: number
          valor_implantacao_original?: number
          valor_mensalidade?: number
          valor_mensalidade_final?: number
          valor_mensalidade_original?: number
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          acrescimo_implantacao_tipo?: string
          acrescimo_implantacao_valor?: number
          acrescimo_mensalidade_tipo?: string
          acrescimo_mensalidade_valor?: number
          cliente_id?: string
          comissao_implantacao_percentual?: number | null
          comissao_implantacao_valor?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_mensalidade_valor?: number | null
          comissao_percentual?: number
          comissao_servico_percentual?: number | null
          comissao_servico_valor?: number | null
          comissao_valor?: number
          contrato_id?: string | null
          contrato_liberado?: boolean
          created_at?: string
          data_entrada_fila?: string | null
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          dia_mensalidade?: number | null
          filial_id?: string
          financeiro_aprovado_em?: string | null
          financeiro_aprovado_por?: string | null
          financeiro_motivo?: string | null
          financeiro_status?: string
          id?: string
          modulos_adicionais?: Json | null
          motivo_desconto?: string | null
          numero_exibicao?: string
          numero_registro?: number
          observacoes?: string | null
          pagamento_implantacao_desconto_percentual?: number | null
          pagamento_implantacao_forma?: string | null
          pagamento_implantacao_observacao?: string | null
          pagamento_implantacao_parcelas?: number | null
          pagamento_mensalidade_desconto_percentual?: number | null
          pagamento_mensalidade_forma?: string | null
          pagamento_mensalidade_observacao?: string | null
          pagamento_mensalidade_parcelas?: number | null
          plano_id?: string
          segmento_id?: string | null
          servicos_pedido?: Json | null
          status_pedido?: string
          tipo_atendimento?: string | null
          tipo_pedido?: string
          updated_at?: string
          valor_implantacao?: number
          valor_implantacao_final?: number
          valor_implantacao_original?: number
          valor_mensalidade?: number
          valor_mensalidade_final?: number
          valor_mensalidade_original?: number
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_modulos: {
        Row: {
          duracao_minutos: number | null
          id: string
          inclui_treinamento: boolean
          incluso_no_plano: boolean
          modulo_id: string
          obrigatorio: boolean
          ordem: number
          plano_id: string
        }
        Insert: {
          duracao_minutos?: number | null
          id?: string
          inclui_treinamento?: boolean
          incluso_no_plano?: boolean
          modulo_id: string
          obrigatorio?: boolean
          ordem?: number
          plano_id: string
        }
        Update: {
          duracao_minutos?: number | null
          id?: string
          inclui_treinamento?: boolean
          incluso_no_plano?: boolean
          modulo_id?: string
          obrigatorio?: boolean
          ordem?: number
          plano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_modulos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          ordem: number
          valor_implantacao_padrao: number
          valor_mensalidade_padrao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          ordem?: number
          valor_implantacao_padrao?: number
          valor_mensalidade_padrao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          ordem?: number
          valor_implantacao_padrao?: number
          valor_mensalidade_padrao?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      precos_filial: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          referencia_id: string
          tipo: string
          updated_at: string
          valor_implantacao: number
          valor_mensalidade: number
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          referencia_id: string
          tipo: string
          updated_at?: string
          valor_implantacao?: number
          valor_mensalidade?: number
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          referencia_id?: string
          tipo?: string
          updated_at?: string
          valor_implantacao?: number
          valor_mensalidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "precos_filial_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso_global: boolean
          active: boolean
          avatar_url: string | null
          comissao_implantacao_percentual: number | null
          comissao_mensalidade_percentual: number | null
          comissao_percentual: number | null
          comissao_servico_percentual: number | null
          created_at: string
          desconto_limite_implantacao: number | null
          desconto_limite_mensalidade: number | null
          deve_trocar_senha: boolean
          email: string
          filial: string | null
          filial_favorita_id: string | null
          filial_id: string | null
          full_name: string
          funil_favorito_id: string | null
          gestor_desconto: boolean | null
          id: string
          is_tecnico: boolean
          is_vendedor: boolean
          mesa_favorita_id: string | null
          permite_cancelar_projeto: boolean
          permite_enviar_espelho_whatsapp: boolean
          permite_resetar_projeto: boolean
          permite_ver_valores_projeto: boolean
          permitir_cnpj_duplicado: boolean | null
          recebe_comissao: boolean
          telefone: string | null
          tipo_tecnico: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acesso_global?: boolean
          active?: boolean
          avatar_url?: string | null
          comissao_implantacao_percentual?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_percentual?: number | null
          comissao_servico_percentual?: number | null
          created_at?: string
          desconto_limite_implantacao?: number | null
          desconto_limite_mensalidade?: number | null
          deve_trocar_senha?: boolean
          email: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name: string
          funil_favorito_id?: string | null
          gestor_desconto?: boolean | null
          id?: string
          is_tecnico?: boolean
          is_vendedor?: boolean
          mesa_favorita_id?: string | null
          permite_cancelar_projeto?: boolean
          permite_enviar_espelho_whatsapp?: boolean
          permite_resetar_projeto?: boolean
          permite_ver_valores_projeto?: boolean
          permitir_cnpj_duplicado?: boolean | null
          recebe_comissao?: boolean
          telefone?: string | null
          tipo_tecnico?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acesso_global?: boolean
          active?: boolean
          avatar_url?: string | null
          comissao_implantacao_percentual?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_percentual?: number | null
          comissao_servico_percentual?: number | null
          created_at?: string
          desconto_limite_implantacao?: number | null
          desconto_limite_mensalidade?: number | null
          deve_trocar_senha?: boolean
          email?: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name?: string
          funil_favorito_id?: string | null
          gestor_desconto?: boolean | null
          id?: string
          is_tecnico?: boolean
          is_vendedor?: boolean
          mesa_favorita_id?: string | null
          permite_cancelar_projeto?: boolean
          permite_enviar_espelho_whatsapp?: boolean
          permite_resetar_projeto?: boolean
          permite_ver_valores_projeto?: boolean
          permitir_cnpj_duplicado?: boolean | null
          recebe_comissao?: boolean
          telefone?: string | null
          tipo_tecnico?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_filial_favorita_id_fkey"
            columns: ["filial_favorita_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_funil_favorito_id_fkey"
            columns: ["funil_favorito_id"]
            isOneToOne: false
            referencedRelation: "crm_funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_mesa_favorita_id_fkey"
            columns: ["mesa_favorita_id"]
            isOneToOne: false
            referencedRelation: "mesas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos_cancelados: {
        Row: {
          cancelado_em: string
          cancelado_por: string
          card_id: string
          cliente_id: string
          cliente_nome: string | null
          contrato_id: string
          contrato_numero: string | null
          created_at: string
          filial_id: string
          id: string
          motivo: string
          plano_nome: string | null
          tipo_operacao: string | null
        }
        Insert: {
          cancelado_em?: string
          cancelado_por: string
          card_id: string
          cliente_id: string
          cliente_nome?: string | null
          contrato_id: string
          contrato_numero?: string | null
          created_at?: string
          filial_id: string
          id?: string
          motivo: string
          plano_nome?: string | null
          tipo_operacao?: string | null
        }
        Update: {
          cancelado_em?: string
          cancelado_por?: string
          card_id?: string
          cliente_id?: string
          cliente_nome?: string | null
          contrato_id?: string
          contrato_numero?: string | null
          created_at?: string
          filial_id?: string
          id?: string
          motivo?: string
          plano_nome?: string | null
          tipo_operacao?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          permissao: string
          role: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          permissao: string
          role: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          permissao?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      segmentos: {
        Row: {
          ativo: boolean
          created_at: string
          filial_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmentos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unidade_medida: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unidade_medida?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unidade_medida?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          instance_name: string | null
          nome: string
          telefone: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          instance_name?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          instance_name?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      solicitacoes_desconto: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          desconto_implantacao_percentual: number
          desconto_implantacao_tipo: string
          desconto_implantacao_valor: number
          desconto_mensalidade_percentual: number
          desconto_mensalidade_tipo: string
          desconto_mensalidade_valor: number
          id: string
          motivo_reprovacao: string | null
          observacoes: string | null
          pedido_id: string
          status: string
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          desconto_implantacao_percentual?: number
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_percentual?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          id?: string
          motivo_reprovacao?: string | null
          observacoes?: string | null
          pedido_id: string
          status?: string
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          desconto_implantacao_percentual?: number
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_percentual?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          id?: string
          motivo_reprovacao?: string | null
          observacoes?: string | null
          pedido_id?: string
          status?: string
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_desconto_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      template_clauses: {
        Row: {
          ativo: boolean
          clause_id: string | null
          conteudo_html: string
          created_at: string
          id: string
          ordem: number
          template_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clause_id?: string | null
          conteudo_html?: string
          created_at?: string
          id?: string
          ordem?: number
          template_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clause_id?: string | null
          conteudo_html?: string
          created_at?: string
          id?: string
          ordem?: number
          template_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_clauses_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "contract_clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clauses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_anexos: {
        Row: {
          comentario_id: string | null
          created_at: string
          id: string
          nome: string
          tamanho_bytes: number | null
          ticket_id: string
          tipo_mime: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          comentario_id?: string | null
          created_at?: string
          id?: string
          nome: string
          tamanho_bytes?: number | null
          ticket_id: string
          tipo_mime?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          comentario_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          tamanho_bytes?: number | null
          ticket_id?: string
          tipo_mime?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_anexos_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "ticket_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_anexos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comentarios: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          metadata: Json | null
          parent_id: string | null
          ticket_id: string
          tipo: string
          user_id: string | null
          visibilidade: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          ticket_id: string
          tipo?: string
          user_id?: string | null
          visibilidade?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          ticket_id?: string
          tipo?: string
          user_id?: string | null
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ticket_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comentarios_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comentarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ticket_curtidas: {
        Row: {
          comentario_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comentario_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comentario_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_curtidas_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "ticket_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_seguidores: {
        Row: {
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_seguidores_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_seguidores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ticket_vinculos: {
        Row: {
          created_at: string
          id: string
          ticket_id: string
          ticket_vinculado_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ticket_id: string
          ticket_vinculado_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ticket_id?: string
          ticket_vinculado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_vinculos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_vinculos_ticket_vinculado_id_fkey"
            columns: ["ticket_vinculado_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          criado_por: string | null
          descricao_html: string
          id: string
          mesa: string
          modo: string
          numero_exibicao: string
          numero_registro: number
          previsao_entrega: string | null
          prioridade: string
          responsavel_id: string | null
          sla_deadline: string | null
          sla_horas: number
          status: string
          tags: string[] | null
          ticket_pai_id: string | null
          tipo_atendimento_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao_html?: string
          id?: string
          mesa?: string
          modo?: string
          numero_exibicao?: string
          numero_registro?: number
          previsao_entrega?: string | null
          prioridade?: string
          responsavel_id?: string | null
          sla_deadline?: string | null
          sla_horas?: number
          status?: string
          tags?: string[] | null
          ticket_pai_id?: string | null
          tipo_atendimento_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao_html?: string
          id?: string
          mesa?: string
          modo?: string
          numero_exibicao?: string
          numero_registro?: number
          previsao_entrega?: string | null
          prioridade?: string
          responsavel_id?: string | null
          sla_deadline?: string | null
          sla_horas?: number
          status?: string
          tags?: string[] | null
          ticket_pai_id?: string | null
          tipo_atendimento_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_pai_id_fkey"
            columns: ["ticket_pai_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tipo_atendimento_id_fkey"
            columns: ["tipo_atendimento_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tipos_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_filiais: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_filiais_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_mesas: {
        Row: {
          created_at: string
          id: string
          mesa_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mesa_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mesa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_mesas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          id: string
          ip_address: string | null
          payload: Json | null
          processed_at: string
          source: string
        }
        Insert: {
          event_id: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          processed_at?: string
          source: string
        }
        Update: {
          event_id?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_login_blocked: { Args: { p_email: string }; Returns: boolean }
      get_cron_secret: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      record_login_attempt: {
        Args: { p_email: string; p_ip?: string; p_success: boolean }
        Returns: undefined
      }
      user_has_filial_access: { Args: { _filial_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "financeiro"
        | "vendedor"
        | "operacional"
        | "tecnico"
        | "gestor"
      desconto_tipo: "R$" | "%"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "financeiro",
        "vendedor",
        "operacional",
        "tecnico",
        "gestor",
      ],
      desconto_tipo: ["R$", "%"],
    },
  },
} as const
