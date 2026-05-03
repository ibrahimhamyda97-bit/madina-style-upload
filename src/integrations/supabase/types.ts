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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: Database["public"]["Enums"]["product_size"]
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size: Database["public"]["Enums"]["product_size"]
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: Database["public"]["Enums"]["product_size"]
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_applications: {
        Row: {
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["courier_app_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["courier_app_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["courier_app_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_id: string
          quantity: number
          shipping_fee_gnf: number
          shop_id: string
          size: Database["public"]["Enums"]["product_size"]
          title: string
          unit_price_gnf: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_id: string
          quantity: number
          shipping_fee_gnf?: number
          shop_id: string
          size: Database["public"]["Enums"]["product_size"]
          title: string
          unit_price_gnf: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          shipping_fee_gnf?: number
          shop_id?: string
          size?: Database["public"]["Enums"]["product_size"]
          title?: string
          unit_price_gnf?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          courier_id: string | null
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_code: string | null
          delivery_notes: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_operator: string | null
          payment_reference: string | null
          picked_up_at: string | null
          pickup_code: string | null
          reference: string
          status: Database["public"]["Enums"]["order_status"]
          total_gnf: number
          updated_at: string
          user_id: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_code?: string | null
          delivery_notes?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_operator?: string | null
          payment_reference?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          reference: string
          status?: Database["public"]["Enums"]["order_status"]
          total_gnf?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_code?: string | null
          delivery_notes?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_operator?: string | null
          payment_reference?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_gnf?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_gnf: number
          created_at: string
          created_by: string
          id: string
          method: string | null
          note: string | null
          paid_at: string
          reference: string | null
          shop_id: string
        }
        Insert: {
          amount_gnf: number
          created_at?: string
          created_by: string
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string
          reference?: string | null
          shop_id: string
        }
        Update: {
          amount_gnf?: number
          created_at?: string
          created_by?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string
          reference?: string | null
          shop_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          detected_color: string | null
          id: string
          image_url: string
          position: number
          product_id: string
          size: Database["public"]["Enums"]["product_size"]
        }
        Insert: {
          created_at?: string
          detected_color?: string | null
          id?: string
          image_url: string
          position?: number
          product_id: string
          size: Database["public"]["Enums"]["product_size"]
        }
        Update: {
          created_at?: string
          detected_color?: string | null
          id?: string
          image_url?: string
          position?: number
          product_id?: string
          size?: Database["public"]["Enums"]["product_size"]
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string | null
          position: number
          price_gnf: number | null
          product_id: string
          size: Database["public"]["Enums"]["product_size"] | null
          sizes: Database["public"]["Enums"]["product_size"][]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string | null
          position?: number
          price_gnf?: number | null
          product_id: string
          size?: Database["public"]["Enums"]["product_size"] | null
          sizes?: Database["public"]["Enums"]["product_size"][]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string | null
          position?: number
          price_gnf?: number | null
          product_id?: string
          size?: Database["public"]["Enums"]["product_size"] | null
          sizes?: Database["public"]["Enums"]["product_size"][]
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          detected_color: string | null
          detected_object_type: string | null
          id: string
          price_gnf: number
          rejection_reason: string | null
          shipping_fee_gnf: number
          shop_id: string
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          detected_color?: string | null
          detected_object_type?: string | null
          id?: string
          price_gnf: number
          rejection_reason?: string | null
          shipping_fee_gnf?: number
          shop_id: string
          status?: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          detected_color?: string | null
          detected_object_type?: string | null
          id?: string
          price_gnf?: number
          rejection_reason?: string | null
          shipping_fee_gnf?: number
          shop_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          neighborhood: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          banner_url: string | null
          city: string | null
          commission_rate: number
          created_at: string
          description: string | null
          id: string
          id_document_url: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payment_number: string | null
          payment_operator: string | null
          phone: string | null
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          city?: string | null
          commission_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          id_document_url?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          payment_number?: string | null
          payment_operator?: string | null
          phone?: string | null
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          city?: string | null
          commission_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          id_document_url?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_number?: string | null
          payment_operator?: string | null
          phone?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      assign_courier_role: { Args: never; Returns: undefined }
      courier_can_see_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      courier_claim_order: { Args: { p_order_id: string }; Returns: undefined }
      courier_confirm_delivery: {
        Args: { p_code: string; p_order_id: string }
        Returns: undefined
      }
      courier_confirm_pickup: {
        Args: { p_code: string; p_order_id: string }
        Returns: undefined
      }
      courier_handles_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      courier_set_in_transit: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      generate_auth_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          p_confirmed_shop_ids: string[]
          p_customer_address: string
          p_customer_name: string
          p_customer_phone: string
          p_notes: string
          p_payment_operator: string
          p_payment_reference: string
          p_reference: string
        }
        Returns: string
      }
      review_courier_application: {
        Args: { p_approve: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      shop_owner_in_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "vendor"
        | "buyer"
        | "courier"
        | "moderator"
        | "order_manager"
      courier_app_status: "pending" | "approved" | "rejected"
      delivery_status:
        | "unassigned"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "failed"
      order_status: "pending" | "paid" | "cancelled" | "refunded"
      product_size:
        | "XS"
        | "S"
        | "M"
        | "L"
        | "XL"
        | "36"
        | "37"
        | "38"
        | "39"
        | "40"
        | "41"
        | "42"
        | "43"
        | "44"
        | "45"
      product_status: "pending" | "approved" | "rejected"
      shop_status: "pending" | "approved" | "rejected"
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
        "vendor",
        "buyer",
        "courier",
        "moderator",
        "order_manager",
      ],
      courier_app_status: ["pending", "approved", "rejected"],
      delivery_status: [
        "unassigned",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
      ],
      order_status: ["pending", "paid", "cancelled", "refunded"],
      product_size: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "36",
        "37",
        "38",
        "39",
        "40",
        "41",
        "42",
        "43",
        "44",
        "45",
      ],
      product_status: ["pending", "approved", "rejected"],
      shop_status: ["pending", "approved", "rejected"],
    },
  },
} as const
