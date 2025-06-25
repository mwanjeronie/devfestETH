export interface Database {
  public: {
    Tables: {
      requests: {
        Row: {
          id: string
          user_address: string
          amount: string
          from_chain: string
          to_chain: string
          offering: string | null
          message: string
          type: "exchange" | "help"
          status: "active" | "completed" | "cancelled"
          tx_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_address: string
          amount: string
          from_chain: string
          to_chain: string
          offering?: string | null
          message: string
          type: "exchange" | "help"
          status?: "active" | "completed" | "cancelled"
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_address?: string
          amount?: string
          from_chain?: string
          to_chain?: string
          offering?: string | null
          message?: string
          type?: "exchange" | "help"
          status?: "active" | "completed" | "cancelled"
          tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Request = Database["public"]["Tables"]["requests"]["Row"]
export type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"]
export type RequestUpdate = Database["public"]["Tables"]["requests"]["Update"]
