"use client"

import { SessionProvider } from "next-auth/react"
import { Web3Provider } from "@/lib/web3-provider"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <Web3Provider>
        {children}
      </Web3Provider>
    </SessionProvider>
  )
}
