"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

// XMTP V2 Browser types
interface XMTPClient {
  address: string
  conversations: {
    list: () => Promise<XMTPConversation[]>
    newConversation: (peerAddress: string, context?: any) => Promise<XMTPConversation>
    stream: () => AsyncIterable<XMTPConversation>
  }
  canMessage: (peerAddress: string) => Promise<boolean>
}

interface XMTPConversation {
  peerAddress: string
  topic: string
  createdAt: Date
  send: (content: string | any) => Promise<XMTPMessage>
  messages: (options?: { limit?: number; direction?: string }) => Promise<XMTPMessage[]>
  streamMessages: () => AsyncIterable<XMTPMessage>
}

interface XMTPMessage {
  id: string
  content: string
  senderAddress: string
  sent: Date
  conversation: XMTPConversation
}

interface XMTPState {
  client: XMTPClient | null
  isInitialized: boolean
  isLoading: boolean
  conversations: XMTPConversation[]
  messages: { [topic: string]: XMTPMessage[] }
  isAvailable: boolean
  error: string | null
  initializationStep: string
  canRetry: boolean
}

export function useXMTP(walletClient: any, address: `0x${string}` | null) {
  const clientRef = useRef<XMTPClient | null>(null)
  const messageStreamsRef = useRef<Map<string, any>>(new Map())
  const initializationRef = useRef(false)

  const [xmtp, setXMTP] = useState<XMTPState>({
    client: null,
    isInitialized: false,
    isLoading: false,
    conversations: [],
    messages: {},
    isAvailable: false,
    error: null,
    initializationStep: "Ready to initialize XMTP V2 for web",
    canRetry: true,
  })

  const cleanupStreams = useCallback(() => {
    messageStreamsRef.current.forEach((stream) => {
      try {
        if (stream && typeof stream.return === "function") {
          stream.return()
        }
      } catch (error) {
        console.warn("Error cleaning up stream:", error)
      }
    })
    messageStreamsRef.current.clear()
  }, [])

  const initializeXMTP = useCallback(async (): Promise<boolean> => {
    if (!walletClient || !address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return false
    }

    if (initializationRef.current) {
      console.log("XMTP V2 web initialization already in progress")
      return false
    }

    initializationRef.current = true

    setXMTP((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      initializationStep: "Starting XMTP V2 web initialization...",
      canRetry: false,
    }))

    try {
      // Step 1: Import XMTP V2 SDK for browser
      setXMTP((prev) => ({ ...prev, initializationStep: "Loading XMTP V2 browser SDK..." }))

      let Client: any
      try {
        const xmtpModule = await import("@xmtp/xmtp-js")
        Client = xmtpModule.Client
        console.log("✅ XMTP V2 browser SDK loaded successfully")
      } catch (importError: any) {
        console.error("❌ Failed to import XMTP V2 browser SDK:", importError)
        throw new Error("XMTP V2 browser SDK not available. Please ensure @xmtp/xmtp-js is installed.")
      }

      // Step 2: Create browser-compatible signer
      setXMTP((prev) => ({ ...prev, initializationStep: "Creating browser signer..." }))

      // Browser-compatible signer that works with MetaMask/WalletConnect
      const browserSigner = {
        getAddress: async () => {
          return address
        },
        signMessage: async (message: string | Uint8Array) => {
          try {
            setXMTP((prev) => ({ ...prev, initializationStep: "Requesting wallet signature..." }))

            if (!address) {
              throw new Error("Wallet address not available")
            }

            // Handle both string and Uint8Array messages
            let messageToSign: string
            if (typeof message === "string") {
              messageToSign = message
            } else {
              // Convert Uint8Array to string for browser wallets
              messageToSign = new TextDecoder().decode(message)
            }

            const signature = await walletClient.signMessage({
              account: address,
              message: messageToSign,
            })

            console.log("✅ Browser wallet signature obtained for XMTP V2")
            return signature
          } catch (signError: any) {
            console.error("❌ Browser signature error:", signError)
            if (signError.code === 4001) {
              throw new Error("User rejected signature request")
            }
            throw new Error("Failed to sign message for XMTP V2")
          }
        },
      }

      // Step 3: Create XMTP V2 client for browser
      setXMTP((prev) => ({ ...prev, initializationStep: "Creating XMTP V2 browser client..." }))

      // Browser-optimized client options
      const clientOptions = {
        env: "production" as const, // Use production for web apps
        skipContactPublishing: false,
        persistConversations: false, // Disable persistence for browser compatibility
        codecs: [], // Use default codecs for browser
      }

      console.log("Creating XMTP V2 browser client with options:", clientOptions)

      // Create V2 client with browser-specific timeout
      const client = (await Promise.race([
        Client.create(browserSigner, clientOptions),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("XMTP V2 browser initialization timeout after 30 seconds")), 30000)
        }),
      ])) as XMTPClient

      clientRef.current = client

      console.log("✅ XMTP V2 browser client created:", {
        address: client?.address || "unknown",
      })

      // Step 4: Load existing conversations
      setXMTP((prev) => ({ ...prev, initializationStep: "Loading conversations..." }))

      let conversations: XMTPConversation[] = []
      try {
        conversations = await client.conversations.list()
        console.log(`✅ Loaded ${conversations?.length || 0} conversations`)
      } catch (listError) {
        console.warn("Failed to load conversations:", listError)
        conversations = []
      }

      // Step 5: Load messages for each conversation (with error handling)
      const messagesMap: { [topic: string]: XMTPMessage[] } = {}
      if (conversations && Array.isArray(conversations)) {
        for (const conversation of conversations) {
          try {
            if (conversation && conversation.topic && conversation.peerAddress) {
              const messages = await conversation.messages({ limit: 25 }) // Reduced limit for browser
              messagesMap[conversation.topic] = Array.isArray(messages) ? messages.reverse() : []
              console.log(`Loaded ${messages?.length || 0} messages for conversation with ${conversation.peerAddress}`)
            }
          } catch (msgError) {
            console.warn(`Failed to load messages for conversation:`, msgError)
            if (conversation?.topic) {
              messagesMap[conversation.topic] = []
            }
          }
        }
      }

      // Step 6: Set up message streaming (browser-optimized)
      setXMTP((prev) => ({ ...prev, initializationStep: "Setting up browser message streaming..." }))

      // Start streaming for existing conversations
      if (conversations && Array.isArray(conversations)) {
        for (const conversation of conversations) {
          if (conversation && conversation.topic) {
            startMessageStreamForConversation(conversation)
          }
        }
      }

      // Step 7: Update state to ready
      setXMTP((prev) => ({
        ...prev,
        client,
        isInitialized: true,
        isLoading: false,
        isAvailable: true,
        error: null,
        initializationStep: "XMTP V2 ready for web messaging",
        canRetry: false,
        conversations: conversations || [],
        messages: messagesMap,
      }))

      toast({
        title: "XMTP V2 Ready",
        description: "Secure web messaging is now available",
      })

      return true
    } catch (error: any) {
      console.error("❌ XMTP V2 browser initialization failed:", error)

      let errorMessage = "XMTP V2 browser initialization failed"
      let canRetry = true

      if (error?.message?.includes("not available") || error?.message?.includes("installed")) {
        errorMessage = "XMTP V2 browser SDK not available"
        canRetry = false
      } else if (error?.message?.includes("timeout")) {
        errorMessage = "XMTP V2 initialization timeout - please try again"
      } else if (error?.message?.includes("rejected")) {
        errorMessage = "Wallet signature rejected - required for XMTP V2"
      } else if (error?.message?.includes("signature")) {
        errorMessage = "Wallet signature required for XMTP V2"
      } else if (error?.message?.includes("network")) {
        errorMessage = "Network error - check your internet connection"
      } else if (error?.message?.includes("publishing")) {
        errorMessage = "XMTP V2 publishing disabled - using fallback mode"
        canRetry = true
      } else {
        errorMessage = error?.message || "XMTP V2 browser initialization failed"
      }

      setXMTP((prev) => ({
        ...prev,
        isLoading: false,
        isAvailable: false,
        isInitialized: false,
        error: errorMessage,
        initializationStep: "Browser initialization failed",
        canRetry: true,
      }))

      toast({
        title: "XMTP V2 Failed",
        description: errorMessage,
        variant: "destructive",
      })

      return false
    } finally {
      initializationRef.current = false
    }
  }, [walletClient, address])

  const startMessageStreamForConversation = useCallback((conversation: XMTPConversation) => {
    if (!conversation || !conversation.topic) {
      console.warn("Invalid conversation provided to startMessageStreamForConversation")
      return
    }

    try {
      const messageStream = conversation.streamMessages()

      // Browser-compatible stream handling
      if (messageStream && typeof messageStream[Symbol.asyncIterator] === "function") {
        messageStreamsRef.current.set(conversation.topic, messageStream)

        // Process incoming messages in background (browser-optimized)
        setTimeout(async () => {
          try {
            for await (const message of messageStream) {
              if (message && message.senderAddress && message.content) {
                console.log("📨 New web message from", message.senderAddress)

                setXMTP((prev) => ({
                  ...prev,
                  messages: {
                    ...prev.messages,
                    [conversation.topic]: [...(prev.messages[conversation.topic] || []), message],
                  },
                }))

                // Show browser notification for messages from others
                if (
                  message.senderAddress &&
                  message.senderAddress.toLowerCase() !== conversation.peerAddress.toLowerCase()
                ) {
                  toast({
                    title: "New Message",
                    description: `Message from ${message.senderAddress.slice(0, 8)}...`,
                  })
                }
              }
            }
          } catch (streamError) {
            console.warn("Browser message stream error:", streamError)
          }
        }, 200) // Slightly longer delay for browser
      } else {
        console.warn("Message streaming not available for browser conversation:", conversation.topic)
      }
    } catch (error) {
      console.warn("Failed to start browser message stream for conversation:", error)
    }
  }, [])

  const startConversation = useCallback(
    async (peerAddress: string) => {
      const client = clientRef.current
      if (!client || !xmtp.isAvailable || !peerAddress) {
        toast({
          title: "XMTP V2 Not Ready",
          description: "Please initialize XMTP V2 first",
          variant: "destructive",
        })
        return null
      }

      try {
        console.log(`🔄 Starting XMTP V2 web conversation with: ${peerAddress}`)

        // Check if conversation already exists
        const existingConversation = xmtp.conversations.find(
          (c) => c && c.peerAddress && c.peerAddress.toLowerCase() === peerAddress.toLowerCase(),
        )
        if (existingConversation) {
          console.log("✅ Found existing web conversation")
          return existingConversation
        }

        // Check if we can message this user (browser-compatible)
        const canMessage = await client.canMessage(peerAddress)
        if (!canMessage) {
          toast({
            title: "Cannot Message User",
            description: "This user has not enabled XMTP V2 messaging",
            variant: "destructive",
          })
          return null
        }

        // Create new conversation (browser-compatible)
        const conversation = await client.conversations.newConversation(peerAddress)
        if (!conversation || !conversation.topic) {
          throw new Error("Failed to create web conversation")
        }

        console.log("✅ Created new XMTP V2 web conversation with:", peerAddress)

        // Add to conversations list
        setXMTP((prev) => ({
          ...prev,
          conversations: [...prev.conversations.filter((c) => c.topic !== conversation.topic), conversation],
          messages: {
            ...prev.messages,
            [conversation.topic]: [],
          },
        }))

        // Start message streaming for new conversation
        startMessageStreamForConversation(conversation)

        return conversation
      } catch (error: any) {
        console.error("❌ Error starting XMTP V2 web conversation:", error)
        toast({
          title: "Conversation Failed",
          description: error?.message || "Could not start web conversation",
          variant: "destructive",
        })
        return null
      }
    },
    [xmtp.isAvailable, xmtp.conversations, startMessageStreamForConversation],
  )

  const sendMessage = useCallback(
    async (peerAddress: string, message: string) => {
      const client = clientRef.current
      if (!client || !xmtp.isAvailable || !peerAddress || !message) {
        toast({
          title: "XMTP V2 Not Ready",
          description: "Cannot send messages - XMTP V2 not initialized or invalid parameters",
          variant: "destructive",
        })
        return false
      }

      try {
        console.log(`📤 Sending XMTP V2 web message to: ${peerAddress}`)

        // Find or create conversation
        let conversation = xmtp.conversations.find(
          (c) => c && c.peerAddress && c.peerAddress.toLowerCase() === peerAddress.toLowerCase(),
        )

        if (!conversation) {
          console.log("No existing web conversation, creating new one...")
          conversation = await startConversation(peerAddress)
          if (!conversation) {
            return false
          }
        }

        // Send the message (browser-compatible)
        const sentMessage = await conversation.send(message)
        console.log("✅ XMTP V2 web message sent successfully")

        // Add message to local state immediately for better UX
        setXMTP((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [conversation!.topic]: [...(prev.messages[conversation!.topic] || []), sentMessage],
          },
        }))

        toast({
          title: "Message Sent",
          description: "Your message has been delivered via XMTP V2",
        })

        return true
      } catch (error: any) {
        console.error("❌ Error sending XMTP V2 web message:", error)
        toast({
          title: "Send Failed",
          description: error?.message || "Failed to send web message",
          variant: "destructive",
        })
        return false
      }
    },
    [xmtp.isAvailable, xmtp.conversations, startConversation],
  )

  const getConversation = useCallback(
    (peerAddress: string) => {
      if (!peerAddress) return undefined
      return xmtp.conversations.find(
        (c) => c && c.peerAddress && c.peerAddress.toLowerCase() === peerAddress.toLowerCase(),
      )
    },
    [xmtp.conversations],
  )

  const getMessages = useCallback(
    (peerAddress: string) => {
      if (!peerAddress) return []

      const conversation = getConversation(peerAddress)
      if (!conversation || !conversation.topic) return []

      return xmtp.messages[conversation.topic] || []
    },
    [xmtp.messages, getConversation],
  )

  const streamMessages = useCallback(
    (peerAddress: string) => {
      return getMessages(peerAddress)
    },
    [getMessages],
  )

  const retryInitialization = useCallback(async () => {
    if (xmtp.isLoading) return

    console.log("🔄 Retrying XMTP V2 web initialization...")

    // Clean up existing state
    cleanupStreams()
    clientRef.current = null
    initializationRef.current = false

    setXMTP((prev) => ({
      ...prev,
      isInitialized: false,
      error: null,
      conversations: [],
      messages: {},
      isAvailable: false,
      initializationStep: "Retrying web initialization...",
    }))

    await initializeXMTP()
  }, [xmtp.isLoading, cleanupStreams, initializeXMTP])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreams()
      initializationRef.current = false
    }
  }, [cleanupStreams])

  return {
    xmtp,
    initializeXMTP,
    startConversation,
    sendMessage,
    getConversation,
    getMessages,
    streamMessages,
    retryInitialization,
  }
}
