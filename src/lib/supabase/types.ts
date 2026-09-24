export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          type: "income" | "expense"
          default_limit: number
          is_system: boolean
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          color: string
          type: "income" | "expense"
          default_limit?: number
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          type?: "income" | "expense"
          default_limit?: number
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          type: "income" | "expense"
          category_id: string
          date: string
          status: "paid" | "pending"
          installment_index: number | null
          total_installments: number | null
          installment_group_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          description: string
          amount: number
          type: "income" | "expense"
          category_id: string
          date: string
          status?: "paid" | "pending"
          installment_index?: number | null
          total_installments?: number | null
          installment_group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          type?: "income" | "expense"
          category_id?: string
          date?: string
          status?: "paid" | "pending"
          installment_index?: number | null
          total_installments?: number | null
          installment_group_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      category_limits: {
        Row: {
          id: string
          user_id: string
          category_id: string
          limit_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          limit_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          limit_amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}