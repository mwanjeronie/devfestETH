"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { useWalletContext } from "@/components/WalletProvider"
import { chains } from "@/hooks/useWallet"
import { dbOperations, type DatabaseRequest } from "@/lib/database"
import {
  Wallet,
  Send,
  MessageCircle,
  Globe,
  Zap,
  Users,
  ArrowRightLeft,
  Search,
  Plus,
  X,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Shield,
  Coins,
  RefreshCw,
  CheckCircle,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DatabaseSetup } from "@/components/DatabaseSetup"

// Types
interface Request {
  id: string
  user_address: string
  amount: string
  from_chain: string
  to_chain: string
  offering?: string
  message: string
  timestamp: string
  type: "exchange" | "help"
  status: "active" | "completed" | "cancelled"
  created_at: string
  tx_hash?: string
}

// Move this component outside of P2PPlatform component, before the main export
const CreateRequestForm = ({
  requestType,
  setRequestType,
  formData,
  setFormData,
  createRequest,
  isLoading,
  chains,
  wallet,
  xmtp,
  setCurrentChatAddress,
  setChatOpen,
}: {
  requestType: "help" | "exchange"
  setRequestType: (type: "help" | "exchange") => void
  formData: any
  setFormData: (data: any) => void
  createRequest: () => void
  isLoading: boolean
  chains: any[]
  wallet: any
  xmtp: any
  setCurrentChatAddress: (address: string) => void
  setChatOpen: (open: boolean) => void
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    createRequest()
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault()
    setFormData((prev: any) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Request
        </CardTitle>
        <CardDescription>
          {requestType === "help"
            ? "Ask the community for help with gas fees"
            : "Create an exchange offer with another user"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Request Type Selection */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={requestType === "help" ? "default" : "ghost"}
              size="sm"
              onClick={() => setRequestType("help")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Request Help
            </Button>
            <Button
              type="button"
              variant={requestType === "exchange" ? "default" : "ghost"}
              size="sm"
              onClick={() => setRequestType("exchange")}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Exchange Offer
            </Button>
          </div>

          {requestType === "exchange" ? (
            /* Exchange Layout */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* I Have Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>I Have
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="from-amount" className="text-sm font-medium">
                        Amount (ETH)
                      </Label>
                      <Input
                        id="from-amount"
                        name="from-amount"
                        placeholder="0.1"
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.amount}
                        onChange={handleInputChange("amount")}
                        className="mt-1"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <Label htmlFor="from-chain" className="text-sm font-medium">
                        On Network
                      </Label>
                      <Select value={formData.fromChain} onValueChange={handleSelectChange("fromChain")}>
                        <SelectTrigger id="from-chain" className="mt-1">
                          <SelectValue placeholder="Select source chain" />
                        </SelectTrigger>
                        <SelectContent>
                          {chains
                            .filter((chain) => chain.nativeCurrency.symbol === "ETH")
                            .map((chain) => (
                              <SelectItem key={chain.name} value={chain.name}>
                                {chain.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* I Want Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>I Want
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="to-amount" className="text-sm font-medium">
                        Amount (ETH)
                      </Label>
                      <Input
                        id="to-amount"
                        name="to-amount"
                        placeholder="0.1"
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.toAmount || formData.amount}
                        onChange={handleInputChange("toAmount")}
                        className="mt-1"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <Label htmlFor="to-chain" className="text-sm font-medium">
                        On Network
                      </Label>
                      <Select value={formData.toChain} onValueChange={handleSelectChange("toChain")}>
                        <SelectTrigger id="to-chain" className="mt-1">
                          <SelectValue placeholder="Select target chain" />
                        </SelectTrigger>
                        <SelectContent>
                          {chains
                            .filter((chain) => chain.nativeCurrency.symbol === "ETH")
                            .map((chain) => (
                              <SelectItem key={chain.name} value={chain.name}>
                                {chain.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Help Request Layout */
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-orange-50/50">
                <div className="flex items-center gap-2 mb-4 text-orange-700 font-medium">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>I Need Help With
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="help-amount" className="text-sm font-medium">
                      Amount Needed (ETH)
                    </Label>
                    <Input
                      id="help-amount"
                      name="help-amount"
                      placeholder="0.005"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.amount}
                      onChange={handleInputChange("amount")}
                      className="mt-1"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <Label htmlFor="help-chain" className="text-sm font-medium">
                      On Network
                    </Label>
                    <Select
                      value={formData.toChain}
                      onValueChange={(value) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          toChain: value,
                          fromChain: value,
                        }))
                      }
                    >
                      <SelectTrigger id="help-chain" className="mt-1">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {chains
                          .filter((chain) => chain.nativeCurrency.symbol === "ETH")
                          .map((chain) => (
                            <SelectItem key={chain.name} value={chain.name}>
                              {chain.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Optional offering section */}
              <div className="p-4 border rounded-lg bg-purple-50/50">
                <div className="flex items-center gap-2 mb-4 text-purple-700 font-medium">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  What I Can Offer (Optional)
                </div>

                <Input
                  name="offering"
                  placeholder="e.g., 0.01 MATIC, USDC, or leave empty for community help"
                  value={formData.offering}
                  onChange={handleInputChange("offering")}
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {/* Message Section */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder={
                requestType === "help"
                  ? "Explain why you need help and what you're trying to do..."
                  : "Describe your exchange offer and any specific requirements..."
              }
              rows={4}
              value={formData.message}
              onChange={handleInputChange("message")}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be clear and specific to get better responses from the community
            </p>
          </div>

          {/* Messaging Platform Preferences */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preferred Contact Methods (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://xmtp.chat/conversations/new-dm/${wallet.address}`, "_blank")}
                className="justify-start"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                XMTP.chat
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://warpcast.com/~/compose?text=Contact me about my kaETH Platform request!`,
                    "_blank",
                  )
                }
                className="justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                Farcaster
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://zora.co/@${wallet.address}`, "_blank")}
                className="justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Zora Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (xmtp.isInitialized && xmtp.isAvailable) {
                    setCurrentChatAddress("INBOX")
                    setChatOpen(true)
                  } else {
                    toast({
                      title: "XMTP Not Ready",
                      description: "Please initialize XMTP messaging first",
                      variant: "destructive",
                    })
                  }
                }}
                className="justify-start"
                disabled={!xmtp.isInitialized || !xmtp.isAvailable}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Built-in Chat
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">These links help others contact you about your request</p>
          </div>

          {/* Validation Messages */}
          {!formData.amount && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Please enter an amount</div>}

          {requestType === "exchange" && formData.fromChain === formData.toChain && formData.fromChain && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Source and target chains must be different for exchanges
            </div>
          )}

          {!formData.message.trim() && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Please provide a message explaining your request
            </div>
          )}

          {/* Create Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={
              isLoading ||
              !formData.amount ||
              !formData.message.trim() ||
              (requestType === "exchange" &&
                (!formData.fromChain || !formData.toChain || formData.fromChain === formData.toChain)) ||
              (requestType === "help" && !formData.toChain)
            }
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating Request...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {requestType === "help" ? "Create Help Request" : "Create Exchange Offer"}
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Your request will be visible to the community immediately</p>
            <p>Make sure your wallet is connected and has enough balance for transactions</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Add after the CreateRequestForm component, before the main P2PPlatform component

const XMTPInitializationCard = ({
  xmtp,
  initializeXMTP,
  retryInitialization,
  wallet,
}: {
  xmtp: any
  initializeXMTP: () => Promise<boolean>
  retryInitialization: () => Promise<void>
  wallet: any
}) => {
  const [isInitializing, setIsInitializing] = useState(false)

  const handleInitialize = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setIsInitializing(true)
    try {
      await initializeXMTP()
    } finally {
      setIsInitializing(false)
    }
  }

  const handleRetry = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setIsInitializing(true)
    try {
      await retryInitialization()
    } finally {
      setIsInitializing(false)
    }
  }

  const getStatusColor = () => {
    if (xmtp.isInitialized && xmtp.isAvailable) return "text-green-600"
    if (xmtp.error) return "text-red-600"
    if (xmtp.isLoading || isInitializing) return "text-blue-600"
    return "text-gray-600"
  }

  const getStatusIcon = () => {
    if (xmtp.isInitialized && xmtp.isAvailable) return <CheckCircle className="h-4 w-4" />
    if (xmtp.error) return <AlertCircle className="h-4 w-4" />
    if (xmtp.isLoading || isInitializing) return <Clock className="h-4 w-4 animate-spin" />
    return <MessageCircle className="h-4 w-4" />
  }

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          XMTP v3 Secure Messaging
        </CardTitle>
        <CardDescription>
          Initialize end-to-end encrypted messaging to communicate securely with other users using XMTP v3
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg">
          <div className={getStatusColor()}>{getStatusIcon()}</div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {xmtp.isInitialized && xmtp.isAvailable
                ? "XMTP v3 Ready"
                : xmtp.error
                  ? "Initialization Failed"
                  : xmtp.isLoading || isInitializing
                    ? "Initializing..."
                    : "Not Initialized"}
            </p>
            <p className="text-xs text-muted-foreground">{xmtp.initializationStep}</p>
          </div>
        </div>

        {/* Error Display */}
        {xmtp.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">XMTP v3 Initialization Error</span>
            </div>
            <p className="text-sm text-red-600">{xmtp.error}</p>

            {xmtp.error.includes("signature") && (
              <p className="text-xs text-red-500 mt-1">
                Please approve the wallet signature request to enable secure messaging
              </p>
            )}

            {xmtp.error.includes("rejected") && (
              <p className="text-xs text-red-500 mt-1">
                Wallet signature was rejected. XMTP v3 requires your signature to create a secure messaging identity.
              </p>
            )}

            {xmtp.error.includes("timeout") && (
              <p className="text-xs text-red-500 mt-1">
                Initialization timed out. This may be due to network issues. Please try again.
              </p>
            )}
          </div>
        )}

        {/* Success Display */}
        {xmtp.isInitialized && xmtp.isAvailable && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">XMTP v3 Ready</span>
            </div>
            <p className="text-sm text-green-600">
              Secure messaging is now available. You can send and receive encrypted messages using XMTP v3.
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
              <span>✓ End-to-end encryption</span>
              <span>✓ Message authentication</span>
              <span>✓ Real-time messaging</span>
            </div>
            {xmtp.client && xmtp.client.inboxId && (
              <div className="mt-2 text-xs text-green-600">
                <p>Inbox ID: {xmtp.client.inboxId.slice(0, 12)}...</p>
                <p>Registration: {xmtp.isRegistered ? "Complete" : "First time setup"}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!xmtp.isInitialized || (xmtp.error && xmtp.canRetry) ? (
            <Button
              onClick={xmtp.error && xmtp.canRetry ? handleRetry : handleInitialize}
              disabled={!wallet.isConnected || xmtp.isLoading || isInitializing || (xmtp.error && !xmtp.canRetry)}
              className="flex-1"
              size="lg"
            >
              {xmtp.isLoading || isInitializing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Initializing XMTP v3...
                </>
              ) : xmtp.error && xmtp.canRetry ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Initialization
                </>
              ) : xmtp.error && !xmtp.canRetry ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  SDK Not Available
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Initialize XMTP v3 Messaging
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="flex-1" size="lg" variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              XMTP v3 Initialized
            </Button>
          )}

          {!wallet.isConnected && (
            <Button variant="outline" size="lg" disabled>
              Connect Wallet First
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• XMTP v3 provides secure, end-to-end encrypted messaging</p>
          <p>• Your wallet signature is required to create your messaging identity</p>
          <p>• Messages are stored securely and only you can decrypt them</p>
          <p>• Real-time message streaming for instant communication</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function P2PPlatform() {
  const {
    wallet,
    connectWallet,
    disconnectWallet,
    switchWallet,
    switchToChain,
    sendTransaction,
    xmtp,
    startConversation,
    sendMessage,
    getMessages,
    initializeXMTP,
    retryInitialization,
  } = useWalletContext()

  // State management
  const [activeTab, setActiveTab] = useState("browse")
  const [requests, setRequests] = useState<Request[]>([])
  const [userRequests, setUserRequests] = useState<Request[]>([])
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterChain, setFilterChain] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([])
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false)

  // Add after existing state declarations
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [showChatOptions, setShowChatOptions] = useState(false)
  const [selectedRequestForChat, setSelectedRequestForChat] = useState<Request | null>(null)

  // Form state
  const [requestType, setRequestType] = useState<"help" | "exchange">("help")
  const [formData, setFormData] = useState({
    amount: "",
    toAmount: "",
    fromChain: "",
    toChain: "",
    offering: "",
    message: "",
  })

  // Chat state
  const [currentChatAddress, setCurrentChatAddress] = useState<string>("")

  // Stats state
  const [stats, setStats] = useState({ active: 0, completed: 0 })

  // Helper function to transform database format to component format
  const transformDbRequest = (dbRequest: DatabaseRequest): Request => ({
    id: dbRequest.id,
    user_address: dbRequest.user_address,
    amount: dbRequest.amount,
    from_chain: dbRequest.from_chain,
    to_chain: dbRequest.to_chain,
    offering: dbRequest.offering,
    message: dbRequest.message,
    timestamp: new Date(dbRequest.created_at).toLocaleString(),
    type: dbRequest.type,
    status: dbRequest.status,
    created_at: dbRequest.created_at,
    tx_hash: dbRequest.tx_hash,
  })

  // Define loadRequests first before other functions that use it
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load all active requests - visible to everyone
      const activeRequests = await dbOperations.getActiveRequests()

      // Load user's requests if wallet is connected
      let userReqs: DatabaseRequest[] = []
      if (wallet.address) {
        userReqs = await dbOperations.getUserRequests(wallet.address)
      }

      // Transform database format to component format
      const transformedRequests = activeRequests.map(transformDbRequest)
      const transformedUserRequests = userReqs.map(transformDbRequest)

      setRequests(transformedRequests)
      setUserRequests(transformedUserRequests)
    } catch (error) {
      console.error("Error loading requests:", error)
      // Don't show toast error on initial load, just set empty arrays
      setRequests([])
      setUserRequests([])
      setError("Unable to load requests. Using local storage only.")
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
    }
  }, [wallet.address])

  // Now define other functions that depend on loadRequests
  const handleCreateRequest = useCallback(async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (!formData.amount || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (requestType === "exchange" && (!formData.fromChain || !formData.toChain)) {
      toast({
        title: "Missing Chain Information",
        description: "Please select both chains for exchange",
      })
      return
    }

    if (requestType === "exchange" && formData.fromChain === formData.toChain) {
      toast({
        title: "Invalid Exchange",
        description: "From and To chains must be different for exchanges",
      })
      return
    }

    if (requestType === "help" && !formData.toChain) {
      toast({
        title: "Missing Chain Information",
        description: "Please select the chain you need help with",
      })
      return
    }

    setIsLoading(true)
    try {
      const dbRequest: Omit<DatabaseRequest, "created_at" | "updated_at"> = {
        id: crypto.randomUUID(),
        user_address: wallet.address!,
        amount: formData.amount,
        from_chain: requestType === "help" ? formData.toChain : formData.fromChain,
        to_chain: formData.toChain,
        offering: requestType === "help" ? formData.offering : undefined,
        message: formData.message,
        type: requestType,
        status: "active",
      }

      await dbOperations.createRequest(dbRequest)

      // Reset form
      setFormData({
        amount: "",
        toAmount: "",
        fromChain: "",
        toChain: "",
        offering: "",
        message: "",
      })

      toast({
        title: "Request Created",
        description: `Your ${requestType} request has been posted successfully`,
      })

      // Reload requests
      await loadRequests()
      setActiveTab("browse")
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [wallet.isConnected, wallet.address, formData, requestType, loadRequests])

  const memoizedSetFormData = useCallback((updater: any) => {
    setFormData(updater)
  }, [])

  const memoizedSetRequestType = useCallback((type: "help" | "exchange") => {
    setRequestType(type)
  }, [])

  const testDatabaseConnection = async () => {
    const connected = await dbOperations.testConnection()
    setDbConnected(connected)

    // Show setup dialog if database is configured but table doesn't exist
    if (!connected && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setShowDatabaseSetup(true)
    }
  }

  const handleSetupComplete = async () => {
    setShowDatabaseSetup(false)
    // Retest the connection
    await testDatabaseConnection()
    // Reload requests
    await loadRequests()
  }

  const loadStats = async () => {
    try {
      const requestStats = await dbOperations.getRequestStats()
      setStats(requestStats)
    } catch (error) {
      console.error("Error loading stats:", error)
      // Use default stats if loading fails
      setStats({ active: 0, completed: 0 })
    }
  }

  const performSearch = async () => {
    if (!searchTerm && filterChain === "all") {
      setFilteredRequests(requests)
      return
    }

    try {
      const searchResults = await dbOperations.searchRequests(
        searchTerm,
        filterChain === "all" ? undefined : filterChain,
      )
      setFilteredRequests(searchResults.map(transformDbRequest))
    } catch (error) {
      console.error("Search error:", error)
      setFilteredRequests(requests)
    }
  }

  const helpWithRequest = async (request: Request) => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (request.user_address === wallet.address) {
      toast({
        title: "Cannot Help Yourself",
        description: "You cannot help with your own request",
        variant: "destructive",
      })
      return
    }

    // Check if we need to switch chains
    const targetChain = chains.find((c) => c.name === request.to_chain)
    if (targetChain && wallet.chainId !== targetChain.id) {
      const switched = await switchToChain(targetChain.id)
      if (!switched) {
        toast({
          title: "Chain Switch Required",
          description: `Please switch to ${request.to_chain} to send help`,
          variant: "destructive",
        })
        return
      }
    }

    setIsLoading(true)
    try {
      // Send the transaction
      const txHash = await sendTransaction(request.user_address as `0x${string}`, request.amount)

      // Update request status in database
      await dbOperations.updateRequestStatus(request.id, "completed", txHash)

      toast({
        title: "Help Sent!",
        description: (
          <div className="space-y-2">
            <p>Successfully sent {request.amount} ETH to help with gas fees</p>
            <a
              href={`${targetChain?.blockExplorers?.default?.url}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              View Transaction <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      })

      // Reload requests
      await loadRequests()
      setSelectedRequest(null)
    } catch (error: any) {
      console.error("Transaction failed:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to send help. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRequest = async (requestId: string) => {
    try {
      await dbOperations.updateRequestStatus(requestId, "cancelled")

      toast({
        title: "Request Cancelled",
        description: "Your request has been cancelled",
      })

      // Reload requests
      await loadRequests()
    } catch (error: any) {
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel request",
      })
    }
  }

  // Chat functions - Updated to work with XMTP V3
  const openChat = async (peerAddress: string) => {
    if (!peerAddress) {
      toast({
        title: "Invalid Address",
        description: "Cannot open chat with invalid address",
        variant: "destructive",
      })
      return
    }

    if (!xmtp.isInitialized || !xmtp.isAvailable) {
      toast({
        title: "XMTP Not Ready",
        description: "Please initialize XMTP messaging first",
        variant: "destructive",
      })
      return
    }

    console.log(`Opening XMTP chat with: ${peerAddress}`)
    setCurrentChatAddress(peerAddress)
    setChatOpen(true)

    // Start conversation if it doesn't exist
    await startConversation(peerAddress)
  }

  // Load data on mount
  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])

  // Add useEffect for search
  useEffect(() => {
    performSearch()
  }, [searchTerm, filterChain, requests])

  // Test database connection on mount
  useEffect(() => {
    testDatabaseConnection()
  }, [])

  // Components
  const RequestCard = ({ request }: { request: Request }) => {
    const isOwnRequest = wallet.address && request.user_address === wallet.address

    return (
      <Card
        className={`mb-4 hover:shadow-md transition-shadow ${isOwnRequest ? "ring-2 ring-blue-200 bg-blue-50/30" : ""}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{request.user_address.slice(2, 4).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  {request.user_address.slice(0, 6)}...{request.user_address.slice(-4)}
                  {isOwnRequest && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{request.timestamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={request.type === "exchange" ? "default" : "secondary"}>
                {request.type === "exchange" ? "Exchange" : "Help"}
              </Badge>
              {request.status === "completed" && (
                <Badge variant="outline" className="text-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{request.amount} ETH</span>
              <ArrowRightLeft className="h-4 w-4" />
              <span>
                {request.from_chain} → {request.to_chain}
              </span>
            </div>

            {request.offering && <div className="text-sm text-green-600">Offering: {request.offering}</div>}

            <p className="text-sm text-muted-foreground">{request.message}</p>

            <div className="flex gap-2">
              {!isOwnRequest ? (
                <>
                  <Button size="sm" onClick={() => setSelectedRequest(request)} className="flex-1" disabled={isLoading}>
                    <Send className="h-4 w-4 mr-1" />
                    Help Out
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRequestForChat(request)
                      setShowChatOptions(true)
                    }}
                    title="Choose messaging platform"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
                    <AlertCircle className="h-4 w-4" />
                    This is your request
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // For request creators, we need to show their inbox/messages from others
                      setCurrentChatAddress("INBOX")
                      setChatOpen(true)
                    }}
                    disabled={!xmtp.isInitialized || !xmtp.isAvailable}
                    title={
                      !xmtp.isAvailable
                        ? "XMTP v3 messaging not available - please initialize first"
                        : "Check XMTP v3 messages about this request"
                    }
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Messages
                    {/* Show count of all conversations/messages for this user */}
                    {xmtp.conversations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                        {xmtp.conversations.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ChatDialogComponent = () => {
    const isInboxMode = currentChatAddress === "INBOX"
    const messages = getMessages(currentChatAddress || "")

    // Use refs to maintain input focus
    const inputRef = useRef<HTMLInputElement>(null)
    const [localMessage, setLocalMessage] = useState("")
    const [isSending, setIsSending] = useState(false)

    // Prevent re-renders from affecting input focus
    const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      setLocalMessage(e.target.value)
    }, [])

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSendMessage()
        }
      },
      [localMessage],
    )

    const handleSendMessage = useCallback(async () => {
      if (!localMessage.trim() || !currentChatAddress || isSending) return

      console.log(`Attempting to send XMTP message to: ${currentChatAddress}`)
      setIsSending(true)

      try {
        const success = await sendMessage(currentChatAddress, localMessage.trim())
        if (success) {
          setLocalMessage("")
          console.log("XMTP message sent successfully, clearing input")
          // Maintain focus after sending
          setTimeout(() => {
            inputRef.current?.focus()
          }, 0)
        } else {
          console.error("Failed to send XMTP message")
        }
      } catch (error) {
        console.error("Error in handleSendMessage:", error)
      } finally {
        setIsSending(false)
      }
    }, [localMessage, currentChatAddress, sendMessage, isSending])

    // Focus input when dialog opens
    useEffect(() => {
      if (chatOpen && !isInboxMode) {
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }, [chatOpen, isInboxMode])

    return (
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isInboxMode ? "Your XMTP v3 Inbox" : "XMTP v3 Chat"}</DialogTitle>
            <DialogDescription>
              {isInboxMode
                ? "XMTP v3 encrypted messages from people interested in your requests"
                : currentChatAddress
                  ? `Secure XMTP v3 messaging with ${currentChatAddress.slice(0, 6)}...${currentChatAddress.slice(-4)}`
                  : "XMTP Chat"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="h-64 border rounded-lg p-4 bg-muted/20 overflow-y-auto">
              <div className="space-y-3">
                {!xmtp.isInitialized ? (
                  <div className="text-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Initializing XMTP v3...
                  </div>
                ) : !xmtp.isAvailable ? (
                  <div className="text-center text-sm space-y-3">
                    <div className="text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                      {xmtp.error || "XMTP v3 messaging not available"}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      Retry XMTP v3 Initialization
                    </Button>
                  </div>
                ) : isInboxMode ? (
                  xmtp.conversations.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground space-y-2">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No XMTP v3 messages yet</p>
                      <p className="text-xs">People interested in your requests will message you here using XMTP v3</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-3">XMTP v3 Conversations ({xmtp.conversations.length})</p>
                      {xmtp.conversations.map((conversation, index) => (
                        <div
                          key={conversation?.topic || index}
                          className="p-2 border rounded cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            if (conversation?.peerAddress) {
                              setCurrentChatAddress(conversation.peerAddress)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {conversation?.peerAddress
                                ? `${conversation.peerAddress.slice(0, 6)}...${conversation.peerAddress.slice(-4)}`
                                : "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getMessages(conversation?.peerAddress || "").length} messages
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Start an XMTP v3 conversation...</p>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg?.id || index}
                      className={`flex ${(msg?.senderAddress || "").toLowerCase() === (wallet.address || "").toLowerCase() ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-2 rounded-lg max-w-xs ${
                          (msg?.senderAddress || "").toLowerCase() === (wallet.address || "").toLowerCase()
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg?.content || ""}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg?.sent ? new Date(msg.sent).toLocaleTimeString() : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {!isInboxMode && (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={xmtp.isAvailable ? "Type your XMTP v3 message..." : "XMTP v3 messaging unavailable"}
                  className="flex-1"
                  value={localMessage}
                  onChange={handleMessageChange}
                  onKeyPress={handleKeyPress}
                  disabled={!xmtp.isInitialized || !xmtp.isAvailable || isSending}
                  autoComplete="off"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!xmtp.isInitialized || !xmtp.isAvailable || !localMessage.trim() || isSending}
                >
                  {isSending ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {isInboxMode && xmtp.conversations.length > 0 && (
              <div className="text-center">
                <Button size="sm" variant="outline" onClick={() => setCurrentChatAddress("")}>
                  Back to Conversations
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const HelpDialog = () => (
    <Dialog open={!!selectedRequest && !chatOpen} onOpenChange={() => setSelectedRequest(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help with Request</DialogTitle>
          <DialogDescription>Send {selectedRequest?.amount} ETH to help with gas fees</DialogDescription>
        </DialogHeader>
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="space-y-2">
                <p>
                  <strong>Amount:</strong> {selectedRequest.amount} ETH
                </p>
                <p>
                  <strong>Chain:</strong> {selectedRequest.from_chain} → {selectedRequest.to_chain}
                </p>
                <p>
                  <strong>Message:</strong> {selectedRequest.message}
                </p>
                {selectedRequest.offering && (
                  <p>
                    <strong>Offering:</strong> {selectedRequest.offering}
                  </p>
                )}
              </div>
            </div>

            {wallet.chainId !== chains.find((c) => c.name === selectedRequest.to_chain)?.id && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">You'll need to switch to {selectedRequest.to_chain} network</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => helpWithRequest(selectedRequest)} className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Help
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  const ChatOptionsDialog = () => (
    <Dialog open={showChatOptions} onOpenChange={setShowChatOptions}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Messaging Platform</DialogTitle>
          <DialogDescription>
            Select how you'd like to message {selectedRequestForChat?.user_address.slice(0, 6)}...
            {selectedRequestForChat?.user_address.slice(-4)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Built-in XMTP Inbox */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              if (selectedRequestForChat) {
                openChat(selectedRequestForChat.user_address)
              }
              setShowChatOptions(false)
            }}
            disabled={!xmtp.isInitialized || !xmtp.isAvailable}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Built-in XMTP Chat</div>
                <div className="text-xs text-muted-foreground">Secure end-to-end encrypted messaging</div>
              </div>
            </div>
          </Button>

          {/* XMTP.chat */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              if (selectedRequestForChat) {
                window.open(`https://xmtp.chat/conversations/new-dm/${selectedRequestForChat.user_address}`, "_blank")
              }
              setShowChatOptions(false)
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">XMTP.chat</div>
                <div className="text-xs text-muted-foreground">Web-based XMTP messaging platform</div>
              </div>
            </div>
          </Button>

          {/* Farcaster */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              if (selectedRequestForChat) {
                window.open(
                  `https://warpcast.com/~/compose?text=Hey! I saw your request on kaETH Platform for ${selectedRequestForChat.amount} ETH. Let's discuss!&embeds[]=${window.location.href}`,
                  "_blank",
                )
              }
              setShowChatOptions(false)
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Farcaster (Warpcast)</div>
                <div className="text-xs text-muted-foreground">Social messaging on Farcaster protocol</div>
              </div>
            </div>
          </Button>

          {/* Zora */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              if (selectedRequestForChat) {
                window.open(`https://zora.co/@${selectedRequestForChat.user_address}`, "_blank")
              }
              setShowChatOptions(false)
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Zora Profile</div>
                <div className="text-xs text-muted-foreground">View profile and connect on Zora</div>
              </div>
            </div>
          </Button>

          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowChatOptions(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (showDatabaseSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <DatabaseSetup onSetupComplete={handleSetupComplete} />
      </div>
    )
  }

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">kaETH Platform</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Community-driven P2P platform for ETH exchanges across chains. Powered by kaETH token ecosystem.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-blue-600 mx-auto" />
                  <CardTitle className="text-center">Low Gas Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    Avoid expensive bridging costs and CEX restrictions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-green-600 mx-auto" />
                  <CardTitle className="text-center">Community Driven</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">Help friends and newcomers get started in web3</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 text-purple-600 mx-auto" />
                  <CardTitle className="text-center">Multi-Chain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    Support for Ethereum, Polygon, Arbitrum, Base, and more
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* kaETH Token Information */}
            <div className="max-w-4xl mx-auto">
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Coins className="h-8 w-8 text-blue-600" />
                    $KAETH Token
                  </CardTitle>
                  <CardDescription className="text-lg">
                    The native token powering our P2P ecosystem on Base network
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white/60 rounded-lg">
                      <Shield className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <h4 className="font-semibold">Secure</h4>
                      <p className="text-sm text-muted-foreground">Audited smart contract on Base</p>
                    </div>
                    <div className="text-center p-4 bg-white/60 rounded-lg">
                      <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <h4 className="font-semibold">Growing</h4>
                      <p className="text-sm text-muted-foreground">Active community & ecosystem</p>
                    </div>
                    <div className="text-center p-4 bg-white/60 rounded-lg">
                      <Zap className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <h4 className="font-semibold">Utility</h4>
                      <p className="text-sm text-muted-foreground">Powers P2P transactions</p>
                    </div>
                  </div>

                  <div className="bg-white/80 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-center">Token Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Contract:</span>
                        <p className="font-mono text-xs break-all">0x6a54f4d6b86e1095407fcd00aa34bd5010181136</p>
                      </div>
                      <div>
                        <span className="font-medium">Network:</span>
                        <p>Base (Chain ID: 8453)</p>
                      </div>
                      <div>
                        <span className="font-medium">Symbol:</span>
                        <p>$KAETH</p>
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <p>ERC-20 Token</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Links */}
            <div className="max-w-4xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-xl">
                    <ArrowRightLeft className="h-6 w-6 text-green-600" />
                    Trade $KAETH
                  </CardTitle>
                  <CardDescription>Access kaETH across multiple DEX platforms on Base network</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <a
                      href="https://ohara.ai/mini-apps/617f1feb-28ea-4115-8729-f6b70add0b65/token"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Zap className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Ohara.ai</span>
                    </a>
                    <a
                      href="https://app.uniswap.org/explore/tokens/base/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <ArrowRightLeft className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Uniswap</span>
                    </a>
                    <a
                      href="https://dexscreener.com/base/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Search className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">DexScreener</span>
                    </a>
                    <a
                      href="https://matcha.xyz/tokens/base/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Globe className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Matcha</span>
                    </a>
                    <a
                      href="https://www.pure.st/tokens/base/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Users className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Pure.st</span>
                    </a>
                    <a
                      href="https://photon-base.tinyastro.io/en/lp/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Zap className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Photon</span>
                    </a>
                    <a
                      href="https://app.azura.xyz/spot/8453/0x6a54f4d6b86e1095407fcd00aa34bd5010181136"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 md:col-span-1"
                    >
                      <Send className="h-6 w-6 mb-2" />
                      <span className="font-medium text-sm">Azura</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                onClick={() => connectWallet()}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={wallet.isLoading}
              >
                {wallet.isLoading ? (
                  <>
                    <Clock className="h-5 w-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet to Start
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500">Powered by $KAETH • Built for the community • Secured by XMTP v3</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">kaETH Platform</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Coins className="h-3 w-3 mr-1" />
                $KAETH
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
              </Badge>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(wallet.address || "")}>
                      Copy Address
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={switchWallet}>Switch Wallet</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => disconnectWallet()} className="text-red-600">
                      Disconnect Wallet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Trust/Truth Mode Toggle */}
        <div className="flex items-center justify-center mb-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Trust Mode</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative"
                    onClick={() => {
                      toast({
                        title: "Truth Mode Coming Soon",
                        description: "Trustless smart contract execution is under development on Base testnet",
                        variant: "default",
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-4 bg-gray-200 rounded-full relative">
                        <div className="w-3 h-3 bg-blue-600 rounded-full absolute top-0.5 left-0.5 transition-transform duration-200"></div>
                      </div>
                      <span className="text-xs">Trust</span>
                    </div>
                  </Button>
                  <div className="flex items-center gap-2 opacity-50">
                    <Zap className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-500">Truth Mode</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                <span className="text-blue-600 font-medium">Trust Mode:</span> Community-driven P2P platform
                <span className="mx-2">•</span>
                <span className="text-orange-600 font-medium">Truth Mode:</span> Trustless smart contracts (Base
                testnet)
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Requests</TabsTrigger>
            <TabsTrigger value="create">Create Request</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterChain} onValueChange={setFilterChain}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Chains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chains</SelectItem>
                  {chains
                    .filter((chain) => chain.nativeCurrency.symbol === "ETH")
                    .map((chain) => (
                      <SelectItem key={chain.name} value={chain.name}>
                        {chain.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Active Requests ({filteredRequests.length})</h2>
                {filteredRequests.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No requests found matching your criteria</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredRequests.map((request) => <RequestCard key={request.id} request={request} />)
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Quick Stats</h2>

                {/* Add XMTP v3 Initialization Card */}
                <XMTPInitializationCard
                  xmtp={xmtp}
                  initializeXMTP={initializeXMTP}
                  retryInitialization={retryInitialization}
                  wallet={wallet}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                      <p className="text-sm text-muted-foreground">Active Requests</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <p className="text-sm text-muted-foreground">Completed Helps</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Wallet Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Balance:</span>
                      <span className="font-medium">{wallet.balance} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network:</span>
                      <span className="font-medium">
                        {chains.find((c) => c.id === wallet.chainId)?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>XMTP v3:</span>
                      <span
                        className={`font-medium ${
                          xmtp.isInitialized && xmtp.isAvailable
                            ? "text-green-600"
                            : xmtp.isInitialized
                              ? "text-yellow-600"
                              : "text-gray-600"
                        }`}
                      >
                        {xmtp.isInitialized ? (xmtp.isAvailable ? "Ready" : "Limited") : "Not Initialized"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* kaETH Token Info Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="h-5 w-5 text-blue-600" />
                      $KAETH Token
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Contract:</span>
                      <span className="font-mono text-xs">0x6a54...1136</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network:</span>
                      <span className="font-medium">Base</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Type:</span>
                      <span className="font-medium">ERC-20</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() =>
                        window.open(
                          "https://app.uniswap.org/explore/tokens/base/0x6a54f4d6b86e1095407fcd00aa34bd5010181136",
                          "_blank",
                        )
                      }
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Trade on Uniswap
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() =>
                        window.open("https://ohara.ai/mini-apps/617f1feb-28ea-4115-8729-f6b70add0b65/token", "_blank")
                      }
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Trade on Ohara
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="create">
            <div className="max-w-2xl mx-auto">
              <CreateRequestForm
                requestType={requestType}
                setRequestType={memoizedSetRequestType}
                formData={formData}
                setFormData={memoizedSetFormData}
                createRequest={handleCreateRequest}
                isLoading={isLoading}
                chains={chains}
                wallet={wallet}
                xmtp={xmtp}
                setCurrentChatAddress={setCurrentChatAddress}
                setChatOpen={setChatOpen}
              />
            </div>
          </TabsContent>

          <TabsContent value="my-requests">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">My Requests ({userRequests.length})</h2>
              {userRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">You haven't created any requests yet.</p>
                    <Button className="mt-4" onClick={() => setActiveTab("create")}>
                      Create Your First Request
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {userRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={request.type === "exchange" ? "default" : "secondary"}>
                              {request.type === "exchange" ? "Exchange" : "Help"}
                            </Badge>
                            <Badge
                              variant={
                                request.status === "active"
                                  ? "outline"
                                  : request.status === "completed"
                                    ? "default"
                                    : "destructive"
                              }
                              className={request.status === "completed" ? "text-green-600" : ""}
                            >
                              {request.status === "active" && <Clock className="h-3 w-3 mr-1" />}
                              {request.status === "completed" && <Check className="h-3 w-3 mr-1" />}
                              {request.status === "cancelled" && <X className="h-3 w-3 mr-1" />}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{request.timestamp}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{request.amount} ETH</span>
                            <ArrowRightLeft className="h-4 w-4" />
                            <span>
                              {request.from_chain} → {request.to_chain}
                            </span>
                          </div>

                          {request.offering && (
                            <div className="text-sm text-green-600">Offering: {request.offering}</div>
                          )}

                          <p className="text-sm text-muted-foreground">{request.message}</p>

                          {request.tx_hash && (
                            <div className="text-sm">
                              <a
                                href={`${chains.find((c) => c.name === request.to_chain)?.blockExplorers?.default?.url}/tx/${request.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                View Transaction <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}

                          {request.status === "active" && (
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="destructive" onClick={() => cancelRequest(request.id)}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <ChatDialogComponent />
      <HelpDialog />
      <ChatOptionsDialog />
    </div>
  )
}
