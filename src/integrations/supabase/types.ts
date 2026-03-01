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
      painel_agendamentos: {
        Row: {
          atividade_id: string
          card_id: string
          checklist_index: number
          created_at: string
          criado_por: string | null
          data: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          observacao: string | null
        }
        Insert: {
          atividade_id: string
          card_id: string
          checklist_index: number
          created_at?: string
          criado_por?: string | null
          data: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          observacao?: string | null
        }
        Update: {
          atividade_id?: string
          card_id?: string
          checklist_index?: number
          created_at?: string
          criado_por?: string | null
          data?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          observacao?: string | null
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
      painel_checklist_progresso: {
        Row: {
          atividade_id: string
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
          atividade_id: string
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
          atividade_id?: string
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
      pedidos: {
        Row: {
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
          gestor_desconto: boolean | null
          id: string
          is_tecnico: boolean
          is_vendedor: boolean
          permite_enviar_espelho_whatsapp: boolean
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
          gestor_desconto?: boolean | null
          id?: string
          is_tecnico?: boolean
          is_vendedor?: boolean
          permite_enviar_espelho_whatsapp?: boolean
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
          gestor_desconto?: boolean | null
          id?: string
          is_tecnico?: boolean
          is_vendedor?: boolean
          permite_enviar_espelho_whatsapp?: boolean
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
