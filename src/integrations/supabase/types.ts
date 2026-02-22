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
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          contato_nome: string | null
          created_at: string
          email: string | null
          filial_id: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          razao_social: string | null
          telefone: string | null
          uf: string | null
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
          filial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
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
          filial_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
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
      filiais: {
        Row: {
          ativa: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
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
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
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
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
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
        Relationships: []
      }
      filial_parametros: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          parcelas_maximas_cartao: number
          pix_desconto_percentual: number
          regras_padrao_implantacao: string | null
          regras_padrao_mensalidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          parcelas_maximas_cartao?: number
          pix_desconto_percentual?: number
          regras_padrao_implantacao?: string | null
          regras_padrao_mensalidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          parcelas_maximas_cartao?: number
          pix_desconto_percentual?: number
          regras_padrao_implantacao?: string | null
          regras_padrao_mensalidade?: string | null
          updated_at?: string
        }
        Relationships: [
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
      mesas_atendimento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
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
          tipo?: string
          updated_at?: string
        }
        Relationships: []
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
          id: string
          nome: string
          valor_implantacao_modulo: number | null
          valor_mensalidade_modulo: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          valor_implantacao_modulo?: number | null
          valor_mensalidade_modulo?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          valor_implantacao_modulo?: number | null
          valor_mensalidade_modulo?: number | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          criado_por: string
          destinatario_role: string | null
          destinatario_user_id: string | null
          id: string
          mensagem: string
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
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
      pedidos: {
        Row: {
          cliente_id: string
          comissao_implantacao_percentual: number | null
          comissao_implantacao_valor: number | null
          comissao_mensalidade_percentual: number | null
          comissao_mensalidade_valor: number | null
          comissao_percentual: number
          comissao_valor: number
          contrato_id: string | null
          contrato_liberado: boolean
          created_at: string
          desconto_implantacao_tipo: string
          desconto_implantacao_valor: number
          desconto_mensalidade_tipo: string
          desconto_mensalidade_valor: number
          filial_id: string
          financeiro_aprovado_em: string | null
          financeiro_aprovado_por: string | null
          financeiro_motivo: string | null
          financeiro_status: string
          id: string
          modulos_adicionais: Json | null
          motivo_desconto: string | null
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
          servicos_pedido: Json | null
          status_pedido: string
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
          cliente_id: string
          comissao_implantacao_percentual?: number | null
          comissao_implantacao_valor?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_mensalidade_valor?: number | null
          comissao_percentual?: number
          comissao_valor?: number
          contrato_id?: string | null
          contrato_liberado?: boolean
          created_at?: string
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          filial_id: string
          financeiro_aprovado_em?: string | null
          financeiro_aprovado_por?: string | null
          financeiro_motivo?: string | null
          financeiro_status?: string
          id?: string
          modulos_adicionais?: Json | null
          motivo_desconto?: string | null
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
          servicos_pedido?: Json | null
          status_pedido?: string
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
          cliente_id?: string
          comissao_implantacao_percentual?: number | null
          comissao_implantacao_valor?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_mensalidade_valor?: number | null
          comissao_percentual?: number
          comissao_valor?: number
          contrato_id?: string | null
          contrato_liberado?: boolean
          created_at?: string
          desconto_implantacao_tipo?: string
          desconto_implantacao_valor?: number
          desconto_mensalidade_tipo?: string
          desconto_mensalidade_valor?: number
          filial_id?: string
          financeiro_aprovado_em?: string | null
          financeiro_aprovado_por?: string | null
          financeiro_motivo?: string | null
          financeiro_status?: string
          id?: string
          modulos_adicionais?: Json | null
          motivo_desconto?: string | null
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
          servicos_pedido?: Json | null
          status_pedido?: string
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
          id: string
          nome: string
          valor_implantacao_padrao: number
          valor_mensalidade_padrao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          valor_implantacao_padrao?: number
          valor_mensalidade_padrao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          valor_implantacao_padrao?: number
          valor_mensalidade_padrao?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          comissao_implantacao_percentual: number | null
          comissao_mensalidade_percentual: number | null
          comissao_percentual: number | null
          created_at: string
          desconto_limite_implantacao: number | null
          desconto_limite_mensalidade: number | null
          deve_trocar_senha: boolean
          email: string
          filial: string | null
          filial_favorita_id: string | null
          filial_id: string | null
          full_name: string
          gestor_desconto: boolean | null
          id: string
          permitir_cnpj_duplicado: boolean | null
          recebe_comissao: boolean
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          comissao_implantacao_percentual?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_percentual?: number | null
          created_at?: string
          desconto_limite_implantacao?: number | null
          desconto_limite_mensalidade?: number | null
          deve_trocar_senha?: boolean
          email: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name: string
          gestor_desconto?: boolean | null
          id?: string
          permitir_cnpj_duplicado?: boolean | null
          recebe_comissao?: boolean
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          comissao_implantacao_percentual?: number | null
          comissao_mensalidade_percentual?: number | null
          comissao_percentual?: number | null
          created_at?: string
          desconto_limite_implantacao?: number | null
          desconto_limite_mensalidade?: number | null
          deve_trocar_senha?: boolean
          email?: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name?: string
          gestor_desconto?: boolean | null
          id?: string
          permitir_cnpj_duplicado?: boolean | null
          recebe_comissao?: boolean
          telefone?: string | null
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
        ]
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
            isOneToOne: false
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "vendedor" | "operacional" | "tecnico"
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
      app_role: ["admin", "financeiro", "vendedor", "operacional", "tecnico"],
      desconto_tipo: ["R$", "%"],
    },
  },
} as const
