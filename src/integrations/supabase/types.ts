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
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      empresa_usuario: {
        Row: {
          condiciones_generales: string | null
          created_at: string
          empresa_cif: string
          empresa_ciudad: string
          empresa_cp: string
          empresa_direccion: string
          empresa_email: string
          empresa_logo_url: string | null
          empresa_nombre: string
          empresa_provincia: string
          empresa_razon_social: string | null
          empresa_telefono: string
          empresa_web: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condiciones_generales?: string | null
          created_at?: string
          empresa_cif: string
          empresa_ciudad: string
          empresa_cp: string
          empresa_direccion: string
          empresa_email: string
          empresa_logo_url?: string | null
          empresa_nombre: string
          empresa_provincia: string
          empresa_razon_social?: string | null
          empresa_telefono: string
          empresa_web?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condiciones_generales?: string | null
          created_at?: string
          empresa_cif?: string
          empresa_ciudad?: string
          empresa_cp?: string
          empresa_direccion?: string
          empresa_email?: string
          empresa_logo_url?: string | null
          empresa_nombre?: string
          empresa_provincia?: string
          empresa_razon_social?: string | null
          empresa_telefono?: string
          empresa_web?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      presupuestos: {
        Row: {
          cliente_ciudad: string | null
          cliente_cp: string | null
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_nif: string | null
          cliente_nombre: string
          cliente_provincia: string | null
          cliente_telefono: string | null
          comercial_nombre: string | null
          created_at: string
          descripcion_trabajo_larga: string | null
          estado_presupuesto: string
          fecha_presupuesto: string
          id: string
          iva_importe: number
          iva_porcentaje: number
          numero_presupuesto: string
          obra_titulo: string
          partidas: Json
          pdf_url: string | null
          subtotal: number
          total_presupuesto: number
          updated_at: string
          user_id: string
          validez_dias: number
          work_id: string | null
        }
        Insert: {
          cliente_ciudad?: string | null
          cliente_cp?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_nif?: string | null
          cliente_nombre: string
          cliente_provincia?: string | null
          cliente_telefono?: string | null
          comercial_nombre?: string | null
          created_at?: string
          descripcion_trabajo_larga?: string | null
          estado_presupuesto?: string
          fecha_presupuesto?: string
          id?: string
          iva_importe?: number
          iva_porcentaje?: number
          numero_presupuesto: string
          obra_titulo: string
          partidas?: Json
          pdf_url?: string | null
          subtotal?: number
          total_presupuesto?: number
          updated_at?: string
          user_id: string
          validez_dias?: number
          work_id?: string | null
        }
        Update: {
          cliente_ciudad?: string | null
          cliente_cp?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_nif?: string | null
          cliente_nombre?: string
          cliente_provincia?: string | null
          cliente_telefono?: string | null
          comercial_nombre?: string | null
          created_at?: string
          descripcion_trabajo_larga?: string | null
          estado_presupuesto?: string
          fecha_presupuesto?: string
          id?: string
          iva_importe?: number
          iva_porcentaje?: number
          numero_presupuesto?: string
          obra_titulo?: string
          partidas?: Json
          pdf_url?: string | null
          subtotal?: number
          total_presupuesto?: number
          updated_at?: string
          user_id?: string
          validez_dias?: number
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          amount: number
          budget_responded_at: string | null
          budget_sent_at: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          is_paid: boolean
          position: number
          status: Database["public"]["Enums"]["work_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          budget_responded_at?: string | null
          budget_sent_at?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_paid?: boolean
          position?: number
          status?: Database["public"]["Enums"]["work_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_responded_at?: string | null
          budget_sent_at?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          is_paid?: boolean
          position?: number
          status?: Database["public"]["Enums"]["work_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      work_status:
        | "presupuesto_solicitado"
        | "presupuesto_enviado"
        | "presupuesto_aceptado"
        | "factura_enviada"
        | "trabajo_terminado"
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
      work_status: [
        "presupuesto_solicitado",
        "presupuesto_enviado",
        "presupuesto_aceptado",
        "factura_enviada",
        "trabajo_terminado",
      ],
    },
  },
} as const
