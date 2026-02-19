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
      filiais: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          nome?: string
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
          email: string
          filial: string | null
          filial_favorita_id: string | null
          filial_id: string | null
          full_name: string
          gestor_desconto: boolean | null
          id: string
          permitir_cnpj_duplicado: boolean | null
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
          email: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name: string
          gestor_desconto?: boolean | null
          id?: string
          permitir_cnpj_duplicado?: boolean | null
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
          email?: string
          filial?: string | null
          filial_favorita_id?: string | null
          filial_id?: string | null
          full_name?: string
          gestor_desconto?: boolean | null
          id?: string
          permitir_cnpj_duplicado?: boolean | null
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
