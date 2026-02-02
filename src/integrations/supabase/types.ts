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
      asset_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_types: {
        Row: {
          category_id: string
          code: string
          color: string | null
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          metadata_schema: Json | null
          name: string
          supports_price_feed: boolean
          supports_transactions: boolean
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
          valuation_method: Database["public"]["Enums"]["valuation_method"]
        }
        Insert: {
          category_id: string
          code: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata_schema?: Json | null
          name: string
          supports_price_feed?: boolean
          supports_transactions?: boolean
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Update: {
          category_id?: string
          code?: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata_schema?: Json | null
          name?: string
          supports_price_feed?: boolean
          supports_transactions?: boolean
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Relationships: [
          {
            foreignKeyName: "asset_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          area_sqft: number | null
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          asset_type_code: string | null
          bank_name: string | null
          broker_platform: string | null
          category_code: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          current_price_per_unit: number | null
          current_value: number | null
          id: string
          instrument_name: string | null
          interest_rate: number | null
          is_current_value_manual: boolean | null
          location: string | null
          maturity_amount: number | null
          maturity_date: string | null
          metal_type: string | null
          nav_or_price: number | null
          notes: string | null
          portfolio_id: string | null
          principal: number | null
          purchase_date: string
          purchase_price_per_unit: number | null
          quantity: number | null
          quantity_unit: string | null
          rental_income_monthly: number | null
          sip_frequency: string | null
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area_sqft?: number | null
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          asset_type_code?: string | null
          bank_name?: string | null
          broker_platform?: string | null
          category_code?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_price_per_unit?: number | null
          current_value?: number | null
          id?: string
          instrument_name?: string | null
          interest_rate?: number | null
          is_current_value_manual?: boolean | null
          location?: string | null
          maturity_amount?: number | null
          maturity_date?: string | null
          metal_type?: string | null
          nav_or_price?: number | null
          notes?: string | null
          portfolio_id?: string | null
          principal?: number | null
          purchase_date: string
          purchase_price_per_unit?: number | null
          quantity?: number | null
          quantity_unit?: string | null
          rental_income_monthly?: number | null
          sip_frequency?: string | null
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area_sqft?: number | null
          asset_name?: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          asset_type_code?: string | null
          bank_name?: string | null
          broker_platform?: string | null
          category_code?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_price_per_unit?: number | null
          current_value?: number | null
          id?: string
          instrument_name?: string | null
          interest_rate?: number | null
          is_current_value_manual?: boolean | null
          location?: string | null
          maturity_amount?: number | null
          maturity_date?: string | null
          metal_type?: string | null
          nav_or_price?: number | null
          notes?: string | null
          portfolio_id?: string | null
          principal?: number | null
          purchase_date?: string
          purchase_price_per_unit?: number | null
          quantity?: number | null
          quantity_unit?: string | null
          rental_income_monthly?: number | null
          sip_frequency?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          id: string
          name: string
          ounce_to_gram: number
          symbol: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          ounce_to_gram?: number
          symbol: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          ounce_to_gram?: number
          symbol?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          as_of: string
          created_at: string
          id: string
          instrument_symbol: string
          price_aed_per_oz: number
          source: string | null
        }
        Insert: {
          as_of?: string
          created_at?: string
          id?: string
          instrument_symbol: string
          price_aed_per_oz: number
          source?: string | null
        }
        Update: {
          as_of?: string
          created_at?: string
          id?: string
          instrument_symbol?: string
          price_aed_per_oz?: number
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["symbol"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          fees: number
          id: string
          instrument_symbol: string
          notes: string | null
          portfolio_id: string
          price: number
          price_unit: Database["public"]["Enums"]["price_unit"]
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
          side: Database["public"]["Enums"]["transaction_side"]
          trade_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fees?: number
          id?: string
          instrument_symbol: string
          notes?: string | null
          portfolio_id: string
          price: number
          price_unit: Database["public"]["Enums"]["price_unit"]
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
          side: Database["public"]["Enums"]["transaction_side"]
          trade_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fees?: number
          id?: string
          instrument_symbol?: string
          notes?: string | null
          portfolio_id?: string
          price?: number
          price_unit?: Database["public"]["Enums"]["price_unit"]
          quantity?: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
          side?: Database["public"]["Enums"]["transaction_side"]
          trade_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_settings: {
        Row: {
          auto_refresh_prices: boolean | null
          created_at: string
          id: string
          inr_to_aed_rate: number | null
          updated_at: string
          usd_to_aed_rate: number | null
          user_id: string
        }
        Insert: {
          auto_refresh_prices?: boolean | null
          created_at?: string
          id?: string
          inr_to_aed_rate?: number | null
          updated_at?: string
          usd_to_aed_rate?: number | null
          user_id: string
        }
        Update: {
          auto_refresh_prices?: boolean | null
          created_at?: string
          id?: string
          inr_to_aed_rate?: number | null
          updated_at?: string
          usd_to_aed_rate?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_portfolio_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_type:
        | "precious_metals"
        | "real_estate"
        | "fixed_deposit"
        | "sip"
        | "mutual_fund"
        | "shares"
      currency: "AED" | "INR"
      price_unit: "AED_PER_OZ" | "AED_PER_GRAM"
      quantity_unit: "OZ" | "GRAM"
      transaction_side: "BUY" | "SELL"
      unit_type: "currency" | "weight" | "units" | "area" | "quantity"
      valuation_method:
        | "live_price"
        | "nav_based"
        | "maturity_based"
        | "manual"
        | "cost_based"
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
      app_role: ["admin", "user"],
      asset_type: [
        "precious_metals",
        "real_estate",
        "fixed_deposit",
        "sip",
        "mutual_fund",
        "shares",
      ],
      currency: ["AED", "INR"],
      price_unit: ["AED_PER_OZ", "AED_PER_GRAM"],
      quantity_unit: ["OZ", "GRAM"],
      transaction_side: ["BUY", "SELL"],
      unit_type: ["currency", "weight", "units", "area", "quantity"],
      valuation_method: [
        "live_price",
        "nav_based",
        "maturity_based",
        "manual",
        "cost_based",
      ],
    },
  },
} as const
