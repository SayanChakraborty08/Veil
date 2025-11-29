"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { ethers } from "ethers"

interface Web3ContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          
          setProvider(provider)
          setSigner(signer)
          setAccount(address)
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    setIsConnecting(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      setProvider(provider)
      setSigner(signer)
      setAccount(address)
    } catch (error) {
      console.error("Error connecting wallet:", error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
  }

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        isConnecting,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}
