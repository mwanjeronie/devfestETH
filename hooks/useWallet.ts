"use client"

import { useState, useEffect, useCallback } from "react"
import { createWalletClient, createPublicClient, custom, formatEther, parseEther, http, getAddress } from "viem"
import { mainnet, polygon, arbitrum, optimism, base, bsc } from "viem/chains"
import { toast } from "@/hooks/use-toast"

export const chains = [
  { ...mainnet, name: "Ethereum" },
  { ...polygon, name: "Polygon" },
  { ...arbitrum, name: "Arbitrum" },
  { ...optimism, name: "Optimism" },
  { ...base, name: "Base" },
  { ...bsc, name: "BSC" },
]

interface WalletState {
  address: `0x${string}` | null
  isConnected: boolean
  balance: string
  chainId: number
  isLoading: boolean
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: "0.0",
    chainId: 1,
    isLoading: false,
  })

  const [walletClient, setWalletClient] = useState<any>(null)
  const [publicClient, setPublicClient] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const disconnectWallet = useCallback((showToast = true) => {
    // Clean up event listeners first
    if (window.ethereum) {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
      window.ethereum.removeListener("chainChanged", handleChainChanged)
    }

    // Reset all state
    setWallet({
      address: null,
      isConnected: false,
      balance: "0.0",
      chainId: 1,
      isLoading: false,
    })
    setWalletClient(null)
    setPublicClient(null)

    if (showToast) {
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been safely disconnected",
      })
    }
  }, [])

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  const getCurrentChain = (chainId: number) => {
    return chains.find((chain) => chain.id === chainId) || chains[0]
  }

  const createClients = async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) return null

    const currentChain = getCurrentChain(chainId)

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    })

    const publicClient = createPublicClient({
      chain: currentChain,
      transport: http(),
    })

    return { walletClient, publicClient }
  }

  const updateBalance = async (address: `0x${string}`, publicClient: any) => {
    try {
      const balance = await publicClient.getBalance({ address })
      const balanceInEth = formatEther(balance)
      setWallet((prev) => ({
        ...prev,
        balance: Number.parseFloat(balanceInEth).toFixed(4),
      }))
    } catch (error) {
      console.error("Error fetching balance:", error)
    }
  }

  const checkConnection = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setIsInitializing(false)
      return
    }

    try {
      setWallet((prev) => ({ ...prev, isLoading: true }))

      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        const parsedChainId = Number.parseInt(chainId, 16)

        const clients = await createClients(parsedChainId)
        if (!clients) {
          setIsInitializing(false)
          return
        }

        const address = getAddress(accounts[0])

        setWallet({
          address,
          isConnected: true,
          balance: "0.0",
          chainId: parsedChainId,
          isLoading: false,
        })

        setWalletClient(clients.walletClient)
        setPublicClient(clients.publicClient)

        // Update balance
        await updateBalance(address, clients.publicClient)

        // Set up event listeners
        setupEventListeners()

        console.log("Wallet automatically reconnected:", address)
      } else {
        setWallet((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error checking connection:", error)
      setWallet((prev) => ({ ...prev, isLoading: false }))
    } finally {
      setIsInitializing(false)
    }
  }

  const connectWallet = useCallback(
    async (forceNewConnection = false) => {
      if (typeof window === "undefined" || !window.ethereum) {
        toast({
          title: "Wallet Not Found",
          description: "Please install MetaMask or another Web3 wallet",
          variant: "destructive",
        })
        return
      }

      // Prevent multiple connection attempts unless forcing new connection
      if (wallet.isLoading && !forceNewConnection) return

      setWallet((prev) => ({ ...prev, isLoading: true }))

      try {
        let accounts: string[] = []

        if (forceNewConnection) {
          // For wallet switching, we need to request accounts again
          try {
            // First disconnect any existing connection
            if (wallet.isConnected) {
              await disconnectWallet(false) // Don't show toast for internal disconnect
              // Small delay to ensure clean state
              await new Promise((resolve) => setTimeout(resolve, 200))
            }

            // Request new account selection
            accounts = await window.ethereum.request({
              method: "wallet_requestAccounts",
            })
          } catch (error: any) {
            // If user cancels or there's an error, try the standard method
            if (error.code !== 4001) {
              accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
              })
            } else {
              throw error
            }
          }
        } else {
          // Standard connection
          accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          })
        }

        if (accounts.length === 0) {
          throw new Error("No accounts found")
        }

        // Get current chain
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        const parsedChainId = Number.parseInt(chainId, 16)

        // Create clients
        const clients = await createClients(parsedChainId)
        if (!clients) {
          throw new Error("Failed to create wallet clients")
        }

        const address = getAddress(accounts[0])

        // Check if this is a different wallet
        const isDifferentWallet = wallet.address && wallet.address !== address

        setWallet({
          address,
          isConnected: true,
          balance: "0.0",
          chainId: parsedChainId,
          isLoading: false,
        })

        setWalletClient(clients.walletClient)
        setPublicClient(clients.publicClient)

        // Update balance
        await updateBalance(address, clients.publicClient)

        // Set up event listeners
        setupEventListeners()

        toast({
          title: isDifferentWallet || forceNewConnection ? "Wallet Switched" : "Wallet Connected",
          description:
            isDifferentWallet || forceNewConnection
              ? `Switched to ${address.slice(0, 6)}...${address.slice(-4)}`
              : `Successfully connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        })
      } catch (error: any) {
        console.error("Error connecting wallet:", error)
        setWallet((prev) => ({ ...prev, isLoading: false }))

        if (error.code === 4001) {
          toast({
            title: "Connection Cancelled",
            description: "You cancelled the wallet connection",
            variant: "destructive",
          })
        } else if (error.code === -32002) {
          toast({
            title: "Connection Pending",
            description: "Please check your wallet for a pending connection request",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Connection Failed",
            description: error.message || "Failed to connect wallet",
            variant: "destructive",
          })
        }
      } finally {
        setWallet((prev) => ({ ...prev, isLoading: false }))
      }
    },
    [wallet.isLoading, wallet.isConnected, wallet.address],
  )

  const handleAccountsChanged = async (accounts: string[]) => {
    console.log("Accounts changed:", accounts)

    if (accounts.length === 0) {
      // User disconnected all accounts
      disconnectWallet()
    } else {
      // User switched to a different account
      const newAddress = getAddress(accounts[0])
      if (wallet.address && wallet.address !== newAddress) {
        try {
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          const parsedChainId = Number.parseInt(chainId, 16)

          const clients = await createClients(parsedChainId)
          if (clients) {
            setWallet({
              address: newAddress,
              isConnected: true,
              balance: "0.0",
              chainId: parsedChainId,
              isLoading: false,
            })

            setWalletClient(clients.walletClient)
            setPublicClient(clients.publicClient)

            await updateBalance(newAddress, clients.publicClient)

            toast({
              title: "Account Changed",
              description: `Switched to ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`,
            })
          }
        } catch (error) {
          console.error("Error handling account change:", error)
          toast({
            title: "Account Switch Error",
            description: "Failed to switch to new account",
            variant: "destructive",
          })
        }
      }
    }
  }

  const handleChainChanged = async (chainId: string) => {
    const newChainId = Number.parseInt(chainId, 16)

    // Update chain and recreate clients
    const clients = await createClients(newChainId)
    if (clients && wallet.address) {
      setWallet((prev) => ({ ...prev, chainId: newChainId }))
      setWalletClient(clients.walletClient)
      setPublicClient(clients.publicClient)

      // Update balance on new chain
      await updateBalance(wallet.address, clients.publicClient)
    }
  }

  const setupEventListeners = () => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }
  }

  const switchToChain = async (targetChainId: number) => {
    if (!window.ethereum) return false

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
      return true
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to wallet
        const chain = chains.find((c) => c.id === targetChainId)
        if (chain) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${targetChainId.toString(16)}`,
                  chainName: chain.name,
                  rpcUrls: [chain.rpcUrls.default.http[0]],
                  nativeCurrency: chain.nativeCurrency,
                  blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : [],
                },
              ],
            })
            return true
          } catch (addError) {
            console.error("Error adding chain:", addError)
            return false
          }
        }
      }
      console.error("Error switching chain:", error)
      return false
    }
  }

  const sendTransaction = async (to: `0x${string}`, amount: string) => {
    if (!walletClient || !wallet.address) {
      throw new Error("Wallet not connected")
    }

    try {
      const hash = await walletClient.sendTransaction({
        account: wallet.address,
        to,
        value: parseEther(amount),
      })

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
        // Update balance after transaction
        await updateBalance(wallet.address, publicClient)
      }

      return hash
    } catch (error: any) {
      console.error("Transaction failed:", error)
      throw new Error(error.shortMessage || error.message || "Transaction failed")
    }
  }

  const switchWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      })
      return
    }

    try {
      // Show wallet selection dialog by requesting accounts
      await connectWallet(true) // Force new connection
    } catch (error) {
      console.error("Error switching wallet:", error)
      toast({
        title: "Wallet Switch Error",
        description: "Failed to switch wallet",
        variant: "destructive",
      })
    }
  }, [connectWallet])

  return {
    wallet,
    walletClient,
    connectWallet,
    disconnectWallet,
    switchToChain,
    sendTransaction,
    switchWallet,
  }
}
