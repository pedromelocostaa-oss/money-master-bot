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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cartoes: {
        Row: {
          bandeira: string | null
          conta_id: string | null
          cor: string | null
          created_at: string
          dia_fechamento: number | null
          dia_vencimento: number | null
          id: string
          limite: number | null
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bandeira?: string | null
          conta_id?: string | null
          cor?: string | null
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          limite?: number | null
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bandeira?: string | null
          conta_id?: string | null
          cor?: string | null
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          limite?: number | null
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          nome: string
          saldo_inicial: number
          tipo: Database["public"]["Enums"]["tipo_conta"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          saldo_inicial?: number
          tipo: Database["public"]["Enums"]["tipo_conta"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          tipo?: Database["public"]["Enums"]["tipo_conta"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dividas: {
        Row: {
          created_at: string
          data_vencimento: string
          descricao: string | null
          id: string
          nome: string
          pago: boolean
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          descricao?: string | null
          id?: string
          nome: string
          pago?: boolean
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          descricao?: string | null
          id?: string
          nome?: string
          pago?: boolean
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      limites_categoria: {
        Row: {
          categoria: string
          id: string
          limite_mensal: number
          user_id: string
        }
        Insert: {
          categoria: string
          id?: string
          limite_mensal: number
          user_id: string
        }
        Update: {
          categoria?: string
          id?: string
          limite_mensal?: number
          user_id?: string
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          cartao_id: string | null
          categoria: string
          conta_id: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string | null
          id: string
          parcela_atual: number | null
          parcelas_total: number | null
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          user_id: string
          valor: number
        }
        Insert: {
          cartao_id?: string | null
          categoria: string
          conta_id?: string | null
          created_at?: string
          data: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          parcela_atual?: number | null
          parcelas_total?: number | null
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          user_id: string
          valor: number
        }
        Update: {
          cartao_id?: string | null
          categoria?: string
          conta_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          parcela_atual?: number | null
          parcelas_total?: number | null
          tipo?: Database["public"]["Enums"]["tipo_transacao"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tipo_conta: "pessoal" | "pj"
      tipo_transacao: "gasto" | "receita"
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
      tipo_conta: ["pessoal", "pj"],
      tipo_transacao: ["gasto", "receita"],
    },
  },
} as const
