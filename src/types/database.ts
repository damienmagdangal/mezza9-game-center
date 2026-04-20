export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: {
          id: string;
          table_number: number;
          model_name: string;
          base_price_per_hour: number;
          is_premium: boolean;
          status: "AVAILABLE" | "RESERVED" | "IN_USE" | "MAINTENANCE";
          created_at: string;
        };
        Insert: {
          id?: string;
          table_number: number;
          model_name: string;
          base_price_per_hour: number;
          is_premium?: boolean;
          status?: "AVAILABLE" | "RESERVED" | "IN_USE" | "MAINTENANCE";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tables"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string;
          type: "REGULAR" | "VIP" | "CORPORATE";
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email: string;
          type?: "REGULAR" | "VIP" | "CORPORATE";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      reservations: {
        Row: {
          id: string;
          table_id: string;
          customer_id: string;
          start_time: string;
          end_time: string;
          total_price: number;
          is_web_booking: boolean;
          status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
          agreed_to_terms: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          customer_id: string;
          start_time: string;
          end_time: string;
          total_price: number;
          is_web_booking?: boolean;
          status?: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
          agreed_to_terms: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Insert"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          admin_id: string;
          action_type: "MANUAL_OVERRIDE" | "PRICE_CHANGE" | "RESERVATION_STATUS_CHANGE" | "AUTO_NO_SHOW";
          table_id: string | null;
          timestamp: string;
          details: Json;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action_type: "MANUAL_OVERRIDE" | "PRICE_CHANGE" | "RESERVATION_STATUS_CHANGE" | "AUTO_NO_SHOW";
          table_id?: string | null;
          timestamp?: string;
          details?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
      };
    };
  };
};
