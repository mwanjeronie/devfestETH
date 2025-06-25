"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useWallet } from "@/hooks/useWallet"
import { useXMTP } from "@/hooks/useXMTP"

interface WalletContextType {
  wallet: ReturnType<typeof useWallet>["wallet"]
  walletClient: ReturnType<typeof useWallet>["walletClient"]
  connectWallet: ReturnType<typeof useWallet>["connectWallet"]
  disconnectWallet: ReturnType<typeof useWallet>["disconnectWallet"]
  switchWallet: ReturnType<typeof useWallet>["switchWallet"]
  switchToChain: ReturnType<typeof useWallet>["switchToChain"]
  sendTransaction: ReturnType<typeof useWallet>["sendTransaction"]
  xmtp: ReturnType<typeof useXMTP>["xmtp"]
  initializeXMTP: ReturnType<typeof useXMTP>["initializeXMTP"]
  startConversation: ReturnType<typeof useXMTP>["startConversation"]
  sendMessage: ReturnType<typeof useXMTP>["sendMessage"]
  getConversation: ReturnType<typeof useXMTP>["getConversation"]
  getMessages: ReturnType<typeof useXMTP>["getMessages"]
  streamMessages: ReturnType<typeof useXMTP>["streamMessages"]
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const walletHook = useWallet()
  const xmtpHook = useXMTP(walletHook.walletClient, walletHook.wallet.address)

  return (
    <WalletContext.Provider
      value={{
        ...walletHook,
        ...xmtpHook,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWalletContext must be used within WalletProvider")
  }
  return context
}
