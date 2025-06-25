"use client"

import { supabase } from "./supabase/client"
import type { Database } from "./supabase/types"

type Request = Database["public"]["Tables"]["requests"]["Row"]
type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"]
type RequestUpdate = Database["public"]["Tables"]["requests"]["Update"]

export interface DatabaseRequest {
  id: string
  user_address: string
  amount: string
  from_chain: string
  to_chain: string
  offering?: string
  message: string
  type: "exchange" | "help"
  status: "active" | "completed" | "cancelled"
  tx_hash?: string
  created_at: string
  updated_at: string
}

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  try {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  } catch {
    return false
  }
}

// Fallback storage for when database is not available
const STORAGE_KEY = "p2p_requests"

const getStoredRequests = (): DatabaseRequest[] => {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const setStoredRequests = (requests: DatabaseRequest[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

// Transform database row to our interface
const transformRequest = (row: Request): DatabaseRequest => ({
  id: row.id,
  user_address: row.user_address,
  amount: row.amount,
  from_chain: row.from_chain,
  to_chain: row.to_chain,
  offering: row.offering || undefined,
  message: row.message,
  type: row.type,
  status: row.status,
  tx_hash: row.tx_hash || undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

// Database operations
export const dbOperations = {
  // Test database connection and table existence
  async testConnection(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.log("Supabase not configured, using localStorage")
      return false
    }

    try {
      // Test if table exists and we can query it
      const { data, error } = await supabase.from("requests").select("count", { count: "exact", head: true }).limit(1)

      if (error) {
        console.log("Database connection test failed:", error.message)
        return false
      }

      console.log("Database connection successful, table exists")
      return true
    } catch (error) {
      console.log("Database connection test error:", error)
      return false
    }
  },

  // Create a new request - Database first with localStorage backup
  async createRequest(request: Omit<DatabaseRequest, "created_at" | "updated_at">): Promise<DatabaseRequest> {
    const newRequest: DatabaseRequest = {
      ...request,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("Creating request:", newRequest)

    // Try database first if configured
    if (isSupabaseConfigured()) {
      try {
        const insertData: RequestInsert = {
          id: request.id,
          user_address: request.user_address,
          amount: request.amount,
          from_chain: request.from_chain,
          to_chain: request.to_chain,
          offering: request.offering || null,
          message: request.message,
          type: request.type,
          status: request.status,
          tx_hash: request.tx_hash || null,
        }

        console.log("Inserting to database:", insertData)

        const { data, error } = await supabase.from("requests").insert(insertData).select().single()

        if (error) {
          console.error("Database insert error:", error)
          throw new Error(`Database insert failed: ${error.message}`)
        }

        if (data) {
          console.log("Request successfully saved to database:", data)

          // Also save to localStorage as backup
          try {
            const requests = getStoredRequests()
            const updatedRequests = [newRequest, ...requests.filter((r) => r.id !== newRequest.id)]
            setStoredRequests(updatedRequests)
            console.log("Request backed up to localStorage")
          } catch (localError) {
            console.warn("Failed to backup to localStorage:", localError)
          }

          return transformRequest(data)
        } else {
          throw new Error("No data returned from database insert")
        }
      } catch (error: any) {
        console.error("Database insert exception:", error)

        // Check if it's a table not found error
        if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
          throw new Error("Database table 'requests' does not exist. Please run the setup script first.")
        }

        // For other errors, fall through to localStorage
        console.log("Falling back to localStorage due to database error")
      }
    }

    // Fallback to localStorage
    try {
      const requests = getStoredRequests()
      const updatedRequests = [newRequest, ...requests.filter((r) => r.id !== newRequest.id)]
      setStoredRequests(updatedRequests)
      console.log("Request saved to localStorage:", newRequest)
      return newRequest
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
      throw new Error("Failed to save request to both database and localStorage")
    }
  },

  // Get all active requests from database
  async getActiveRequests(): Promise<DatabaseRequest[]> {
    let allRequests: DatabaseRequest[] = []

    // Try database first if configured
    if (isSupabaseConfigured()) {
      try {
        console.log("Fetching active requests from database...")

        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Database query error:", error)
          throw new Error(`Database query failed: ${error.message}`)
        }

        if (data) {
          allRequests = data.map(transformRequest)
          console.log(`Loaded ${allRequests.length} requests from database`)
          return allRequests
        }
      } catch (error: any) {
        console.error("Database query exception:", error)

        // If table doesn't exist, inform user
        if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
          console.log("Database table does not exist, using localStorage")
        } else {
          console.log("Database error, falling back to localStorage")
        }
      }
    }

    // Fallback to localStorage
    try {
      const localRequests = getStoredRequests()
      allRequests = localRequests.filter((r) => r.status === "active")
      console.log(`Loaded ${allRequests.length} requests from localStorage`)
    } catch (error) {
      console.error("Failed to load from localStorage:", error)
    }

    return allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  // Get user's own requests from database
  async getUserRequests(userAddress: string): Promise<DatabaseRequest[]> {
    let allRequests: DatabaseRequest[] = []

    // Try database first if configured
    if (isSupabaseConfigured()) {
      try {
        console.log(`Fetching user requests for ${userAddress} from database...`)

        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .eq("user_address", userAddress)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Database user query error:", error)
        } else if (data) {
          const dbRequests = data.map(transformRequest)
          console.log(`Loaded ${dbRequests.length} user requests from database`)
          allRequests = dbRequests
        }
      } catch (error) {
        console.error("Database user query exception:", error)
      }
    }

    // Also get localStorage requests and merge (avoiding duplicates)
    try {
      const localRequests = getStoredRequests()
      const userLocalRequests = localRequests.filter((r) => r.user_address === userAddress)

      if (allRequests.length === 0) {
        allRequests = userLocalRequests
        console.log(`Loaded ${allRequests.length} user requests from localStorage`)
      } else {
        // Merge with database requests, avoiding duplicates
        const existingIds = new Set(allRequests.map((r) => r.id))
        const newLocalRequests = userLocalRequests.filter((r) => !existingIds.has(r.id))
        allRequests = [...allRequests, ...newLocalRequests]
        console.log(`Merged ${newLocalRequests.length} additional requests from localStorage`)
      }
    } catch (error) {
      console.error("Failed to load user requests from localStorage:", error)
    }

    return allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  // Update request status in database
  async updateRequestStatus(
    id: string,
    status: "completed" | "cancelled",
    txHash?: string,
  ): Promise<DatabaseRequest | null> {
    let updatedRequest: DatabaseRequest | null = null

    // Try database first if configured
    if (isSupabaseConfigured()) {
      try {
        const updateData: RequestUpdate = {
          status,
          updated_at: new Date().toISOString(),
        }

        if (txHash) {
          updateData.tx_hash = txHash
        }

        console.log(`Updating request ${id} in database:`, updateData)

        const { data, error } = await supabase.from("requests").update(updateData).eq("id", id).select().single()

        if (error) {
          console.error("Database update error:", error)
          throw new Error(`Database update failed: ${error.message}`)
        }

        if (data) {
          console.log("Request status updated in database:", data)
          updatedRequest = transformRequest(data)

          // Also update localStorage to keep in sync
          try {
            const requests = getStoredRequests()
            const updatedRequests = requests.map((r) => {
              if (r.id === id) {
                return { ...r, status, tx_hash: txHash || r.tx_hash, updated_at: new Date().toISOString() }
              }
              return r
            })
            setStoredRequests(updatedRequests)
            console.log("Request status synced to localStorage")
          } catch (localError) {
            console.warn("Failed to sync localStorage:", localError)
          }

          return updatedRequest
        }
      } catch (error: any) {
        console.error("Database update exception:", error)
      }
    }

    // Fallback to localStorage
    try {
      const requests = getStoredRequests()
      const updatedRequests = requests.map((r) => {
        if (r.id === id) {
          const updated = {
            ...r,
            status,
            tx_hash: txHash || r.tx_hash,
            updated_at: new Date().toISOString(),
          }
          updatedRequest = updated
          return updated
        }
        return r
      })
      setStoredRequests(updatedRequests)
      console.log("Request status updated in localStorage")
    } catch (error) {
      console.error("Failed to update localStorage:", error)
    }

    return updatedRequest
  },

  // Search requests in database
  async searchRequests(searchTerm: string, chainFilter?: string): Promise<DatabaseRequest[]> {
    // Get all active requests and filter them
    const allRequests = await this.getActiveRequests()

    return allRequests.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesChain =
        !chainFilter || chainFilter === "all" || r.from_chain === chainFilter || r.to_chain === chainFilter
      return matchesSearch && matchesChain
    })
  },

  // Get request statistics from database
  async getRequestStats(): Promise<{ active: number; completed: number }> {
    let stats = { active: 0, completed: 0 }

    // Try database first if configured
    if (isSupabaseConfigured()) {
      try {
        console.log("Fetching stats from database...")

        const [activeResult, completedResult] = await Promise.all([
          supabase.from("requests").select("id", { count: "exact" }).eq("status", "active"),
          supabase.from("requests").select("id", { count: "exact" }).eq("status", "completed"),
        ])

        if (!activeResult.error && !completedResult.error) {
          const dbActive = activeResult.count || 0
          const dbCompleted = completedResult.count || 0
          console.log(`Database stats: ${dbActive} active, ${dbCompleted} completed`)
          stats = { active: dbActive, completed: dbCompleted }
          return stats
        } else {
          console.log("Database stats query failed:", activeResult.error || completedResult.error)
        }
      } catch (error) {
        console.log("Database stats exception:", error)
      }
    }

    // Fallback to localStorage
    try {
      const requests = getStoredRequests()
      const localActive = requests.filter((r) => r.status === "active").length
      const localCompleted = requests.filter((r) => r.status === "completed").length
      stats = { active: localActive, completed: localCompleted }
      console.log(`Local stats: ${localActive} active, ${localCompleted} completed`)
    } catch (error) {
      console.error("Failed to get localStorage stats:", error)
    }

    return stats
  },

  // Get all requests (for admin purposes)
  async getAllRequests(): Promise<DatabaseRequest[]> {
    if (!isSupabaseConfigured()) {
      return getStoredRequests()
    }

    try {
      const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching all requests:", error)
        return getStoredRequests()
      }

      return data ? data.map(transformRequest) : []
    } catch (error) {
      console.error("Exception fetching all requests:", error)
      return getStoredRequests()
    }
  },

  // Delete a request (for admin purposes)
  async deleteRequest(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("requests").delete().eq("id", id)

        if (error) {
          console.error("Error deleting request:", error)
          return false
        }

        console.log(`Request ${id} deleted from database`)
      } catch (error) {
        console.error("Exception deleting request:", error)
        return false
      }
    }

    // Also remove from localStorage
    try {
      const requests = getStoredRequests()
      const updatedRequests = requests.filter((r) => r.id !== id)
      setStoredRequests(updatedRequests)
      console.log(`Request ${id} deleted from localStorage`)
    } catch (error) {
      console.error("Failed to delete from localStorage:", error)
    }

    return true
  },
}
